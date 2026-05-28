import os

data_dir = 'data'
for f in os.listdir(data_dir):
    if f.endswith('.json'):
        asset_key = f[:-5]
        js_file = os.path.join(data_dir, f"{asset_key}.js")
        with open(os.path.join(data_dir, f), 'r', encoding='utf-8') as json_file:
            content = json_file.read()
        with open(js_file, 'w', encoding='utf-8') as js_out:
            js_out.write(f"window.data_{asset_key} = {content};")
print("Converted all JSON to JS!")
