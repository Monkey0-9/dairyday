import sqlite3
import json
import os
import requests

# --- CONFIGURATION ---
# Replace these with your Supabase values from the dashboard
SUPABASE_URL = "https://your-project-id.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key"  # REQUIRED for Auth
SQLITE_DB_PATH = "dairy.db"

HEADERS = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "Content-Type": "application/json"
}


def migrate():
    """Main migration function to bridge SQLite data to Supabase."""
    if not os.path.exists(SQLITE_DB_PATH):
        print(f"Error: {SQLITE_DB_PATH} not found.")
        return

    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    print("--- Phase 1: Migrating Users to Auth ---")
    cursor.execute("SELECT * FROM users")
    users = cursor.fetchall()

    for user in users:
        user_id = user['id']
        email = user['email'] or f"{user_id}@dairyday.internal"

        # 1. Create User in Auth (using Service Role Key)
        auth_payload = {
            "id": user_id,
            "email": email,
            "password": "TemporaryPassword123!",
            "email_confirm": True,
            "user_metadata": {
                "full_name": user['name'],
                "role": user['role']
            }
        }

        try:
            # Check if user already exists
            url = f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}"
            res = requests.get(url, headers=HEADERS)
            if res.status_code == 200:
                print(f"User {email} already exists in Auth. Skipping.")
            else:
                post_url = f"{SUPABASE_URL}/auth/v1/admin/users"
                res = requests.post(post_url, headers=HEADERS, json=auth_payload)
                if res.status_code in [200, 201]:
                    print(f"Migrated Auth User: {email}")
                else:
                    print(f"Failed to migrate Auth User {email}: {res.text}")
        except Exception as e:
            print(f"Error migrating user {email}: {e}")

    print("\n--- Phase 2: Syncing Profiles ---")
    for user in users:
        profile_data = {
            "id": user['id'],
            "name": user['name'],
            "email": user['email'],
            "phone": user['phone'],
            "role": user['role'],
            "price_per_liter": float(user['price_per_liter'] or 60.0),
            "is_active": bool(user['is_active']),
            "address": user['address'],
            "daily_target_qty": float(user['daily_target_qty'] or 1.0),
            "language": user['language'] or 'en',
            "theme": user['theme'] or 'dark',
            "font_size": user['font_size'] or 'medium',
            "subscription_plan": user['subscription_plan'] or 'standard'
        }

        res = requests.post(
            f"{SUPABASE_URL}/rest/v1/profiles",
            headers=HEADERS,
            json=profile_data,
            params={"on_conflict": "id"}
        )
        if res.status_code in [200, 201]:
            print(f"Synced Profile: {user['name']}")
        else:
            print(f"Failed Profile sync for {user['name']}: {res.text}")

    print("\n--- Phase 3: Migrating Consumption ---")
    cursor.execute("SELECT * FROM consumption")
    records = cursor.fetchall()

    batch_size = 100
    for i in range(0, len(records), batch_size):
        batch = records[i:i+batch_size]
        payload = []
        for r in batch:
            payload.append({
                "id": r['id'],
                "user_id": r['user_id'],
                "date": r['date'],
                "quantity": float(r['quantity'] or 0.0),
                "extra_qty": float(r['extra_qty'] or 0.0),
                "status": r['status'],
                "locked": bool(r['locked']),
                "note": r['note'],
                "requested_quantity": (float(r['requested_quantity'])
                                       if r['requested_quantity'] else None),
                "requested_extra_qty": (float(r['requested_extra_qty'])
                                        if r['requested_extra_qty'] else None),
                "request_status": r['request_status'],
                "request_note": r['request_note'],
                "confirmed_by": r['confirmed_by']
            })

        res = requests.post(
            f"{SUPABASE_URL}/rest/v1/consumption",
            headers=HEADERS,
            json=payload,
            params={"on_conflict": "id"}
        )
        if res.status_code in [200, 201]:
            print(f"Migrated {len(payload)} consumption records...")
        else:
            print(f"Failed Consumption batch: {res.text}")

    print("\n--- Phase 4: Migrating Bills ---")
    cursor.execute("SELECT * FROM bills")
    bills = cursor.fetchall()

    for i in range(0, len(bills), batch_size):
        batch = bills[i:i+batch_size]
        payload = []
        for b in batch:
            payload.append({
                "id": b['id'],
                "user_id": b['user_id'],
                "month": b['month'],
                "total_liters": float(b['total_liters'] or 0.0),
                "total_amount": float(b['total_amount'] or 0.0),
                "status": b['status'],
                "pdf_url": b['pdf_url'],
                "is_locked": bool(b['is_locked']),
                "price_per_liter_snapshot": (float(b['price_per_liter_snapshot'])
                                             if b['price_per_liter_snapshot']
                                             else None),
                "line_items_json": (json.loads(b['line_items_json'])
                                    if b['line_items_json'] else None)
            })

        res = requests.post(
            f"{SUPABASE_URL}/rest/v1/bills",
            headers=HEADERS,
            json=payload,
            params={"on_conflict": "id"}
        )
        if res.status_code in [200, 201]:
            print(f"Migrated {len(payload)} bill records...")
        else:
            print(f"Failed Bills batch: {res.text}")

    print("\n--- Phase 5: Migrating Payments ---")
    cursor.execute("SELECT * FROM payments")
    payments = cursor.fetchall()

    for i in range(0, len(payments), batch_size):
        batch = payments[i:i+batch_size]
        payload = []
        for p in batch:
            payload.append({
                "id": p['id'],
                "user_id": p['user_id'],
                "bill_id": p['bill_id'],
                "amount": float(p['amount'] or 0.0),
                "method": p['method'],
                "status": p['status'],
                "transaction_ref": p['transaction_ref'],
                "notes": p['notes']
            })

        res = requests.post(
            f"{SUPABASE_URL}/rest/v1/payments",
            headers=HEADERS,
            json=payload,
            params={"on_conflict": "id"}
        )
        if res.status_code in [200, 201]:
            print(f"Migrated {len(payload)} payment records...")
        else:
            print(f"Failed Payments batch: {res.text}")

    print("\n--- Phase 6: Migrating Support Tickets ---")
    try:
        cursor.execute("SELECT * FROM support")
        tickets = cursor.fetchall()
        for i in range(0, len(tickets), batch_size):
            batch = tickets[i:i+batch_size]
            payload = []
            for t in batch:
                payload.append({
                    "id": t['id'],
                    "user_id": t['user_id'],
                    "subject": t['subject'],
                    "message": t['message'],
                    "status": t['status'],
                    "priority": t.get('priority', 'NORMAL')
                })

            res = requests.post(
                f"{SUPABASE_URL}/rest/v1/support_tickets",
                headers=HEADERS,
                json=payload,
                params={"on_conflict": "id"}
            )
            if res.status_code in [200, 201]:
                print(f"Migrated {len(payload)} support tickets...")
            else:
                print(f"Failed Support batch: {res.text}")
    except sqlite3.OperationalError:
        print("Legacy 'support' table not found. Skipping Phase 6.")

    conn.close()
    print("\n--- MIGRATION COMPLETE ---")


if __name__ == "__main__":
    migrate()
