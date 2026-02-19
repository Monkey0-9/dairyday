
import time
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def bench():
    password = "admin_password_123"
    print(f"Benchmarking pbkdf2_sha256 hashing...")
    start = time.time()
    hashed = pwd_context.hash(password)
    end = time.time()
    print(f"Hash time: {end - start:.4f} seconds")
    
    print(f"Benchmarking verification...")
    start = time.time()
    valid = pwd_context.verify(password, hashed)
    end = time.time()
    print(f"Verify time: {end - start:.4f} seconds")
    print(f"Valid: {valid}")

if __name__ == "__main__":
    bench()
