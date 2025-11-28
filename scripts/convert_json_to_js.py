import json

try:
    with open('animal_stats.json', 'r', encoding='utf-8') as f:
        data = f.read()
        
    js_content = f"window.animalData = {data};"
    
    with open('data.js', 'w', encoding='utf-8') as f:
        f.write(js_content)
        
    print("Successfully created data.js")
except Exception as e:
    print(f"Error: {e}")
