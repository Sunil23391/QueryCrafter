import json
import re
import time
import ollama

TOOL_SCHEMA = {
    "name": "generate_sql_query",
    "description": "Generate a SQL query from a natural language request.",
    "parameters": {
        "type": "object",
        "properties": {
            "sql_query": {
                "type": "string",
                "description": "The SQL query."
            },
            "reasoning": {
                "type": "string",
                "description": "Short explanation."
            }
        },
        "required": [
            "sql_query"
        ]
    }
}


def clean_and_parse_json(raw_text: str):
    """
    Attempts to recover valid JSON even if the model adds
    markdown or extra text.
    """

    text = raw_text.strip()

    if text.startswith("```json"):
        text = text[7:]

    elif text.startswith("```"):
        text = text[3:]

    if text.endswith("```"):
        text = text[:-3]

    text = text.strip()

    try:
        return json.loads(text)
    except:
        pass

    match = re.search(r"\{.*\}", text, re.DOTALL)

    if match:
        return json.loads(match.group())

    raise ValueError("Unable to parse JSON")


def build_conversation(history):
    """
    Converts previous conversation into prompt context.
    """

    if not history:
        return "No previous conversation."

    conversation = []

    for i, turn in enumerate(history, start=1):

        assistant = turn.get("assistant", {})

        conversation.append(
            f"""
Conversation {i}

User:
{turn.get("user","")}

Generated SQL:
{assistant.get("sql_query","")}

Reasoning:
{assistant.get("reasoning","")}
""".strip()
        )

    return "\n\n".join(conversation)


def generate_sql_tool_call(
        schema,
        history,
        question,
        domain="General",
        max_retries=3
):
    """
    Conversational SQL generation.

    schema  -> stored once
    history -> previous prompts
    question -> latest user prompt
    """

    tool_schema = json.dumps(TOOL_SCHEMA, indent=2)

    conversation = build_conversation(history)

    system_prompt = f"""
You are an expert SQL engineer.

The database schema NEVER changes during this conversation.

The user may ask follow-up questions like:

- only active users
- now sort descending
- include country
- group by month

These refer to previous generated SQL.

Always use the conversation history.

Return ONLY valid JSON.

Schema:

{tool_schema}

Do not use markdown.

Do not explain outside JSON.
"""

    user_prompt = f"""
Domain

{domain}

==========================
DATABASE SCHEMA
==========================

{schema}

==========================
PREVIOUS CONVERSATION
==========================

{conversation}

==========================
CURRENT USER REQUEST
==========================

{question}

Generate the SQL.

Return JSON only.
"""

    messages = [
        {
            "role": "system",
            "content": system_prompt
        },
        {
            "role": "user",
            "content": user_prompt
        }
    ]

    raw_response = ""
    last_error = ""

    for attempt in range(max_retries):

        try:

            if attempt > 0:
                time.sleep(1.5 ** attempt)

            response = ollama.chat(
                model="gemma4:e2b",
                # model="smollm:latest",
                messages=messages,
                format="json",
                options={
                    "temperature": 0.1 + attempt * 0.15,
                    "top_p": 0.9
                }
            )

            raw_response = response["message"]["content"]

            parsed = clean_and_parse_json(raw_response)

            if "tool_call" in parsed:
                arguments = parsed["tool_call"].get("arguments", {})

            elif "arguments" in parsed:
                arguments = parsed["arguments"]

            else:
                arguments = parsed

            sql = arguments.get("sql_query")

            if not sql:
                raise ValueError("sql_query missing")

            reasoning = arguments.get(
                "reasoning",
                "No reasoning provided."
            )

            return {
                "success": True,
                "assistant": {
                    "sql_query": sql,
                    "reasoning": reasoning
                },
                "attempts_used": attempt + 1,
                "raw_json": raw_response
            }

        except Exception as e:

            last_error = str(e)

    return {
        "success": False,
        "error": last_error,
        "raw_json": raw_response
    }