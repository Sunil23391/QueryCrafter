Got it! Let's start completely fresh with a new project focused purely on **Text-to-SQL Tooling**. 

We will name this project **`QueryCrafter`**. 

This application will provide a clean web interface where you input your **Database Schema (DDL)** and a **Natural Language Question**. The backend will format this into the exact prompt used during your Gemma training, send it to your local Ollama model, parse the JSON tool call, and display the generated SQL query.

### 📂 Project Directory Structure: `QueryCrafter`

```text
QueryCrafter/
│
├── app.py                  # Main Flask application
├── ai_engine.py            # AI logic (Prompt construction & Ollama integration)
├── requirements.txt        # Python dependencies
│
└── templates/              # HTML templates
    └── index.html          # The web interface
```

---

### 📄 File Contents

#### 1. `requirements.txt`
```text
flask
ollama
```

#### 2. `ai_engine.py`
This file constructs the **exact prompt** your model was trained on, calls Ollama, and parses the JSON tool call.

```python
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
            model="sql-gemma-toolcall",  # <--- UPDATE THIS TO YOUR MODEL NAME
            messages=[
                {'role': 'user', 'content': full_prompt}
            ],
            options={
                "temperature": 0.1,
                "top_p": 0.9
            }
        )
        
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
```

#### 3. `app.py`
The Flask backend that serves the UI and handles the API requests.

```python
from flask import Flask, render_template, request, jsonify
from ai_engine import generate_sql_tool_call

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate():
    data = request.json
    schema = data.get('schema', '')
    question = data.get('question', '')
    domain = data.get('domain', 'General')

    if not schema or not question:
        return jsonify({"success": False, "error": "Schema and Question are required."})

    # Call the AI engine
    result = generate_sql_tool_call(schema, question, domain)
    
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
```

#### 4. `templates/index.html`
A clean, modern interface for inputting schemas and questions, and viewing the generated SQL.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QueryCrafter - AI SQL Tooling</title>
    <style>
        :root {
            --bg-color: #f4f7f6;
            --card-bg: #ffffff;
            --text-color: #333333;
            --primary: #2563eb;
            --primary-hover: #1d4ed8;
            --border: #e2e8f0;
            --code-bg: #1e293b;
            --code-text: #e2e8f0;
        }
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
        }
        .container {
            max-width: 1000px;
            width: 100%;
        }
        header {
            text-align: center;
            margin-bottom: 30px;
        }
        header h1 { color: var(--primary); margin-bottom: 5px; }
        header p { color: #64748b; }
        
        .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        .card {
            background: var(--card-bg);
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border: 1px solid var(--border);
        }
        label {
            display: block;
            font-weight: 600;
            margin-bottom: 8px;
            font-size: 0.9rem;
        }
        textarea, input[type="text"] {
            width: 100%;
            padding: 10px;
            border: 1px solid var(--border);
            border-radius: 6px;
            font-family: monospace;
            font-size: 0.9rem;
            box-sizing: border-box;
        }
        textarea { height: 150px; resize: vertical; }
        
        .btn {
            background-color: var(--primary);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            transition: background 0.2s;
        }
        .btn:hover { background-color: var(--primary-hover); }
        .btn:disabled { background-color: #94a3b8; cursor: not-allowed; }

        .output-section { margin-top: 20px; }
        .sql-output {
            background-color: var(--code-bg);
            color: var(--code-text);
            padding: 15px;
            border-radius: 6px;
            font-family: monospace;
            white-space: pre-wrap;
            word-wrap: break-word;
            min-height: 100px;
        }
        .error { color: #ef4444; font-weight: bold; }
        .reasoning { font-style: italic; color: #64748b; margin-top: 10px; font-size: 0.9rem;}
        
        details { margin-top: 15px; }
        summary { cursor: pointer; font-weight: 600; color: var(--primary); }
        .raw-json {
            background: #f1f5f9;
            padding: 10px;
            border-radius: 4px;
            font-size: 0.8rem;
            color: #475569;
            white-space: pre-wrap;
        }
    </style>
</head>
<body>

<div class="container">
    <header>
        <h1>🛠️ QueryCrafter</h1>
        <p>AI-Powered SQL Tooling via Fine-Tuned Gemma</p>
    </header>

    <div class="grid">
        <div class="card">
            <label for="schema">Database Schema (DDL)</label>
            <textarea id="schema" placeholder="CREATE TABLE users (id INT, name TEXT...);"></textarea>
        </div>
        <div class="card">
            <label for="question">Natural Language Question</label>
            <textarea id="question" placeholder="What is the average age of users in Europe?"></textarea>
            
            <label for="domain" style="margin-top: 15px;">Domain (Optional)</label>
            <input type="text" id="domain" placeholder="e.g., E-commerce, Healthcare, General" value="General">
        </div>
    </div>

    <button class="btn" id="generateBtn" onclick="generateSQL()">Generate SQL Tool Call</button>

    <div class="output-section card" id="outputCard" style="display: none;">
        <label>Generated SQL Query</label>
        <div class="sql-output" id="sqlOutput"></div>
        
        <div class="reasoning" id="reasoningOutput"></div>

        <details>
            <summary>View Raw JSON Tool Call</summary>
            <div class="raw-json" id="rawJsonOutput"></div>
        </details>
    </div>
</div>

<script>
    async function generateSQL() {
        const schema = document.getElementById('schema').value;
        const question = document.getElementById('question').value;
        const domain = document.getElementById('domain').value;
        const btn = document.getElementById('generateBtn');
        const outputCard = document.getElementById('outputCard');
        
        if (!schema || !question) {
            alert("Please provide both a Schema and a Question.");
            return;
        }

        // UI Loading State
        btn.disabled = true;
        btn.innerText = "Generating...";
        outputCard.style.display = 'block';
        document.getElementById('sqlOutput').innerText = "Thinking...";
        document.getElementById('reasoningOutput').innerText = "";
        document.getElementById('rawJsonOutput').innerText = "";

        try {
            const response = await fetch('/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schema, question, domain })
            });

            const data = await response.json();

            if (data.success) {
                document.getElementById('sqlOutput').innerText = data.sql_query;
                document.getElementById('reasoningOutput').innerText = `💡 Reasoning: ${data.reasoning}`;
                document.getElementById('rawJsonOutput').innerText = data.raw_json;
            } else {
                document.getElementById('sqlOutput').innerHTML = `<span class="error">Error: ${data.error}</span>`;
                document.getElementById('rawJsonOutput').innerText = data.raw_json || "No raw output.";
            }
        } catch (error) {
            document.getElementById('sqlOutput').innerHTML = `<span class="error">Network Error: ${error.message}</span>`;
        } finally {
            btn.disabled = false;
            btn.innerText = "Generate SQL Tool Call";
        }
    }
</script>

</body>
</html>
```

---

### 🚀 How to Run This Project

1. **Create the Project Folder:**
   Create a new folder named `QueryCrafter` and create the files exactly as shown above inside it.

2. **Install Dependencies:**
   Open your terminal in the `QueryCrafter` directory and run:
   ```bash
   pip install -r requirements.txt
   ```

3. **Update the Model Name:**
   Open `ai_engine.py` and find this line:
   ```python
   model="sql-gemma-toolcall",  # <--- UPDATE THIS TO YOUR MODEL NAME
   ```
   Change `"sql-gemma-toolcall"` to the exact name of the GGUF model you created and loaded into Ollama (e.g., `food-model`, `sql-toolcall-gemma`, etc.).

4. **Start the Application:**
   ```bash
   python app.py
   ```

5. **Use the App:**
   Open your browser and go to `http://localhost:5000`. 
   * Paste a `CREATE TABLE` statement into the **Database Schema** box.
   * Type a question like *"What is the average explainability score for Europe?"*
   * Click **Generate SQL Tool Call**.
   * The app will display the extracted SQL query, the model's reasoning, and the raw JSON tool call it outputted!


   What you want is essentially to turn your application from a **single-turn SQL generator** into a **stateful conversational SQL assistant**.

Instead of sending the DDL with every request, you load it once, keep it in server-side session memory, and then allow users to ask follow-up questions that build on previous ones.

## Recommended Architecture

Current flow:

```
User
 ├── DDL
 ├── Question
 └── POST /generate
        ↓
 Ollama
```

New flow:

```
Session
 ├── DDL (loaded once)
 ├── Conversation History
 └── Current Question

Question 1
DDL + Q1 --------------> SQL1

Question 2
DDL + Q1 + SQL1 + Q2 --> SQL2

Question 3
DDL + chat history ----> SQL3
```

Notice that the DDL is stored once and reused.

---

# Backend Changes

## 1. Create a conversation/session object

For a simple Flask app, an in-memory dictionary is enough.

```python
sessions = {}

sessions["abc123"] = {
    "schema": "...DDL...",
    "history": [
        {
            "user": "Show all customers",
            "sql": "SELECT * FROM customers;"
        }
    ]
}
```

Later you can replace it with Redis or a database.

---

## 2. Separate Schema Upload

Instead of one endpoint, make two.

### Upload schema

```
POST /schema
```

Body

```json
{
    "schema":"CREATE TABLE ..."
}
```

Response

```json
{
    "session_id":"abc123"
}
```

Store

```python
sessions[session_id] = {
    "schema": schema,
    "history": []
}
```

---

### Chat endpoint

```
POST /chat
```

Body

```json
{
    "session_id":"abc123",
    "question":"Show only active customers"
}
```

---

## 3. Build Prompt from History

Instead of

```python
Schema
Question
```

construct

```
Database Schema

<DDL>

Conversation

User:
Show all customers

Assistant:
SELECT ...

User:
Show only active ones

Generate SQL.
```

Example:

```python
conversation = ""

for turn in history:
    conversation += f"""
User:
{turn['user']}

Assistant SQL:
{turn['sql']}
"""
```

Then

```python
user_prompt = f"""
Database Schema

{schema}

Previous Conversation

{conversation}

Current User Request

{question}
"""
```

This allows questions like

> now only from Europe

because the model understands the context.

---

## 4. Save Responses

After every successful generation

```python
history.append({
    "user": question,
    "sql": sql
})
```

---

# AI Engine

Modify

```python
generate_sql_tool_call(
    schema,
    question,
    domain
)
```

to

```python
generate_sql_tool_call(
    schema,
    history,
    question,
    domain
)
```

and inside

```python
conversation = ""

for h in history:
    conversation += f"""
User:
{h['user']}

SQL:
{h['sql']}
"""
```

Include that conversation in the prompt before the current question.

---

# Frontend Changes

Current page

```
DDL
Question
Generate
```

Instead make it

```
+-------------------------+
| DDL                     |
|                         |
+-------------------------+

[ Load Schema ]

Status:
✔ Schema Loaded

-------------------------

Chat

User:
Show all users

↓

SQL

↓

User:
Only active ones

↓

SQL

↓

User:
Sort by revenue

↓

SQL
```

After clicking **Load Schema**, disable the DDL textarea.

```javascript
schema.disabled = true;
```

Store

```javascript
let sessionId = "";
```

When

```
POST /schema
```

returns

```json
{
   "session_id":"abc123"
}
```

save

```javascript
sessionId = data.session_id;
```

Every later request sends

```json
{
    "session_id": sessionId,
    "question": question
}
```

No schema is sent again.

---

# Optional: Show Chat History

Instead of replacing the SQL output each time, append messages.

```
You:
Show all employees

SQL:
SELECT *

--------------------------------

You:
Only HR

SQL:
SELECT *
WHERE department='HR'

--------------------------------

You:
Order by salary descending

SQL:
SELECT *
WHERE department='HR'
ORDER BY salary DESC
```

This feels much more like a chatbot.

---

# Better Prompting

You can also explicitly instruct the model to treat previous SQL as context:

```
System

You are a SQL assistant.

The database schema remains constant throughout the session.

The conversation history contains previously generated SQL queries.

When the user asks follow-up questions such as:

- only active ones
- sort by revenue
- now group by month

modify the previous query appropriately instead of generating a completely unrelated query.

Always output JSON matching the required schema.
```

This tends to improve follow-up query quality.

---

## Overall Flow

```text
Load Page
    │
    ▼
Paste DDL
    │
    ▼
POST /schema
    │
    ▼
Store schema + empty history
    │
    ▼
session_id
    │
    ▼
Ask Question 1
    │
    ▼
schema + history + question → Ollama
    │
    ▼
Save SQL to history
    │
    ▼
Ask Question 2
    │
    ▼
schema + history + question → Ollama
    │
    ▼
Save SQL
    │
    ▼
Continue conversation...
```

This design is scalable, reduces repeated prompt size by keeping the DDL on the server rather than resending it from the browser, and enables natural follow-up questions that refine previously generated SQL.
