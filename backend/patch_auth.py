
import os

file_path = "app/api/v1/endpoints/auth.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix login signature
old_sig = """async def login_access_token(
    db: AsyncSession = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
    response: Response = None
) -> Any:"""

# Try matching with different line endings if needed, or just replace the specific part
content = content.replace("response: Response = None", "response: Response")

# Reorder if necessary (though not strictly required for FastAPI, it's cleaner)
# Actually, just removing '= None' is sufficient to force injection.

# Fix the 'if response is not None' check
content = content.replace("if response is not None:", "# Set cookies (response is injected)")

# Remove the indentation for the following block if we removed the 'if'
# Wait, replacing the whole 'if' line with a comment keeps the indentation of the block below it.
# That's perfect if the block was indented.
# Let's check the indentation.
# 174:     if response is not None:
# 175:         # Access token cookie
# The block is indented by 4 more spaces.
# So I need to dedent it.

import re
content = re.sub(r"    if response is not None:\n(        .*?\n)+", lambda m: m.group(0).replace("\n        ", "\n    "), content, flags=re.MULTILINE)
# This is tricky. Let's just use simple replaces for now and fix indentation manually if needed.

with open(file_path, "w", encoding="utf-8", newline="\n") as f:
    f.write(content)
print("Patch applied")
