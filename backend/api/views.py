from collections.abc import Iterable
import json
import os
import re
from typing import Any, Dict, List
import requests

from rest_framework import status, viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from .pg_connector import SupabaseConnector

HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY")
HF_MODEL_ID = os.getenv("HUGGINGFACE_MODEL_ID")
HF_TIMEOUT_SECONDS = float(os.getenv("HUGGINGFACE_TIMEOUT_SECONDS", "30"))


def _huggingface_inference(prompt: str) -> tuple[float | None, str | None]:
    if not HF_API_KEY or not HF_MODEL_ID:
        return None, None

    headers = {
        "Authorization": f"Bearer {HF_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "inputs": prompt,
        "parameters": {"max_new_tokens": 256, "temperature": 0.2},
    }

    try:
        response = requests.post(
            f"https://api-inference.huggingface.co/models/{HF_MODEL_ID}",
            headers=headers,
            json=payload,
            timeout=HF_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except requests.RequestException:
        return None, None

    try:
        data = response.json()
    except json.JSONDecodeError:
        return None, None

    if isinstance(data, list) and data:
        generated = data[0].get("generated_text") or data[0].get("text", "")
    elif isinstance(data, dict):
        generated = data.get("generated_text") or data.get("text", "")
    else:
        generated = ""

    if not generated:
        return None, None

    match = re.search(r"\{.*\}", generated, re.DOTALL)
    if not match:
        return None, generated.strip()

    try:
        parsed = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None, generated.strip()

    score_value = parsed.get("score")
    explanation = parsed.get("explanation") or parsed.get("reason")

    try:
        if score_value is not None:
            score_float = float(score_value)
            # Models sometimes emit a normalized score (0-1); convert to percentage
            if 0.0 <= score_float <= 1.0:
                score_float *= 100.0
            return score_float, explanation
    except (TypeError, ValueError):
        pass

    return None, explanation


def _safe_float(value: Any) -> float | None:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _safe_int(value: Any) -> int | None:
    try:
        if value is None:
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def _normalize_percent(value: float | None) -> float | None:
    if value is None:
        return None
    # Accept values stored either as fraction (0-1) or percentage (0-100)
    if 0.0 <= value <= 1.0:
        return value * 100.0
    return value


def _format_currency(value: float | None) -> str:
    if value is None:
        return ""
    try:
        rounded = int(round(value))
    except (TypeError, ValueError):
        return ""
    return f"${rounded:,}"


supabase = SupabaseConnector()


def _build_llm_prompt(user_pref: Dict[str, Any], college: Dict[str, Any], heuristic_score: float) -> str:
    return (
        "You are an educational guidance assistant. "
        "Given a student's preference profile and detailed college information, "
        "provide an updated suitability score on a 0-100 scale (higher is better) "
        "and a concise explanation (one sentence). Respond strictly with JSON in the format:\n"
        '{"score": <number>, "explanation": "<one sentence>"}\n\n'
        f"Student preferences:\n{json.dumps(user_pref, default=str)}\n\n"
        f"College data:\n{json.dumps(college, default=str)}\n\n"
        f"Heuristic score (for reference): {heuristic_score}\n"
        "Return only the JSON object."
    )


@api_view(["GET"])
def healthcheck(_: object) -> Response:
    """Return a simple health payload for monitoring."""
    return Response({"status": "ok"}, status=status.HTTP_200_OK)


class PlaceholderViewSet(viewsets.ViewSet):
    """Simple viewset you can expand when wiring up real endpoints."""

    def list(self, request):
        return Response(
            {"message": "Replace this placeholder with your own implementation."}
        )


def _collect_max_ranking(colleges: Iterable[Dict[str, Any]]) -> int:
    max_ranking = 0
    for college in colleges:
        ranking = _safe_int(college.get("ranking"))
        if ranking and ranking > max_ranking:
            max_ranking = ranking
    return max_ranking or 1


def calculate_match_score(
    user_pref: Dict[str, Any],
    college: Dict[str, Any],
    max_ranking: int,
    *,
    use_llm: bool = False,
) -> Dict[str, Any]:
    """Create a weighted match score; optionally refine with an LLM."""
    weights = {"affordability": 0.4, "admissions": 0.35, "ranking": 0.25}
    total_weight = 0.0
    score_accumulator = 0.0
    explanations: list[str] = []

    user_budget = _safe_float(user_pref.get("budget"))
    college_cost = _safe_float(college.get("average_cost"))
    if user_budget and college_cost:
        affordability = user_budget / college_cost if college_cost > 0 else 1.0
        affordability_score = max(0.0, min(affordability, 1.0))
        score_accumulator += affordability_score * weights["affordability"]
        total_weight += weights["affordability"]
        if college_cost <= user_budget:
            explanations.append("Fits within your stated budget.")
        else:
            explanations.append("Costs more than your budget but may still be manageable.")

    user_gpa = _safe_float(user_pref.get("gpa"))
    acceptance_rate_raw = _safe_float(college.get("acceptance_rate"))
    acceptance_rate_percent = _normalize_percent(acceptance_rate_raw)
    if user_gpa and acceptance_rate_percent is not None:
        gpa_norm = max(0.0, min(user_gpa / 4.0, 1.0))
        acceptance_norm = max(0.0, min(acceptance_rate_percent / 100.0, 1.0))
        admissions_fit = (0.6 * gpa_norm) + (0.4 * acceptance_norm)
        score_accumulator += admissions_fit * weights["admissions"]
        total_weight += weights["admissions"]
        explanations.append("Academic profile aligns with historical admits.")

    ranking = _safe_int(college.get("ranking"))
    if ranking:
        ranking_norm = 1 - min(ranking / max_ranking, 1.0)
        score_accumulator += ranking_norm * weights["ranking"]
        total_weight += weights["ranking"]
        if ranking <= max_ranking * 0.2:
            explanations.append("Highly ranked option in your results.")
        elif ranking <= max_ranking * 0.5:
            explanations.append("Solid ranking relative to the field.")
        else:
            explanations.append("Ranking provides a balanced safety option.")

    if total_weight == 0:
        normalized_score = 0.5
        explanations.append("Limited data available; showing a baseline score.")
    else:
        normalized_score = score_accumulator / total_weight

    heuristic_score = round(normalized_score * 100, 1)
    final_score = heuristic_score
    llm_details: Dict[str, Any] = {}

    if use_llm:
        prompt = _build_llm_prompt(user_pref, college, heuristic_score)
        llm_score, llm_explanation = _huggingface_inference(prompt)
        if llm_score is not None:
            final_score = round(max(0.0, min(llm_score, 100.0)), 1)
            llm_details["model_score"] = final_score
        if llm_explanation:
            explanations.append(llm_explanation)
            llm_details["model_explanation"] = llm_explanation

    result: Dict[str, Any] = {
        "college_id": college.get("id"),
        "college_name": college.get("name"),
        "location": college.get("location"),
        "average_cost": college_cost,
        "acceptance_rate": acceptance_rate_percent,
        "ranking": ranking,
        "score": final_score,
        "heuristic_score": heuristic_score,
        "notes": explanations,
    }
    if llm_details:
        result["llm"] = llm_details
    return result


class MatchScoreView(APIView):
    """Compute heuristic match scores for a user's preferences against available colleges."""

    def get(self, request) -> Response:
        user_id = request.query_params.get("user_id")
        if not user_id:
            return Response(
                {"detail": "Query parameter 'user_id' is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        use_llm = (
            request.query_params.get("use_llm", "false").lower()
            in {"1", "true", "yes"}
        )
        llm_available = bool(HF_API_KEY and HF_MODEL_ID)
        llm_active = use_llm and llm_available
        refresh_requested = (
            request.query_params.get("refresh", "false").lower() in {"1", "true", "yes"}
        )

        user_preferences = supabase.selectWhere(
            "user_preferences", columns=["*"], conditions={"user_id": user_id}
        )
        if not user_preferences:
            return Response(
                {"detail": "No preference profile found for this user."},
                status=status.HTTP_404_NOT_FOUND,
            )

        colleges = supabase.selectData("colleges", columns=["*"])
        if not colleges:
            return Response(
                {"detail": "No colleges available to score."},
                status=status.HTTP_404_NOT_FOUND,
            )

        max_ranking = _collect_max_ranking(colleges)
        user_pref = user_preferences[0]

        client = supabase.get_client()

        results: List[Dict[str, Any]] = []
        from_cache = False

        if not refresh_requested:
            cache_response = client.table("match_recommendations").select(
                """
                id,
                score,
                heuristic_score,
                notes,
                llm,
                college_id,
                colleges:college_id (
                  id,
                  name,
                  location,
                  average_cost,
                  acceptance_rate,
                  ranking
                )
                """
            ).eq("user_id", user_id).execute()

            cached_rows = cache_response.data if cache_response else []
            if cached_rows:
                from_cache = True
                for row in cached_rows:
                    college_info = row.get("colleges") or {}
                    results.append(
                        {
                            "college_id": row.get("college_id"),
                            "college_name": college_info.get("name"),
                            "location": college_info.get("location"),
                            "average_cost": college_info.get("average_cost"),
                            "acceptance_rate": college_info.get("acceptance_rate"),
                            "ranking": college_info.get("ranking"),
                            "score": float(row.get("score")),
                            "heuristic_score": (
                                float(row["heuristic_score"])
                                if row.get("heuristic_score") is not None
                                else None
                            ),
                            "notes": row.get("notes") or [],
                            "llm": row.get("llm"),
                        }
                    )

        if results:
            results.sort(key=lambda item: item["score"], reverse=True)
            top_n = request.query_params.get("limit")
            if top_n:
                try:
                    limit = max(1, min(int(top_n), len(results)))
                    results = results[:limit]
                except ValueError:
                    pass

        if not results:
            computed: List[Dict[str, Any]] = [
                calculate_match_score(
                    user_pref, college, max_ranking, use_llm=llm_active
                )
                for college in colleges
            ]
            computed.sort(key=lambda item: item["score"], reverse=True)

            top_n = request.query_params.get("limit")
            if top_n:
                try:
                    limit = max(1, min(int(top_n), len(computed)))
                    computed = computed[:limit]
                except ValueError:
                    pass

            results = computed

            if results:
                payload = [
                    {
                        "user_id": user_id,
                        "college_id": item["college_id"],
                        "score": item["score"],
                        "heuristic_score": item.get("heuristic_score"),
                        "notes": item.get("notes"),
                        "llm": item.get("llm"),
                    }
                    for item in results
                ]
                try:
                    client.table("match_recommendations").delete().eq("user_id", user_id).execute()
                except Exception as cache_error:
                    print("Failed clearing cached match recommendations:", cache_error)

                try:
                    client.table("match_recommendations").upsert(
                        payload,
                        on_conflict="user_id,college_id",
                    ).execute()
                except Exception as cache_error:
                    # Log the cache error but do not fail the request
                    print("Failed to cache match recommendations:", cache_error)

        return Response(
            {
                "user_id": user_id,
                "match_count": len(results),
                "llm_available": llm_available,
                "using_llm": llm_active,
                "from_cache": from_cache,
                "results": results,
            },
            status=status.HTTP_200_OK,
        )


def _build_insights_prompt(user_pref: Dict[str, Any], colleges: List[Dict[str, Any]]) -> str:
    return (
        "You are an educational guidance coach. Using the student's saved college list and "
        "their preference profile, produce 3 concise recommendations to guide their next steps. "
        "Each recommendation should have a short title (maximum 7 words) and a one sentence "
        "description referencing specific data when possible. Respond strictly as JSON with the "
        "format:\n"
        '[{"title": "...", "description": "..."}]\n\n'
        f"Student preferences:\n{json.dumps(user_pref, default=str)}\n\n"
        f"Saved colleges:\n{json.dumps(colleges, default=str)}\n\n"
        "Return only the JSON array."
    )


def _generate_rule_based_insights(
    user_pref: Dict[str, Any], colleges: List[Dict[str, Any]]
) -> List[Dict[str, str]]:
    insights: List[Dict[str, str]] = []

    budget = _safe_float(user_pref.get("budget"))
    intended_major = str(user_pref.get("intended_major") or "").strip()

    scored_colleges = sorted(
        colleges,
        key=lambda item: _safe_float(item.get("match_score")) or 0.0,
        reverse=True,
    )
    top_match = scored_colleges[0] if scored_colleges else None

    if top_match and top_match.get("name"):
        match_score = _safe_float(top_match.get("match_score"))
        score_text = f"{int(round(match_score))}%" if match_score is not None else "strong"
        insights.append(
            {
                "title": "Prioritize Your Best Fit",
                "description": (
                    f"{top_match.get('name')} aligns well with your profile "
                    f"({score_text}). Review their application checklist and deadlines next."
                ),
            }
        )

    if budget is not None:
        over_budget = [
            college
            for college in colleges
            if (_safe_float(college.get("average_cost")) or 0.0) > budget
        ]
        if over_budget:
            highest = max(
                over_budget,
                key=lambda item: _safe_float(item.get("average_cost")) or 0.0,
            )
            cost_value = _safe_float(highest.get("average_cost"))
            insights.append(
                {
                    "title": "Map Out Financial Fit",
                    "description": (
                        f"{highest.get('name')} averages {_format_currency(cost_value)} per year, "
                        f"above your {_format_currency(budget)} budget. Explore aid options or "
                        "adjust your cost filters."
                    ),
                }
            )
        else:
            value_pick = min(
                [c for c in colleges if _safe_float(c.get("average_cost")) is not None],
                key=lambda item: _safe_float(item.get("average_cost")) or 0.0,
                default=None,
            )
            if value_pick and value_pick.get("name"):
                insights.append(
                    {
                        "title": "Plan Your Campus Visits",
                        "description": (
                            f"{value_pick.get('name')} fits within your budget at "
                            f"{_format_currency(_safe_float(value_pick.get('average_cost')))}. "
                            "Schedule a visit or virtual tour to validate the fit."
                        ),
                    }
                )

    acceptance_stats = [
        _normalize_percent(_safe_float(college.get("acceptance_rate")))
        for college in colleges
        if _safe_float(college.get("acceptance_rate")) is not None
    ]
    if acceptance_stats:
        lowest_rate = min(acceptance_stats)
        if lowest_rate is not None and lowest_rate < 30.0:
            insights.append(
                {
                    "title": "Balance Admission Odds",
                    "description": (
                        "Your list leans toward competitive schools. Add a safety option with a higher "
                        "acceptance rate to keep your plan resilient."
                    ),
                }
            )
        else:
            highest_rate = max(acceptance_stats)
            if highest_rate is not None and highest_rate > 55.0:
                insights.append(
                    {
                        "title": "Lock In A Likely Admit",
                        "description": (
                            "You have solid admission odds at one or more schools. Prepare application "
                            "materials now to submit early and secure that offer."
                        ),
                    }
                )

    if intended_major and not any(
        intended_major.lower() in str(college.get("name", "")).lower()
        or intended_major.lower() in str(college.get("location", "")).lower()
        for college in colleges
    ):
        insights.append(
            {
                "title": "Validate Major Fit",
                "description": (
                    f"Research program details for {intended_major} at your saved colleges and make sure "
                    "your short list still aligns with that goal."
                ),
            }
        )

    fallback_actions = [
        {
            "title": "Refresh Your Preferences",
            "description": (
                "Take a moment to update GPA, test scores, and interests so your recommendations stay accurate."
            ),
        },
        {
            "title": "Expand Your College List",
            "description": (
                "Add one more college that complements your current picks to keep reach, match, and safety options balanced."
            ),
        },
        {
            "title": "Plan Application Milestones",
            "description": (
                "Create deadlines for essays, recommendations, and financial aid to stay ahead of each school's timeline."
            ),
        },
    ]

    titles_seen = {item["title"] for item in insights}
    for fallback in fallback_actions:
        if fallback["title"] not in titles_seen:
            insights.append(fallback)
            titles_seen.add(fallback["title"])
        if len(insights) >= 3:
            break

    return insights[:3]


def _generate_insights(user_pref: Dict[str, Any], colleges: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    prompt = _build_insights_prompt(user_pref, colleges)
    headers = {
        "Authorization": f"Bearer {HF_API_KEY}" if HF_API_KEY else "",
        "Content-Type": "application/json",
    }
    payload = {
        "inputs": prompt,
        "parameters": {"max_new_tokens": 256, "temperature": 0.3},
    }

    if not HF_API_KEY or not HF_MODEL_ID:
        return _generate_rule_based_insights(user_pref, colleges)

    try:
        response = requests.post(
            f"https://api-inference.huggingface.co/models/{HF_MODEL_ID}",
            headers=headers,
            json=payload,
            timeout=HF_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        print("Hugging Face insight generation failed:", exc)
        return _generate_rule_based_insights(user_pref, colleges)

    try:
        data = response.json()
    except json.JSONDecodeError:
        return _generate_rule_based_insights(user_pref, colleges)

    generated = ""
    if isinstance(data, list) and data:
        generated = data[0].get("generated_text") or data[0].get("text", "")
    elif isinstance(data, dict):
        generated = data.get("generated_text") or data.get("text", "")

    if not generated:
        return _generate_rule_based_insights(user_pref, colleges)

    match = re.search(r"\[\s*\{.*\}\s*\]", generated, re.DOTALL)
    if not match:
        return []

    try:
        parsed = json.loads(match.group(0))
    except json.JSONDecodeError:
        return []

    insights: List[Dict[str, str]] = []
    if isinstance(parsed, list):
        for item in parsed:
            title = str(item.get("title", "")).strip()
            description = str(item.get("description", "")).strip()
            if title and description:
                insights.append({"title": title, "description": description})

    llm_insights = insights[:3]
    if llm_insights:
        return llm_insights

    return _generate_rule_based_insights(user_pref, colleges)


class MatchInsightsView(APIView):
    """Return AI insights based on preferences and saved colleges."""

    def get(self, request) -> Response:
        user_id = request.query_params.get("user_id")
        if not user_id:
            return Response(
                {"detail": "Query parameter 'user_id' is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_preferences = supabase.selectWhere(
            "user_preferences", columns=["*"], conditions={"user_id": user_id}
        )
        if not user_preferences:
            return Response(
                {"detail": "No preference profile found for this user."},
                status=status.HTTP_404_NOT_FOUND,
            )
        user_pref = user_preferences[0]

        client = supabase.get_client()
        saved_response = client.table("saved_colleges").select(
            """
            college_id,
            match_score,
            colleges:college_id (
              id,
              name,
              location,
              ranking,
              average_cost,
              acceptance_rate
            )
            """
        ).eq("user_id", user_id).execute()
        saved_rows = saved_response.data if saved_response else []

        saved_colleges = [
            {
                "college_id": row.get("college_id"),
                "name": row.get("colleges", {}).get("name"),
                "location": row.get("colleges", {}).get("location"),
                "ranking": row.get("colleges", {}).get("ranking"),
                "average_cost": row.get("colleges", {}).get("average_cost"),
                "acceptance_rate": row.get("colleges", {}).get("acceptance_rate"),
                "match_score": row.get("match_score"),
            }
            for row in saved_rows
            if row.get("colleges")
        ]

        refresh_requested = (
            request.query_params.get("refresh", "false").lower() in {"1", "true", "yes"}
        )

        from_cache = False
        insights: List[Dict[str, str]] = []

        if not refresh_requested:
            cache_response = client.table("match_insights").select(
                "id, sort_order, title, insight, metadata"
            ).eq("user_id", user_id).order("sort_order", ascending=True).execute()
            cached = cache_response.data if cache_response else []
            if cached:
                from_cache = True
                insights = [
                    {
                        "title": row.get("title", ""),
                        "description": row.get("insight", ""),
                        "metadata": row.get("metadata"),
                    }
                    for row in cached
                ]

        if not insights:
            generated = []
            if saved_colleges:
                generated = _generate_insights(user_pref, saved_colleges)

            if not generated:
                generated = [
                    {
                        "title": "Review Your Preferences",
                        "description": "Update your profile preferences to unlock tailored insights.",
                        "metadata": None,
                    }
                ]

            insights = generated

            try:
                client.table("match_insights").delete().eq("user_id", user_id).execute()
            except Exception as cache_error:
                print("Failed clearing cached insights:", cache_error)

            payload = [
                {
                    "user_id": user_id,
                    "sort_order": index,
                    "title": item["title"],
                    "insight": item["description"],
                    "metadata": item.get("metadata"),
                }
                for index, item in enumerate(insights)
            ]
            try:
                client.table("match_insights").insert(payload).execute()
            except Exception as cache_error:
                print("Failed to cache insights:", cache_error)

        return Response(
            {
                "user_id": user_id,
                "count": len(insights),
                "from_cache": from_cache,
                "results": insights,
            },
            status=status.HTTP_200_OK,
        )
