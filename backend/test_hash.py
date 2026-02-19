
from passlib.context import CryptContext
import traceback

try:
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    h = pwd_context.hash("testpassword")
    print(f"Hash: {h}")
    v = pwd_context.verify("testpassword", h)
    print(f"Verify: {v}")
except Exception as e:
    print(f"Error: {e}")
    traceback.print_exc()
