import json
import ollama

# The exact tool schema used during training
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

def generate_sql_tool_call(schema: str, question: str, domain: str = "General"):
    """
    Formats the prompt exactly as trained, calls the model, and parses the JSON tool call.
    """
    
    # 1. Construct the exact prompt format from the training notebook
    tool_schema_json = json.dumps(TOOL_SCHEMA, indent=2)
    
    full_prompt = (
        "<start_of_turn>user\n"
        "You are a database expert with access to the following tool:\n"
        f"{tool_schema_json}\n\n"
        f"[Domain]\n{domain}\n\n"
        f"[Database Context]\n{schema}\n\n"
        f"[Question]\n{question}\n\n"
        "If the question requires data retrieval, use the 'generate_sql_query' tool. "
        "Respond ONLY with a JSON object containing the tool call.<end_of_turn>\n"
        "<start_of_turn>model\n"
    )

    try:
        # 2. Call Ollama (Change "sql-gemma-toolcall" to your actual model name)
        response = ollama.chat(
            model="lfm2.5-thinking:latest",  # <--- UPDATE THIS TO YOUR MODEL NAME
            messages=[
                {'role': 'user', 'content': full_prompt}
            ],
            options={
                "temperature": 0.1,
                "top_p": 0.9
            }
        )
        print('----')
        print('----')
        print(response['message'])
        
        print('----')
        print('----')
        
        raw_response = response['message']['content'].strip()
        
        # 3. Parse the JSON Tool Call
        # Clean up potential markdown artifacts if the model hallucinates them
        if raw_response.startswith("```json"):
            raw_response = raw_response[7:]
        if raw_response.endswith("```"):
            raw_response = raw_response[:-3]
        raw_response = raw_response.strip()
        
        parsed_data = json.loads(raw_response)
        
        # Extract the SQL and reasoning from the tool call structure
        if "tool_call" in parsed_data and parsed_data["tool_call"]["name"] == "generate_sql_query":
            arguments = parsed_data["tool_call"]["arguments"]
            return {
                "success": True,
                "sql_query": arguments.get("sql_query", ""),
                "reasoning": arguments.get("reasoning", "No reasoning provided."),
                "raw_json": raw_response
            }
        else:
            return {
                "success": False,
                "error": "Model did not return the expected tool_call structure.",
                "raw_json": raw_response
            }

    except json.JSONDecodeError:
        return {
            "success": False,
            "error": "Model output was not valid JSON.",
            "raw_json": raw_response
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"An error occurred: {str(e)}",
            "raw_json": ""
        }