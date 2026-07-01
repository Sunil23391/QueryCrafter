import os
import argparse

# Import core workflow functions from your existing script files
from repomix_parser import run_repomix_from_tree
from clean_repomix import clean_repomix_spaces
from chunk_file import split_file_into_chunks

def execute_full_pipeline(chunk_size):
    print("=" * 60)
    print("🚀 STARTING REPOMIX PIPELINE AUTOMATION")
    print("=" * 60)

    # Step 1: Run the initial parser to build repomix-output.xml
    print("\n[STEP 1/3] Parsing file tree and generating repomix target...")
    run_repomix_from_tree()

    # Step 2: Remove unnecessary horizontal spacing from JS and HTML layout components
    print("\n[STEP 2/3] Cleaning extra whitespace from JS and HTML...")
    clean_repomix_spaces()

    # Step 3: Split the resulting clean XML output file into custom-sized chunks
    print("\n[STEP 3/3] Slicing layout into indentation-safe file chunks...")
    split_file_into_chunks(chunk_size=chunk_size)

    print("\n" + "=" * 60)
    print("🎉 ALL STAGES COMPLETED SUCCESSFULLY!")
    print(f"📁 Check the 'repomix_chunks' folder in your project root.")
    print("=" * 60)

if __name__ == "__main__":
    # Maintain argument parsing capabilities so you can still feed custom sizes
    parser = argparse.ArgumentParser(description="Run full Repomix automation pipeline: Parse, Clean, and Chunk.")
    parser.add_argument(
        '-s', '--size', 
        type=int, 
        default=50000, 
        help="The character limit size for each chunk slice (default is 50000)."
    )
    args = parser.parse_args()

    execute_full_pipeline(chunk_size=args.size)
