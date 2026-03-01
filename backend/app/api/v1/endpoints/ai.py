from typing import Any
from fastapi import APIRouter, Depends, HTTPException
import logging
from openai import AsyncOpenAI
from pydantic import BaseModel
from app.api import deps
from app.models.user import User
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

FALLBACK_MODELS = [
    "stepfun/step-3.5-flash:free",
    "nvidia/nemotron-3-nano-30b-a3b:free",
    "meta-llama/llama-3.2-3b-instruct:free",
]


class ChatRequest(BaseModel):
    message: str


SYSTEM_PROMPT = """You are the DairyDays Milk Assistant — a knowledgeable, helpful, and friendly dairy expert for the DairyDays platform.

CORE PRINCIPLES:
- **Brevity**: Keep answers concise. Use max 3-5 short bullet points.
- **Clarity**: Use simple, natural language. No technical jargon.
- **Directness**: Answer the user's question immediately without preamble.
- **Formatting**: Use **bold** for key terms and bullet points for lists.
- **Personality**: Be a friendly expert, like a helpful milkman who knows everything about dairy.

DAIRYDAYS MILK KNOWLEDGE:

**🥛 MILK VARIANTS WE OFFER:**

1. **Fresh Cow Milk**
   - Daily fresh, nutrient-rich
   - 3-4% fat content
   - Good source of calcium and protein

2. **Buffalo Milk**
   - Rich and creamy texture
   - 6-8% fat content
   - Higher in protein and minerals
   - Great for making paneer, ghee

3. **A2 Cow Milk**
   - Contains A2 beta-casein protein
   - Easier to digest for many
   - Suitable for mild lactose sensitivities
   - Premium quality, grass-fed cows

4. **Organic Milk**
   - From grass-fed cows
   - Free from hormones and antibiotics
   - Chemically residue-free

**🧊 MILK STORAGE:**
- Refrigerate at 1-4°C immediately
- Use within 2-3 days of delivery
- Never leave at room temperature >2 hours
- Boil before consuming for safety

**💰 BILLING & PAYMENTS:**
- Bills generated monthly (1st of each month)
- Payment due by 5th of following month
- Accept UPI, bank transfer, cash
- Submit UTR number after payment

**📱 USING THE APP:**
- Track daily milk delivery
- View consumption history
- Submit payment UTR
- Contact support for issues
- **Freshness**: All milk is delivered fresh and should be kept \
refrigerated between **1°C and 4°C**.
- **Platform**: Users can manage daily orders, view monthly bills, and \
track their consumption history.
- **Billing**: Bills are generated automatically and can be paid \
securely through the app.

If asked about non-dairy topics, politely state that your expertise is \
focused on dairy excellence and offer to help with platform or \
milk-related questions."""


async def _call_model(model: str, message: str) -> str:
    """Call a specific model on OpenRouter. Returns response text."""
    client = AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=settings.AI_API_KEY,
    )
    completion = await client.chat.completions.create(
        extra_headers={
            "HTTP-Referer": settings.BASE_URL,
            "X-Title": settings.PROJECT_NAME,
        },
        extra_body={"reasoning": {"enabled": True}},
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": message},
        ],
        temperature=0.5,
        max_tokens=1000,
    )
    return completion.choices[0].message.content


@router.post("/chat")
async def ai_chat(
    request: ChatRequest, current_user: User = Depends(deps.get_current_active_user)
) -> Any:
    """Relay chat request to an AI provider with auto-fallback."""
    logger.info(f"AI Chat request. Key detected: {bool(settings.AI_API_KEY)}")
    if not settings.AI_API_KEY:
        return {
            "response": (
                f"Node 4.2 received: '{request.message}'. "
                "[SIMULATED] Milk contains 8g of protein per cup."
            ),
            "status": "simulated",
        }

    # Build the list of models to try
    models_to_try = [settings.AI_MODEL] + [
        m for m in FALLBACK_MODELS if m != settings.AI_MODEL
    ]

    last_error = None
    for model in models_to_try:
        try:
            response_text = await _call_model(model, request.message)
            return {"response": response_text, "status": "success"}
        except Exception as e:
            last_error = e
            if "429" in str(e):
                logger.warning(f"Rate limited on {model}, trying next...")
                continue
            # Non-rate-limit error, stop trying
            logger.error(f"AI error on {model}: {e}")
            break

    # All models failed
    import traceback

    logger.error(f"All AI models failed: {last_error}")
    logger.error(traceback.format_exc())
    raise HTTPException(
        status_code=503, detail="All AI nodes congested. Please retry shortly."
    )
