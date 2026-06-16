import json
import os
from jinja2 import Environment, FileSystemLoader

def main():
    print("Executing Python Static Site compiler...")
    
    # 1. Paths
    data_path = "projects.json"
    template_dir = "templates"
    output_path = "index.html"
    
    # 2. Read data
    if not os.path.exists(data_path):
        print(f"  Error: Metadata file {data_path} not found.")
        return
        
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    # 3. Setup Jinja2 Environment
    if not os.path.exists(template_dir):
        print(f"  Error: Templates folder {template_dir} not found.")
        return
        
    env = Environment(loader=FileSystemLoader(template_dir))
    template = env.get_template("index.html")
    
    # 4. Render and Write
    print("  Rendering template with projects data...")
    rendered_html = template.render(data)
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(rendered_html)
        
    print(f"  SUCCESS: Generated {output_path} successfully.")

if __name__ == "__main__":
    main()
