import json
import re
import time
import ollama

TOOL_SCHEMA = {
    "name": "generate_sql_query",
    "description": "Generates a SQL query based on schema and natural language question.",
    "parameters": {
        "type": "object",
        "properties": {
            "sql_query": {"type": "string", "description": "The valid SQL query string."},
            "reasoning": {"type": "string", "description": "Brief explanation of the logic."}
        },
        "required": ["sql_query"]
    }
}

def clean_and_parse_json(raw_text: str) -> dict:
    """
    Cleans raw text using advanced regex to find and parse JSON structures.
    """
    cleaned = raw_text.strip()
    
    # 1. Remove standard markdown blocks if present
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()
    
    # 2. Try direct parsing first
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # 3. Regex Fallback: Extract the largest substring between the first '{' and last '}'
    match = re.search(r'(\{.*\}).*', cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
            
    # 4. Secondary Regex Fallback: Balance braces to handle trailing garbage text
    braces_match = re.finditer(r'\{|\}', cleaned)
    start_idx = -1
    count = 0
    for m in braces_match:
        if m.group() == '{':
            if count == 0:
                start_idx = m.start()
            count += 1
        elif m.group() == '}':
            count -= 1
            if count == 0 and start_idx != -1:
                try:
                    return json.loads(cleaned[start_idx:m.end()])
                except json.JSONDecodeError:
                    continue
                    
    raise json.JSONDecodeError("Failed to isolate valid JSON structure.", raw_text, 0)

def generate_sql_tool_call(schema: str, question: str, domain: str = "General", max_retries: int = 3):
    """
    Formats the prompt via system messages, forces JSON output, and uses a retry loop 
    with regex extraction to guarantee a valid output schema.
    """
    tool_schema_json = json.dumps(TOOL_SCHEMA, indent=2)
    
    # Use proper system instruction separation
    system_prompt = (
        "You are a database expert. Your sole function is to output valid JSON text "
        f"matching this schema configuration:\n{tool_schema_json}\n"
        "Do not include any conversational filler, markdown codeblocks, or extra text."
    )
    
    user_prompt = (
        f"[Domain]\n{domain}\n\n"
        f"[Database Context]\n{schema}\n\n"
        f"[Question]\n{question}\n\n"
        "Fill out the schema completely. The field 'sql_query' is strictly required."
    )

    messages = [
        {'role': 'system', 'content': system_prompt},
        {'role': 'user', 'content': user_prompt}
    ]

    last_error = ""
    raw_response = ""
    
    # Retry Loop with Exponential Backoff
    for attempt in range(max_retries):
        try:
            if attempt > 0:
                # Add brief pause before retrying
                time.sleep(1.5 ** attempt)
                
            response = ollama.chat(
                model="lfm2.5-thinking:latest", 
                messages=messages,
                format="json",  # Hardware/Engine constraint level forcing
                options={
                    "temperature": 0.1 + (attempt * 0.15),  # Escalate temperature slightly on failure to break loops
                    "top_p": 0.9
                }
            )
            
            raw_response = response['message']['content']
            parsed_data = clean_and_parse_json(raw_response)
            
            # Normalize variations in keys (handles wrapped structures vs flat structures)
            if "tool_call" in parsed_data:
                arguments = parsed_data["tool_call"].get("arguments", {})
            elif "arguments" in parsed_data:
                arguments = parsed_data["arguments"]
            else:
                arguments = parsed_data

            if "sql_query" in arguments and arguments.get("sql_query"):
                return {
                    "success": True,
                    "sql_query": arguments["sql_query"],
                    "reasoning": arguments.get("reasoning", "No reasoning provided."),
                    "attempts_used": attempt + 1,
                    "raw_json": raw_response
                }
            else:
                last_error = "Missing or empty required field: 'sql_query'"
                
        except json.JSONDecodeError as jde:
            last_error = f"JSON parsing failed: {str(jde)}"
        except Exception as e:
            last_error = f"Ollama connection or execution error: {str(e)}"

    # If all retry attempts are exhausted
    return {
        "success": False,
        "error": f"Failed after {max_retries} attempts. Last error: {last_error}",
        "raw_json": raw_response
    }
