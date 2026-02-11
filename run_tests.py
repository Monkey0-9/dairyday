#!/usr/bin/env python
"""Run backend tests."""

import subprocess
import sys

result = subprocess.run(
    ['python', '-m', 'pytest', 'tests/', '-v', '--tb=short'],
    capture_output=True,
    text=True,
    cwd='backend'
)

print(result.stdout)
if result.stderr:
    print("STDERR:", result.stderr)
sys.exit(result.returncode)

