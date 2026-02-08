#!/usr/bin/env python3
import subprocess
import sys
from pathlib import Path


def run(cmd: str) -> bool:
    p = subprocess.run(cmd, shell=True)
    return p.returncode == 0


def main():
    api_url = "http://localhost:8000/api/v1/openapi.json"
    out_path = Path(r"c:\dairy\frontend\lib\api-types.ts")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = f"npx openapi-typescript {api_url} -o \"{out_path}\""
    ok = run(cmd)
    if not ok:
        print("Failed to generate types. Ensure Node.js and openapi-typescript are available.")
        sys.exit(1)
    print(f"Types generated at {out_path}")


if __name__ == "__main__":
    main()
