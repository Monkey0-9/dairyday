import sqlite3
import time

def create_index():
    try:
        conn = sqlite3.connect(r'c:\dairy\backend\dairy.db')
        cursor = conn.cursor()
        print("Creating index idx_consumption_date...")
        start = time.time()
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_consumption_date ON consumption (date)")
        conn.commit()
        print(f"Index created in {time.time() - start:.2f}s")
        
        # Verify
        cursor.execute("SELECT sql FROM sqlite_master WHERE type='index' AND name='idx_consumption_date'")
        row = cursor.fetchone()
        if row:
            print(f"Verification: {row[0]}")
        else:
            print("Verification FAILED")
            
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_index()
