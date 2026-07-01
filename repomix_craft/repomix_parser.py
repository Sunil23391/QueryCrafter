import os
import subprocess
import shutil

def run_repomix_from_tree():
    # Target files located one level up in the project root
    file_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "file_structure.md"))
    target_output = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "repomix-output.xml"))

    # 1. Delete the previous output file if it exists
    if os.path.exists(target_output):
        try:
            os.remove(target_output)
            print(f"🧹 Deleted previous output file: {target_output}")
        except OSError as e:
            print(f"⚠️ Could not delete existing output: {e}")

    # 2. Check for the input file structure
    if not os.path.exists(file_path):
        print(f"❌ Error: The file '{file_path}' was not found.")
        return

    with open(file_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    paths = []
    stack = []

    # 3. Parse the tree structure
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith('<!--') or stripped.startswith('-->') or stripped.startswith('```'):
            continue

        clean_line = line.replace('├──', '│  ').replace('└──', '│  ')
        depth = clean_line.count('│  ')
        name = line.replace('├──', '').replace('└──', '').replace('│', '').strip()
        
        stack = stack[:depth]
        if stack:
            full_path = "/".join(stack) + "/" + name
        else:
            full_path = name 
            
        stack.append(name)

        if '.' in name:
            relative_path = "/".join(full_path.split('/')[1:])
            paths.append(relative_path)

    # 4. Construct the npx command (running from the root directory)
    include_str = ",".join(paths)
    command = f'npx repomix --include "{include_str}"'

    # 5. Execute or fallback print
    if shutil.which("npx"):
        print("🚀 Executing command via npx from project root...")
        try:
            # Change directory to project root temporarily to execute repomix correctly
            project_root = os.path.dirname(file_path)
            subprocess.run(command, shell=True, check=True, cwd=project_root)
        except subprocess.CalledProcessError:
            print(f"\n❌ Execution failed. Printing command instead:\n{command}")
    else:
        print("⚠️ npx is not installed. Printing command instead:\n")
        print(command)

if __name__ == "__main__":
    run_repomix_from_tree()
