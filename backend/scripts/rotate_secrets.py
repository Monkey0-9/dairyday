#!/usr/bin/env python3
"""
DairyDay Secret Rotation Utility
This script helps rotate the SECRET_KEY and optionally wipes active sessions.
Usage: python rotate_secrets.py [--wipe]
"""
import secrets
import argparse
import os
import sys
from pathlib import Path
import asyncio

async def rotate():
    parser = argparse.ArgumentParser(description="Rotate DairyDay application secrets.")
    parser.add_argument("--wipe", action="store_true", help="Wipe all active sessions from Redis.")
    args = parser.parse_args()

    # 1. Generate new key
    new_key = secrets.token_urlsafe(64)
    print(f"\n[+] NEW_SECRET_KEY: {new_key}")
    print("[!] ACTION REQUIRED: Update your .env or environment variables with this key.")

    # 2. Wipe sessions if requested
    if args.wipe:
        print("[*] Attempting to wipe active sessions from Redis...")
        try:
            # Add backend to path to import app modules
            sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
            from app.core.redis import get_redis
            from app.core.security import USER_SESSIONS_PREFIX
            
            redis = await get_redis()
            if redis:
                keys = await redis.keys(f"{USER_SESSIONS_PREFIX}*")
                if keys:
                    await redis.delete(*keys)
                    print(f"[+] Successfully wiped {len(keys)} user session maps.")
                else:
                    print("[+] No active sessions found to wipe.")
            else:
                print("[-] Redis not available. Skipping session wipe.")
        except ImportError:
            print("[-] Could not import Redis dependencies. Ensure script is run from backend/scripts.")
        except Exception as e:
            print(f"[-] Error wiping sessions: {e}")

    print("\n[✓] Rotation procedure complete.\n")

if __name__ == "__main__":
    asyncio.run(rotate())
