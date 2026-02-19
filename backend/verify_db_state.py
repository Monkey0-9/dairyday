
import sqlite3

def verify():
    conn = sqlite3.connect('dairy.db')
    cur = conn.cursor()
    cur.execute("SELECT email, status, is_verified, otp_code FROM registration_requests WHERE email LIKE 'verify_%'")
    rows = cur.fetchall()
    print("Recent Verification Requests:")
    for row in rows:
        print(f"Email: {row[0]} | Status: {row[1]} | Verified: {row[2]} | OTP: {row[3]}")
    conn.close()

if __name__ == "__main__":
    verify()
