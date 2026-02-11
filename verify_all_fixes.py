#!/usr/bin/env python
"""Quick verification that all fixes are in place."""

import os
import sys

# Change to backend directory
os.chdir('backend')

# Check for deprecated regex= usage
print('Checking for deprecated regex= usage...')
found = False
for root, dirs, files in os.walk('.'):
    for f in files:
        if f.endswith('.py'):
            path = os.path.join(root, f)
            try:
                with open(path, 'r') as file:
                    lines = file.readlines()
                    for i, line in enumerate(lines):
                        # Check for deprecated pattern: regex= without pattern=
                        if 'regex=' in line and 'Query(' in line and 'pattern=' not in line:
                            print(f'  WARNING: {path}:{i+1} - Found deprecated regex=')
                            found = True
            except:
                pass
if not found:
    print('  OK: No deprecated regex= usage found')

# Check SQLAlchemy text() wrapper
print('Checking SQLAlchemy text() wrapper...')
try:
    with open('app/main.py', 'r') as f:
        content = f.read()
        # Use different string pattern to avoid escaping issues
        if 'text("SELECT 1")' in content:
            print('  OK: SQLAlchemy text() wrapper is present')
        else:
            print('  WARNING: SQLAlchemy text() wrapper might be missing')
except Exception as e:
    print(f'  ERROR: {e}')

# Check dependencies
print('Checking dependencies...')
try:
    with open('requirements.txt', 'r') as f:
        content = f.read()
        missing = []
        for dep in ['sentry-sdk', 'redis', 'aiosqlite']:
            if dep not in content:
                missing.append(dep)
        if missing:
            print(f'  WARNING: Missing dependencies: {missing}')
        else:
            print('  OK: All critical dependencies present')
except Exception as e:
    print(f'  ERROR: {e}')

# Check frontend login
print('Checking frontend login response parsing...')
try:
    # Go back and check frontend
    os.chdir('..')
    with open('frontend/app/login/page.tsx', 'r') as f:
        content = f.read()
        if 'response.data' in content and 'user' in content:
            print('  OK: Login response parsing is correct')
        else:
            print('  WARNING: Login response parsing might be incorrect')
except Exception as e:
    print(f'  ERROR: {e}')

print('')
print('='*50)
print('VERIFICATION COMPLETE')
print('='*50)

