import sqlite3
conn = sqlite3.connect(r'c:\dairy\backend\dairy.db')
cursor = conn.cursor()
cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='consumption'")
print("TABLE SCHEMA:")
print(cursor.fetchone()[0])
cursor.execute("SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='consumption'")
print("\nINDEXES:")
for row in cursor.fetchall():
    print(row[0])
conn.close()
