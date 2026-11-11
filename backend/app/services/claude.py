"""Claude client for the two AI steps: dish recognition (vision) and the
grounded calorie write-up. Replaces the old Gemini client with the same
generate_json() interface, so the callers did not change shape."""

import base64
import json
import re
from typing import Any

import anthropic
from fastapi import HTTPException, status

from app.core.settings import Settings


class ClaudeClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._client: anthropic.AsyncAnthropic | None = None

    @property
    def configured(self) -> bool:
        return bool(self.settings.anthropic_api_key)

    def _get_client(self) -> anthropic.AsyncAnthropic:
        if self._client is None:
            self._client = anthropic.AsyncAnthropic(
                api_key=self.settings.anthropic_api_key,
                timeout=self.settings.claude_timeout_seconds,
            )
        return self._client

    async def generate_json(
        self,
        prompt: str,
        *,
        image_bytes: bytes | None = None,
        mime_type: str | None = None,
        max_output_tokens: int = 4096,
    ) -> dict[str, Any]:
        if not self.configured:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="ANTHROPIC_API_KEY is not configured",
            )

        content: list[dict[str, Any]] = []
        if image_bytes is not None:
            content.append(
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": mime_type or "image/jpeg",
                        "data": base64.standard_b64encode(image_bytes).decode("ascii"),
                    },
                }
            )
        content.append(
            {"type": "text", "text": prompt + "\n\nReply with only the JSON object."}
        )

        try:
            # Opus 5.5 at low effort: fast enough for a scan, still accurate.
            # Server-side fallback re-runs a refused request on another model.
            response = await self._get_client().beta.messages.create(
                model=self.settings.claude_model,
                max_tokens=max_output_tokens,
                output_config={"effort": self.settings.claude_effort},
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
                messages=[{"role": "user", "content": content}],
            )
        except anthropic.APIStatusError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Claude API error: {exc.status_code}",
            ) from exc
        except anthropic.APIConnectionError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Claude request failed: could not reach the API",
            ) from exc

        if response.stop_reason == "refusal":
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Claude declined this request",
            )
        text = "".join(block.text for block in response.content if block.type == "text")
        if not text:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Claude returned no text",
            )
        return _parse_json(text)


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
            detail="Claude response did not contain JSON",
        )
    parsed = json.loads(match.group(0))
    if not isinstance(parsed, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Claude response JSON was not an object",
        )
    return parsed
