import os
import re
import sys
from pathlib import Path

# High-risk patterns to look for
PATTERNS = {
    "AWS Access Key": r"AKIA[0-9A-Z]{16}",
    "AWS Secret Key": r"([^A-Z0-9])[A-Za-z0-9+/]{40}([^A-Z0-9])",
    "Stripe Restricted Key": r"rk_(test|live)_[0-9a-zA-Z]{24}",
    "Stripe Secret Key": r"sk_(test|live)_[0-9a-zA-Z]{24}",
    "Razorpay Key": r"rzp_(test|live)_[0-9a-zA-Z]{14}",
    "Database Password in URI": r"[a-zA-Z0-9]+:\/\/[a-zA-Z0-9]+:[a-zA-Z0-9!@#$%^&*()]+@",
    "JWT Secret Key": r"(SECRET_KEY|JWT_SECRET)\s*=\s*['\"][a-zA-Z0-9!@#$%^&*()_\-+=]{16,}['\"]",
}

# Directories and files to ignore
IGNORE_PATHS = [
    "venv", ".venv", "__pycache__", ".git", "node_modules", ".next",
    "tests", "testsprite_tests", ".pytest_cache", "archive", "uploads",
    ".mypy_cache", ".ruff_cache"
]

def scan_file(file_path):
    findings = []
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            for name, pattern in PATTERNS.items():
                matches = re.finditer(pattern, content)
                for match in matches:
                    # For simple regex, we just report the line.
                    # For some, we need to extract the actual secret for verification.
                    line_no = content.count('\n', 0, match.start()) + 1
                    line = content.split('\n')[line_no - 1].strip()
                    
                    # Basic false positive filtering
                    if "EXAMPLE" in line.upper() or "REPLACE" in line.upper() or "YOUR_KEY" in line.upper():
                        continue
                    if "password" == line.lower() or "password" in line.lower() and "admin123" in line.lower():
                        # admin123 is a known dev password, but we should still flag it if it's in a sensitive place
                        pass

                    findings.append({
                        "file": str(file_path),
                        "line": line_no,
                        "type": name,
                        "content": line[:100] + ("..." if len(line) > 100 else "")
                    })
    except Exception as e:
        print(f"Error scanning {file_path}: {e}")
    return findings

def main():
    root_dir = Path(__file__).resolve().parent.parent
    total_findings = 0
    
    print(f"🚀 Starting Manual Security Audit for DairyOS at {root_dir}")
    print("-" * 50)

    for path in root_dir.rglob('*'):
        if any(ignore in path.parts for ignore in IGNORE_PATHS):
            continue
        if path.is_file() and not path.name.endswith(('.pyc', '.png', '.jpg', '.webp', '.pdf', '.db')):
            findings = scan_file(path)
            for f in findings:
                print(f"[!] {f['type']} found in {f['file']}:{f['line']}")
                print(f"    Line: {f['content']}\n")
                total_findings += 1

    print("-" * 50)
    if total_findings == 0:
        print("✅ No critical secrets detected in tracked files!")
    else:
        print(f"❌ Found {total_findings} potential security risks. Please review immediately.")
        sys.exit(1)

if __name__ == "__main__":
    main()
