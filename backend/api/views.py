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
    acceptance_rate = _safe_float(college.get("acceptance_rate"))
    if user_gpa and acceptance_rate:
        gpa_norm = max(0.0, min(user_gpa / 4.0, 1.0))
        acceptance_norm = max(0.0, min(acceptance_rate / 100.0, 1.0))
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
        "acceptance_rate": acceptance_rate,
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

        results: List[Dict[str, Any]] = [
            calculate_match_score(
                user_pref, college, max_ranking, use_llm=llm_active
            )
            for college in colleges
        ]
        results.sort(key=lambda item: item["score"], reverse=True)

        top_n = request.query_params.get("limit")
        if top_n:
            try:
                limit = max(1, min(int(top_n), len(results)))
                results = results[:limit]
            except ValueError:
                pass

        return Response(
            {
                "user_id": user_id,
                "match_count": len(results),
                "llm_available": llm_available,
                "using_llm": llm_active,
                "results": results,
            },
            status=status.HTTP_200_OK,
        )
