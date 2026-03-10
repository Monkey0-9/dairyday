import sqlite3

def add_columns():
    conn = sqlite3.connect('dairy-elite.db')
    c = conn.cursor()
    
    columns_to_add = [
        "requested_quantity NUMERIC(12, 3)",
        "requested_extra_qty NUMERIC(12, 3)",
        "request_status VARCHAR(20)",
        "request_note VARCHAR",
        "confirmed_by CHAR(32)"
    ]
    
    for col in columns_to_add:
        try:
            c.execute(f"ALTER TABLE consumption ADD COLUMN {col}")
            print(f"Added {col}")
        except Exception as e:
            print(f"Failed or already exists: {col}. Error: {e}")
            
    conn.commit()
    conn.close()

if __name__ == "__main__":
    add_columns()
