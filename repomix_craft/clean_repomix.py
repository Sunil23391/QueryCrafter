import os
import re

def clean_repomix_spaces():
    # Setup paths relative to this script's location
    base_dir = os.path.dirname(__file__)
    input_file = os.path.abspath(os.path.join(base_dir, "..", "repomix-output.xml"))
    output_file = os.path.abspath(os.path.join(base_dir, "..", "repomix-output-cleaned.xml"))

    if not os.path.exists(input_file):
        print(f"❌ Error: {input_file} not found.")
        return

    print(f"🧹 Reading {input_file}...")
    with open(input_file, "r", encoding="utf-8") as f:
        content = f.read()

    pattern = re.compile(r'(<file path="([^"]+)">\n)(.*?)(</file>)', re.DOTALL)

    def process_block(match):
        header = match.group(1)
        file_path = match.group(2)
        code_content = match.group(3)
        footer = match.group(4)

        ext = file_path.split('.')[-1].lower() if '.' in file_path else ''

        if ext in ['js', 'jsx', 'ts', 'tsx']:
            lines = []
            for line in code_content.splitlines():
                cleaned_line = line.rstrip()
                leading_spaces = len(cleaned_line) - len(cleaned_line.lstrip())
                if cleaned_line.strip():
                    stripped_inner = re.sub(r'\s+', ' ', cleaned_line.lstrip())
                    lines.append(' ' * leading_spaces + stripped_inner)
            
            cleaned_code = '\n'.join(lines)
            cleaned_code = re.sub(r'\n\s*\n+', '\n', cleaned_code)
            return f"{header}{cleaned_code}\n{footer}"

        elif ext in ['html', 'htm']:
            cleaned_code = '\n'.join([line.rstrip() for line in code_content.splitlines() if line.strip()])
            cleaned_code = re.sub(r'>\s+<', '><', cleaned_code)
            cleaned_code = re.sub(r' +', ' ', cleaned_code)
            return f"{header}{cleaned_code}\n{footer}"

        else:
            return match.group(0)

    print("⚡ Compacting JavaScript and HTML whitespaces...")
    cleaned_content = pattern.sub(process_block, content)

    with open(output_file, "w", encoding="utf-8") as f:
        f.write(cleaned_content)

    old_size = len(content)
    new_size = len(cleaned_content)
    savings = ((old_size - new_size) / old_size) * 100

    print(f"✅ Success! Saved to {output_file}")
    print(f"📊 Character Reduction: {old_size:,} ➡️ {new_size:,} (-{savings:.1f}%)")

if __name__ == "__main__":
    clean_repomix_spaces()
