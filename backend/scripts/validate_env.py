import os
import sys
from pathlib import Path

def validate_env():
    backend_dir = Path(__file__).parent.parent
    env_example = backend_dir / ".env.example"
    env_actual = backend_dir / ".env"

    if not env_example.exists():
        print("❌ .env.example not found")
        return False

    with open(env_example, "r") as f:
        required_keys = [
            line.split("=")[0] 
            for line in f 
            if "=" in line and not line.startswith("#")
        ]

    if not env_actual.exists():
        print("⚠️  .env file not found. System will rely on environment variables.")
        # Check if all required keys are in os.environ
        missing = [k for k in required_keys if k not in os.environ]
    else:
        with open(env_actual, "r") as f:
            actual_content = f.read()
            missing = [k for k in required_keys if k not in actual_content and k not in os.environ]

    if missing:
        print("❌ Missing environment variables:")
        for k in missing:
            print(f"  - {k}")
        return False

    print("✅ Environment variables check passed.")
    return True

if __name__ == "__main__":
    if not validate_env():
        sys.exit(1)
    sys.exit(0)
