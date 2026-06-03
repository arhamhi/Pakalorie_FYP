import json
import re
from typing import Any

import httpx
from fastapi import HTTPException, status

from app.core.settings import Settings


class GeminiClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    @property
    def configured(self) -> bool:
        return bool(self.settings.gemini_api_key)

    async def generate_json(
        self,
        prompt: str,
        *,
        image_bytes: bytes | None = None,
        mime_type: str | None = None,
        temperature: float = 0.2,
        max_output_tokens: int = 1024,
        thinking_budget: int | None = 0,
    ) -> dict[str, Any]:
        if not self.settings.gemini_api_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="GEMINI_API_KEY is not configured",
            )

        parts: list[dict[str, Any]] = [{"text": prompt}]
        if image_bytes is not None:
            import base64

            parts.append(
                {
                    "inline_data": {
                        "mime_type": mime_type or "image/jpeg",
                        "data": base64.b64encode(image_bytes).decode("ascii"),
                    }
                }
            )

        # gemini-3-flash-preview is a thinking model: thinking tokens count
        # against maxOutputTokens, so leaving thinking on its default starves
        # the JSON answer and truncates it (finishReason MAX_TOKENS -> unparseable).
        # generate_json always wants a JSON object, so request native JSON output
        # and default thinking off; callers needing reasoning can raise the budget.
        generation_config: dict[str, Any] = {
            "temperature": temperature,
            "topK": 40,
            "topP": 0.95,
            "maxOutputTokens": max_output_tokens,
            "responseMimeType": "application/json",
        }
        if thinking_budget is not None:
            generation_config["thinkingConfig"] = {"thinkingBudget": thinking_budget}
        payload = {
            "contents": [{"parts": parts}],
            "generationConfig": generation_config,
        }
        url = f"{self.settings.gemini_api_url}/models/{self.settings.gemini_model}:generateContent"
        params = {"key": self.settings.gemini_api_key}

        last_error: Exception | None = None
        for _ in range(2):
            try:
                async with httpx.AsyncClient(
                    timeout=self.settings.gemini_timeout_seconds
                ) as client:
                    response = await client.post(url, params=params, json=payload)
                if response.status_code >= 500:
                    last_error = HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Gemini upstream error: {response.status_code}",
                    )
                    continue
                if response.status_code >= 400:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail=f"Gemini API error: {response.status_code} {response.text}",
                    )
                data = response.json()
                text = (
                    data.get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text")
                )
                if not text:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail="Gemini returned no text",
                    )
                return _parse_json(text)
            except httpx.TimeoutException as exc:
                last_error = exc
            except httpx.HTTPError as exc:
                last_error = exc

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini request failed: {last_error}",
        )


def _parse_json(text: str) -> dict[str, Any]:
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gemini response did not contain JSON",
        )
    parsed = json.loads(match.group(0))
    if not isinstance(parsed, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gemini response JSON was not an object",
        )
    return parsed
