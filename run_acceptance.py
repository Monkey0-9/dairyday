#!/usr/bin/env python
"""Run acceptance tests."""

import subprocess
import sys

result = subprocess.run(
    ['python', 'acceptance_tests.py'],
    capture_output=True,
    text=True,
    cwd='c:/dairy'
)

print(result.stdout[-3000:])  # Last 3000 chars
if result.stderr:
    print("STDERR:", result.stderr[-1000:])
sys.exit(result.returncode)

