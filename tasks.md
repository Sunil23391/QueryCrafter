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


======================================


Act as an expert full-stack developer specializing in FastAPI, React, and Python data science libraries. Modify the "QueryCrafter" application to add linear regression analytics directly to fetched SQL query results.

### Application Architecture
- Frontend: React (handles the UI for natural language prompts, generated SQL display, and results rendering).
- Backend: FastAPI (orchestrates the Ollama Gemma LLM pipeline for Text-to-SQL and interacts with a configured external API to fetch raw SQL query results).

### Objective
Enhance the frontend results view and the FastAPI backend to allow users to perform linear regression analysis on any two numeric columns from the returned SQL dataset.

### Core Requirements

1. Backend Analytics Endpoint (FastAPI):
   - Create a new POST endpoint `/api/analytics/regression` that accepts:
     * `data`: The raw JSON list of dictionaries (the fetched SQL result array).
     * `x_column`: The independent variable column name.
     * `y_column`: The dependent variable column name.
   - Use NumPy or scikit-learn (`LinearRegression`) to compute the line of best fit ($y = mx + c$).
   - Calculate the standard deviation ($\sigma$) of the residuals (or the dependent variable values).
   - Return the slope ($m$), intercept ($c$), standard deviation, and arrays of the plotted coordinates.
   - Provide a `pytest` file matching the backend standard to test this math logic against mock query result frames (including error cases for non-numeric types).

2. Frontend UI Modification (React):
   - Locate the component displaying the SQL data table.
   - Add two select elements/dropdown buttons to let users pick the X and Y axes. Dynamically filter these select elements to list ONLY columns containing numeric values.
   - Add a "Compute Regression" button.

3. Visualization Component (React):
   - When computed, render a scatter plot alongside the line of best fit using a charting library like Chart.js, Recharts, or Plotly.js.
   - Visually present the standard deviation on the graph (e.g., using dashed bounding lines, error bars, or a shaded overlay zone).

### Expected Output
Provide modular code patches for the React frontend, the new FastAPI endpoint, the NumPy/scikit-learn calculation module, and its corresponding pytest script.
