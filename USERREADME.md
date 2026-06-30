# User Guide

This guide explains how to use QueryCrafter and how to create a simple API connector with a minimal example.

## Quick Start

1. Activate the environment:
   ```bash
   source .venv/bin/activate
   ```
2. Start the app:
   ```bash
   python app.py
   ```
3. Open the browser at:
   ```text
   http://127.0.0.1:5000/
   ```
4. Paste a schema, click Load Schema, and start asking questions.

## 1. Start the application

1. Open the project folder.
2. Activate the Python environment:
   ```bash
   source .venv/bin/activate
   ```
3. Start the app:
   ```bash
   python app.py
   ```
4. Open your browser at:
   ```text
   http://127.0.0.1:5000/
   ```

## 2. Load a schema

Before asking questions, you need a schema.

1. Paste your database schema in the schema box.
2. Optional: choose a domain.
3. Click Load Schema.

Once loaded, the app starts a session where you can ask SQL questions.

## 3. Ask questions in chat

After the schema is loaded:

1. Type a question such as:
   ```text
   Show me the active users
   ```
2. Press Enter or click Send.
3. The app will generate SQL and show the reasoning.

## 4. Create an API connector

You can also import data from an external API into the current session.

### Minimal example

Suppose you want to connect to a public JSON API.

1. In the API Configuration section, click the button to add a new config.
2. Fill in the fields:
   - Name: Example API
   - Endpoint URL: https://jsonplaceholder.typicode.com/posts
   - Method: GET
   - Response Format: auto
3. Leave Authentication Required unchecked if the API does not need authentication.
4. Click Save.

### Preview the data

1. Click Preview for the saved API config.
2. Enter a sample query such as:
   ```text
   SELECT *
   ```
3. The app will display a preview of the parsed response.

### Import the data

1. Click Import.
2. Enter a sample query such as:
   ```text
   SELECT *
   ```
3. The system will infer a table structure from the returned rows and generate DDL.

## 5. Payload format

The app can send a request body to the API. Use the Body Template field to define the payload.

### Example JSON payload

```json
{"query": "SELECT *"}
```

When you preview or import data, the app sends the SQL query you enter as the `query` field in a JSON request body.

For example, if you enter:

```text
SELECT *
```

the final payload becomes:

```json
{"query": "SELECT *"}
```

## 6. Add authentication (optional)

If the API requires authentication:

1. Check Authentication Required.
2. Choose the auth type:
   - Bearer Token
   - API Key
   - Basic Auth
3. Enter the required values.
4. Save or validate the configuration.

## 7. Example with headers

If your API needs custom headers, add them in the headers field using this format:

```text
Accept: application/json
X-API-Key: my-key
```

## 8. Tips

- Use simple endpoints first when testing.
- Start with JSON APIs because they are supported out of the box.
- Validate the connection before importing data.
- If the API returns CSV, the app can also parse it.

## 9. Troubleshooting

If something does not work:

- Check that the endpoint URL is correct.
- Make sure the API is reachable from your environment.
- Confirm the authentication fields are filled correctly.
- Try Preview before importing.
