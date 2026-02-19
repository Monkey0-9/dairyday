import json
import sys

try:
    with open(r"c:\dairy\frontend\messages\en.json", "r", encoding="utf-8") as f:
        json.load(f)
    print("VALID: en.json is valid.")
except json.JSONDecodeError as e:
    print(f"INVALID: en.json has error at line {e.lineno}, col {e.colno}: {e.msg}")
except Exception as e:
    print(f"ERROR: {e}")
