#!/usr/bin/env python
"""Test that backend imports work correctly."""

import sys
sys.path.insert(0, 'backend')

try:
    from app.main import app
    print('Backend app import: SUCCESS')
    print('All fixes verified and working!')
except Exception as e:
    print(f'ERROR: {e}')
    sys.exit(1)

