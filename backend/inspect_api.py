import inspect
from app.api.v1.endpoints.consumption import export_consumption
from fastapi import Query

# Get the parameters of the function
sig = inspect.signature(export_consumption)
format_param = sig.parameters.get('format')

if format_param:
    default_val = format_param.default
    if isinstance(default_val, Query):
        print(f"Format Param Pattern: {default_val.pattern}")
        print(f"Format Param Default: {default_val.default}")
    else:
        print(f"Format Param Default (raw): {default_val}")
else:
    print("Format parameter not found")
