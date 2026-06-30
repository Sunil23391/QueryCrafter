Modify the application to support dynamic API-based database connections.

Add a new configuration section where users can create and manage multiple API connection configurations. Each configuration should include:

API Name
API Endpoint URL
HTTP Method (GET/POST)
Required headers (optional)
Authentication details (Bearer Token, API Key, or Basic Auth)
Request body template (if applicable)
Response format (Auto Detect / JSON / CSV)

After selecting an API configuration, the application should:

Allow the user to enter an SQL query.
Send the SQL query to the configured API according to its required request format.
Receive the response, which may be in either JSON or CSV format.
Automatically detect and parse the response format.
Infer the schema from the returned data (column names and data types).
Automatically create a corresponding table within the application using the inferred schema.
Import all returned records into the newly created table.
Handle errors gracefully for invalid SQL, failed API requests, authentication issues, malformed responses, or unsupported formats.

Additional requirements:

Users should be able to save, edit, delete, and reuse multiple API configurations.
Validate API connectivity before saving a configuration.
Display a preview of the returned data before creating the table.
Support both JSON arrays of objects and CSV files with headers.
Ensure the implementation is modular so that additional response formats (e.g., XML or Parquet) can be added in the future without major code changes.
Maintain backward compatibility with the existing database connection workflow. The new API-based connection should be an additional option, not a replacement.