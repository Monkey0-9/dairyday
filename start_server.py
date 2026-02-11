#!/usr/bin/env python
"""Start backend server."""

import subprocess
import sys
import os

os.chdir('backend')

# Start uvicorn in background
proc = subprocess.Popen(
    ['python', '-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8000'],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)

print(f'Started server with PID: {proc.pid}')
print('Waiting for server to be ready...')

import time
time.sleep(5)

# Check if server is running
result = subprocess.run(
    ['curl', '-sf', 'http://localhost:8000/api/health'],
    capture_output=True,
    text=True,
    timeout=10
)

if result.returncode == 0:
    print('Server is ready!')
    print('Response:', result.stdout)
else:
    print('Server may not be ready yet')
    print('curl result:', result.returncode)

