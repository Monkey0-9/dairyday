
import json
import os
import glob
import copy

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def recursive_merge(source, target):
    """
    Merge source dictionary into target dictionary.
    Keys missing in target are added from source.
    """
    changed = False
    for key, value in source.items():
        if key not in target:
            print(f"    Adding missing key: {key}")
            target[key] = copy.deepcopy(value)
            changed = True
        elif isinstance(value, dict) and isinstance(target[key], dict):
            if recursive_merge(value, target[key]):
                changed = True
    return changed

def main():
    en_path = "c:/dairy/frontend/messages/en.json"
    print(f"Loading source: {en_path}")
    en_data = load_json(en_path)
    
    if "Admin" not in en_data:
        print("Error: Admin namespace missing in en.json")
        return

    admin_source = en_data["Admin"]
    
    files = glob.glob("c:/dairy/frontend/messages/*.json")
    for file_path in files:
        if file_path.endswith("en.json"):
            continue
            
        print(f"Processing {file_path}...")
        try:
            target_data = load_json(file_path)
        except Exception as e:
            print(f"  Error reading {file_path}: {e}")
            continue

        if "Admin" not in target_data:
            target_data["Admin"] = {}
        
        changed = recursive_merge(admin_source, target_data["Admin"])
        
        if changed:
            save_json(file_path, target_data)
            print(f"  Synced and saved {file_path}")
        else:
            print(f"  No missing Admin keys in {file_path}")

if __name__ == "__main__":
    main()
