from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
try:
    h = pwd_context.hash("admin123")
    print(f"Hash: {h}")
    v = pwd_context.verify("admin123", h)
    print(f"Verify: {v}")
except Exception as e:
    print(f"Error: {e}")
