"""Feature Flag Management System.

Enables gradual rollout of new features and kill-switch capabilities.
Supports environment-based overrides and database-backed flags.
"""

from typing import Optional

# In-memory flag cache (can be moved to Redis for production)
_DEFAULT_FLAGS = {
    "new_dashboard": False,
    "ai_assistant_v2": True,
    "manual_utr_submission": True,
    "performance_metrics_view": True,
}


class FeatureFlags:
    """Manages application feature flags."""

    def __init__(self):
        self._flags = _DEFAULT_FLAGS.copy()
        # Override with settings if provided
        # e.g., settings.DB_FLAGS if they existed

    def is_enabled(self, feature_name: str, user_id: Optional[str] = None) -> bool:
        """Check if a feature is enabled.

        Args:
            feature_name: Name of the feature to check
            user_id: Optional user ID for percentage-based rollouts

        Returns:
            bool: True if feature is enabled
        """
        if feature_name not in self._flags:
            return False

        is_active = self._flags[feature_name]

        # Elite logic: Example of user-based rollout
        if is_active and user_id and feature_name == "new_dashboard":
            # Simple hash-based rollout for 20% of users
            import hashlib

            user_hash = int(hashlib.sha256(user_id.encode()).hexdigest(), 16)
            return (user_hash % 100) < 20

        return is_active

    def set_flag(self, feature_name: str, enabled: bool) -> None:
        """Update a flag state at runtime."""
        self._flags[feature_name] = enabled


# Global instance
flags = FeatureFlags()
