# Match Score Endpoint

The Django API exposes `GET /api/match-scores/`, which computes fit scores between a user's stored preferences and entries in the Supabase `colleges` table. Scores are derived from a heuristic model and can optionally be refined by a Hugging Face LLM.

## Request

```
GET /api/match-scores/?user_id=<uuid>&limit=<optional>&use_llm=<optional>
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `user_id` | Yes      | UUID that matches the row in `user_preferences`. |
| `limit`   | No       | Maximum number of colleges to return (defaults to all). |
| `use_llm` | No       | Set to `true` / `1` to enable Hugging Face refinement (requires credentials). |

## Response

```json
{
  "user_id": "cf1f1c6d-....",
  "match_count": 3,
  "llm_available": true,
  "using_llm": true,
  "results": [
    {
      "college_id": 1,
      "college_name": "Example University",
      "location": "California",
      "average_cost": 28000,
      "acceptance_rate": 12.5,
      "ranking": 5,
      "score": 88.7,
      "heuristic_score": 86.4,
      "notes": [
        "Fits within your stated budget.",
        "Academic profile aligns with historical admits.",
        "Highly ranked option in your results.",
        "LLM: Strong alignment between campus resources and stated goals."
      ],
      "llm": {
        "model_score": 88.7,
        "model_explanation": "LLM: Strong alignment between campus resources and stated goals."
      }
    }
  ]
}
```

Heuristic scoring weights affordability, admissions competitiveness, and program ranking. If any metric is unavailable, the endpoint returns a baseline score with explanatory notes. When `use_llm=true` and Hugging Face credentials are configured, the heuristic score is sent to the model for refinement; both scores are included in the response alongside the model explanation.

## Configuration

Add the following to `backend/.env` (service-role key or similar read access is required):

```
SUPABASE_URL=your-project-url
SUPABASE_KEY=your-service-role-key
HUGGINGFACE_API_KEY=your-hf-inference-api-key
HUGGINGFACE_MODEL_ID=meta-llama/Llama-3.1-8B-Instruct
HUGGINGFACE_TIMEOUT_SECONDS=30
```

You can change `HUGGINGFACE_MODEL_ID` to any text-generation model available to your account. The timeout is configurable if the model is slow to respond.

## Next Steps

- Persist results back into Supabase by writing to a `college_match_scores` table after the response is generated.
- Gate the endpoint with authentication before exposing it to the frontend.
- Adjust the prompt or parse logic to fit a specific model, or swap the heuristic for a fully model-driven workflow.
- When calling from the Vite frontend, point `VITE_API_BASE_URL` to your Django API (e.g. `http://127.0.0.1:8000/api`) and include the signed-in Supabase user’s `id` in the query string.
