#!/usr/bin/env python
"""Quick verification that all fixes are in place."""

import sys
sys.path.insert(0, '.')

print("Checking for deprecated regex= usage...")
import os
for root, dirs, files in os.walk('.'):
    for f in files:
        if f.endswith('.py'):
            path = os.path.join(root, f)
            try:
                with open(path, 'r') as file:
                    content = file.read()
                    if 'regex=' in content and 'Query(' in content:
                        # Check if it's actually using the deprecated pattern
                        lines = content.split('\n')
                        for i, line in enumerate(lines):
                            if 'regex=' in line and 'Query' in line:
                                if 'pattern=' not in line:
                                    print(f"  WARNING: {path}:{i+1} - Found deprecated regex=")
            except:
                pass

print("\nChecking SQLAlchemy text() wrapper...")
try:
    with open('app/main.py', 'r') as f:
        content = f.read()
        if 'text("SELECT 1")' in content:
            print("  OK: SQLAlchemy text() wrapper is present")
        else:
            print("  WARNING: SQLAlchemy text() wrapper might be missing")
except Exception as e:
    print(f"  ERROR: {e}")

print("\nChecking dependencies...")
try:
    with open('requirements.txt', 'r') as f:
        content = f.read()
        missing = []
        for dep in ['sentry-sdk', 'redis', 'aiosqlite']:
            if dep not in content:
                missing.append(dep)
        if missing:
            print(f"  WARNING: Missing dependencies: {missing}")
        else:
            print("  OK: All critical dependencies present")
except Exception as e:
    print(f"  ERROR: {e}")

print("\nChecking frontend login response parsing...")
try:
    with open('../frontend/app/login/page.tsx', 'r') as f:
        content = f.read()
        if 'response.data' in content and 'user?.id' in content:
            print("  OK: Login response parsing is correct")
        else:
            print("  WARNING: Login response parsing might be incorrect")
except Exception as e:
    print(f"  ERROR: {e}")

print("\n" + "="*50)
print("VERIFICATION COMPLETE")
print("="*50)

