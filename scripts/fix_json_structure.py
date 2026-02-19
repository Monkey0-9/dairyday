
import json
import os
import glob

def fix_json(file_path):
    print(f"Processing {file_path}...")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return

    changed = False

    # Ensure Admin exists
    if "Admin" not in data:
        data["Admin"] = {}
        changed = True

    # Move AdminBills -> Admin.bills
    if "AdminBills" in data:
        print("  Moving AdminBills to Admin.bills")
        data["Admin"]["bills"] = data.pop("AdminBills")
        changed = True
    
    # Move AdminPayments -> Admin.payments
    if "AdminPayments" in data:
        print("  Moving AdminPayments to Admin.payments")
        data["Admin"]["payments"] = data.pop("AdminPayments")
        changed = True

    # Move AdminCustomers -> Admin.customers
    if "AdminCustomers" in data:
        print("  Moving AdminCustomers to Admin.customers")
        data["Admin"]["customers"] = data.pop("AdminCustomers")
        changed = True

    # Note: AdminSupport might be needed if I added it as independent key previously
    if "AdminSupport" in data:
         print("  Moving AdminSupport to Admin.support")
         data["Admin"]["support"] = data.pop("AdminSupport")
         changed = True

    if changed:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"  Saved changes to {file_path}")
    else:
        print("  No changes needed.")

# Process all message files
files = glob.glob("c:/dairy/frontend/messages/*.json")
for file in files:
    fix_json(file)
