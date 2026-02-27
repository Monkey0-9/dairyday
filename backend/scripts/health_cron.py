"""
DairyDay Health Ping Script
Prevents Render free-tier backend from sleeping by pinging /api/health every run.
Deploy as a Render Cron Job (every 10 minutes) or GitHub Actions schedule.

Usage:
  python health_cron.py

Environment:
  HEALTH_URL: Override the default API health endpoint URL
"""
import os
import sys
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
logger = logging.getLogger("health_cron")

try:
    import httpx
except ImportError:
    logger.error("httpx not installed. Run: pip install httpx")
    sys.exit(1)


def ping_health():
    url = os.getenv(
        "HEALTH_URL",
        "https://dairy-backend.onrender.com/api/v1/system/health"
    )
    try:
        with httpx.Client(timeout=15.0) as client:
            r = client.get(url)
            logger.info(
                f"Health check: status={r.status_code} "
                f"latency={r.elapsed.total_seconds():.2f}s "
                f"at {datetime.utcnow().isoformat()}Z"
            )
            if r.status_code != 200:
                logger.warning(f"Unexpected status: {r.text[:200]}")
    except httpx.TimeoutException:
        logger.error(f"Health check TIMEOUT for {url}")
    except Exception as e:
        logger.error(f"Health check FAILED: {e}")


if __name__ == "__main__":
    ping_health()
