#!/usr/bin/env python
"""Start frontend dev server."""

import subprocess
import sys
import os

os.chdir('frontend')

# Start npm in background
proc = subprocess.Popen(
    ['npm', 'run', 'dev', '--', '-p', '3001'],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE
)

print(f'Started frontend with PID: {proc.pid}')
print('Waiting for frontend to be ready...')

import time
time.sleep(15)

# Check if frontend is running
import urllib.request
try:
    response = urllib.request.urlopen('http://localhost:3001', timeout=10)
    print('Frontend is ready!')
    print('Status:', response.status)
except Exception as e:
    print('Frontend may not be ready yet:', e)

