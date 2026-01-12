
import json

def update_data_js():
    with open('animal_stats.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    js_content = f"window.animalData = {json.dumps(data, indent=2, ensure_ascii=False)};"
    
    with open('data.js', 'w', encoding='utf-8') as f:
        f.write(js_content)
    
    print("Successfully updated data.js with content from animal_stats.json")

if __name__ == "__main__":
    update_data_js()
