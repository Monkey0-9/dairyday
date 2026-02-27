from typing import Any
from fastapi import APIRouter

router = APIRouter()

SUPPORTED_LANGUAGES = [
    {"code": "en", "name": "English", "native": "English"},
    {"code": "kn", "name": "Kannada", "native": "ಕನ್ನಡ"},
    {"code": "te", "name": "Telugu", "native": "తెలుగు"},
    {"code": "ta", "name": "Tamil", "native": "தமிழ்"},
    {"code": "hi", "name": "Hindi", "native": "हिन्दी"},
]


@router.get("/config")
async def get_system_config() -> Any:
    """Get system-wide configuration including i18n support."""
    return {
        "i18n": {"default_language": "en", "supported_languages": SUPPORTED_LANGUAGES},
        "theme": {"default": "dark"},
    }
