# QueryCrafter

QueryCrafter is a Flask-based web app that helps users load a database schema, chat with an LLM to generate SQL, and optionally import data from API endpoints into the session context.

## Features

- Load a database schema and start a SQL conversation session
- Generate SQL queries from natural-language questions
- View chat history and reasoning for generated SQL
- Create and manage multiple API connection configurations
- Validate API connections before saving
- Preview API responses before import
- Import API data into the current session as inferred table DDL
- Support authentication for API requests
- Parse JSON and CSV API responses

## Project Structure

- app.py: Flask backend routes for schema loading, chat, and API config management
- ai_engine.py: LLM-driven SQL generation flow
- services/api_connector.py: API request execution and response parsing
- templates/index.html: Main UI template
- static/css/styles.css: Application styling
- static/js/app.js: Frontend logic for chat, schema loading, and API config UI
- tests/: Unit and regression tests

## Installation

1. Create and activate a virtual environment
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. Install dependencies
   ```bash
   pip install -r requirements.txt
   ```

3. Start the app
   ```bash
   python app.py
   ```

4. Open the app in your browser
   ```text
   http://127.0.0.1:5000/
   ```

## Usage

### 1. Load a schema
- Enter a database schema in the schema area.
- Choose a domain if needed.
- Click Load Schema to start a session.

### 2. Chat with the SQL assistant
- Type a natural-language question in the chat box.
- The app sends the schema and conversation context to the model.
- The response includes generated SQL and reasoning.

### 3. Manage API connectors
- Open the API configuration section.
- Add a new API config with endpoint, method, headers, body template, and response format.
- Use Validate to test the endpoint.
- Use Preview to inspect parsed API data.
- Use Import to bring API data into the current session.

## API Configuration Options

Each API configuration can include:
- Name
- Endpoint URL
- HTTP method
- Headers
- Request body template
- Response format
- Authentication settings

Authentication supports:
- None
- Bearer token
- API key
- Basic auth

## Testing

Run the unit tests with:

```bash
source .venv/bin/activate && python -m unittest discover -s tests -p 'test_*.py'
```

Run the frontend regression test with:

```bash
node --test tests/app.test.js
```

## Notes

- The app currently stores sessions and configs in memory.
- For production use, you may want to replace in-memory storage with a database or cache.
