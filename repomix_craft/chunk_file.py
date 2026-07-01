import os
import shutil
import argparse

def split_file_into_chunks(chunk_size=50000):
    base_dir = os.path.dirname(__file__)
    
    # Define paths for both cleaned and raw versions in the project root
    cleaned_file = os.path.abspath(os.path.join(base_dir, "..", "repomix-output-cleaned.xml"))
    raw_file = os.path.abspath(os.path.join(base_dir, "..", "repomix-output.xml"))
    output_folder = os.path.abspath(os.path.join(base_dir, "..", "repomix_chunks"))

    # 1. Prioritise the cleaned file, fallback to the raw file if missing
    if os.path.exists(cleaned_file):
        input_file = cleaned_file
        print(f"✨ Found cleaned file. Processing: {os.path.basename(input_file)}")
    elif os.path.exists(raw_file):
        input_file = raw_file
        print(f"⚠️ Cleaned file not found. Falling back to raw file: {os.path.basename(input_file)}")
    else:
        print(f"❌ Error: Neither '{os.path.basename(cleaned_file)}' nor '{os.path.basename(raw_file)}' was found in the root directory.")
        return

    # 2. Reset the output folder to ensure a clean state
    if os.path.exists(output_folder):
        try:
            shutil.rmtree(output_folder)
            print(f"季度 Cleared old folder: {output_folder}")
        except OSError as e:
            print(f"⚠️ Could not completely clear {output_folder}: {e}")
            
    os.makedirs(output_folder, exist_ok=True)

    # 3. Read the selected file content safely
    with open(input_file, "r", encoding="utf-8") as f:
        content = f.read()

    chunks = []
    current_pos = 0
    total_len = len(content)

    # 4. Process file content by newline-safe chunks
    while current_pos < total_len:
        end_pos = current_pos + chunk_size
        
        # If remaining text fits inside one chunk, finalize the split
        if end_pos >= total_len:
            chunks.append(content[current_pos:])
            break
        
        # Search backward for a newline to preserve Python code indentation lines
        newline_pos = content.rfind('\n', current_pos, end_pos)
        if newline_pos > current_pos:
            end_pos = newline_pos + 1  # Include the newline character in the current chunk
            
        chunks.append(content[current_pos:end_pos])
        current_pos = end_pos

    total_chunks = len(chunks)
    print(f"📦 Successfully parsed file into {total_chunks} parts (Max size: {chunk_size} chars per chunk).")

    # 5. Write out the structured text files inside the dedicated directory
    for i, chunk_data in enumerate(chunks, 1):
        chunk_filename = f"repomix_chunk_{i}_of_{total_chunks}.txt"
        chunk_path = os.path.join(output_folder, chunk_filename)
        
        with open(chunk_path, "w", encoding="utf-8") as chunk_file:
            # Header instructions block
            if i < total_chunks:
                chunk_file.write(f"⚠️ [CHUNK {i}/{total_chunks}]: please donot read this yet wait for the last chunk before processing\n")
                chunk_file.write("=" * 80 + "\n\n")
            else:
                chunk_file.write(f"✅ [FINAL CHUNK {i}/{total_chunks}]: All code parts are fully uploaded. You can now safely process everything!\n")
                chunk_file.write("=" * 80 + "\n\n")
            
            # Write raw content with perfect space preservation
            chunk_file.write(chunk_data)
            
        print(f"📄 Created text block: {chunk_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Split cleaned repomix output XML file into indentation-safe text chunks.")
    parser.add_argument('-s', '--size', type=int, default=50000, help="The character limit size for each chunk slice.")
    args = parser.parse_args()
    
    split_file_into_chunks(chunk_size=args.size)
