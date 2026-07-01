from flask import Flask, render_template, request, jsonify
from ai_engine import generate_sql_tool_call
from services.api_connector import ApiConnector
from services.regression import compute_linear_regression
import uuid
import json

app = Flask(__name__)

# ------------------------------------------------------------------
# In-memory session store
# Replace with Redis/DB for production
# ------------------------------------------------------------------

sessions = {}
api_configs = {}


def _parse_headers(raw_value):
    if not raw_value:
        return []
    try:
        parsed = json.loads(raw_value)
        if isinstance(parsed, dict):
            return [{"key": str(k), "value": str(v)} for k, v in parsed.items()]
        if isinstance(parsed, list):
            return [{"key": str(item.get("key", "")), "value": str(item.get("value", ""))} for item in parsed if isinstance(item, dict)]
    except json.JSONDecodeError:
        pass

    headers = []
    for line in str(raw_value).splitlines():
        line = line.strip()
        if not line or ":" not in line:
            continue
        key, value = line.split(":", 1)
        headers.append({"key": key.strip(), "value": value.strip()})
    return headers


def _build_schema_ddl(columns):
    cols = ", ".join(f"{item['name']} TEXT" for item in columns)
    return f"CREATE TABLE imported_data ({cols});"


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api-configs", methods=["GET"])
def list_api_configs():
    return jsonify({"success": True, "configs": list(api_configs.values())})


@app.route("/api-configs", methods=["POST"])
def create_api_config():
    data = request.get_json() or {}
    config_id = data.get("id") or str(uuid.uuid4())
    config = {
        "id": config_id,
        "name": data.get("name", "").strip(),
        "endpoint": data.get("endpoint", "").strip(),
        "method": data.get("method", "GET").upper(),
        "headers": _parse_headers(data.get("headers", "")),
        "auth": data.get("auth", {}) or {},
        "body_template": data.get("body_template", "").strip(),
        "response_format": data.get("response_format", "auto")
    }

    if not config["name"] or not config["endpoint"]:
        return jsonify({"success": False, "error": "API name and endpoint are required."}), 400

    validation = ApiConnector(config).validate_connection()
    if not validation.get("success"):
        return jsonify({"success": False, "error": validation.get("error", "API validation failed.")}), 400

    api_configs[config_id] = config
    return jsonify({"success": True, "config": config})


@app.route("/api-configs/<config_id>", methods=["PUT"])
def update_api_config(config_id):
    data = request.get_json() or {}
    if config_id not in api_configs:
        return jsonify({"success": False, "error": "Config not found."}), 404

    config = api_configs[config_id]
    updated = {
        "id": config_id,
        "name": data.get("name", config["name"]).strip(),
        "endpoint": data.get("endpoint", config["endpoint"]).strip(),
        "method": data.get("method", config["method"]).upper(),
        "headers": _parse_headers(data.get("headers", json.dumps(config.get("headers", [])))),
        "auth": data.get("auth", config["auth"]) or {},
        "body_template": data.get("body_template", config["body_template"]).strip(),
        "response_format": data.get("response_format", config["response_format"])
    }

    validation = ApiConnector(updated).validate_connection()
    if not validation.get("success"):
        return jsonify({"success": False, "error": validation.get("error", "API validation failed.")}), 400

    api_configs[config_id] = updated
    return jsonify({"success": True, "config": updated})


@app.route("/api-configs/<config_id>", methods=["DELETE"])
def delete_api_config(config_id):
    if config_id not in api_configs:
        return jsonify({"success": False, "error": "Config not found."}), 404
    del api_configs[config_id]
    return jsonify({"success": True, "message": "Config deleted."})


@app.route("/api-configs/validate", methods=["POST"])
def validate_api_config():
    data = request.get_json() or {}
    config = {
        "name": data.get("name", "").strip(),
        "endpoint": data.get("endpoint", "").strip(),
        "method": data.get("method", "GET").upper(),
        "headers": data.get("headers", ""),
        "auth": data.get("auth", {}) or {},
        "body_template": data.get("body_template", "").strip(),
        "response_format": data.get("response_format", "auto")
    }

    if not config["endpoint"]:
        return jsonify({"success": False, "error": "Endpoint URL is required."}), 400

    connector = ApiConnector(config)
    return jsonify(connector.validate_connection())


@app.route("/api/analytics/regression", methods=["POST"])
def regression_analytics():
    data = request.get_json() or {}
    rows = data.get("data") or []
    x_column = data.get("x_column")
    y_column = data.get("y_column")

    if not x_column or not y_column:
        return jsonify({"success": False, "error": "x_column and y_column are required."}), 400

    try:
        result = compute_linear_regression(rows, x_column, y_column)
    except ValueError as exc:
        return jsonify({"success": False, "error": str(exc)}), 400

    return jsonify(result)


@app.route("/api-configs/<config_id>/preview", methods=["POST"])
def preview_api_data(config_id):
    if config_id not in api_configs:
        return jsonify({"success": False, "error": "Config not found."}), 404

    data = request.get_json() or {}
    sql_query = data.get("query", "").strip()
    if not sql_query:
        return jsonify({"success": False, "error": "SQL query is required."}), 400

    connector = ApiConnector(api_configs[config_id])
    result = connector.execute(sql_query)
    return jsonify(result)


@app.route("/api-configs/<config_id>/import", methods=["POST"])
def import_api_data(config_id):
    if config_id not in api_configs:
        return jsonify({"success": False, "error": "Config not found."}), 404

    data = request.get_json() or {}
    sql_query = data.get("query", "").strip()
    if not sql_query:
        return jsonify({"success": False, "error": "SQL query is required."}), 400

    connector = ApiConnector(api_configs[config_id])
    result = connector.execute(sql_query)
    if not result.get("success"):
        return jsonify(result), 400

    rows = result.get("rows", [])
    inferred_schema = []
    if rows:
        for key in rows[0].keys():
            inferred_schema.append({
                "name": key,
                "type": "string"
            })

    ddl_schema = _build_schema_ddl(inferred_schema)

    session_id = data.get("session_id")
    if session_id and session_id in sessions:
        sessions[session_id]["schema"] = ddl_schema
        sessions[session_id]["api_import"] = {
            "config_id": config_id,
            "rows": rows,
            "schema": inferred_schema
        }

    return jsonify({
        "success": True,
        "message": "Data imported successfully.",
        "rows": rows,
        "schema": inferred_schema,
        "ddl": ddl_schema
    })


# ------------------------------------------------------------------
# Load Schema (Only Once)
# ------------------------------------------------------------------

@app.route("/schema", methods=["POST"])
def load_schema():

    data = request.get_json()

    schema = data.get("schema", "").strip()
    domain = data.get("domain", "General").strip()

    if not schema:
        return jsonify({
            "success": False,
            "error": "Schema is required."
        }), 400

    session_id = str(uuid.uuid4())

    sessions[session_id] = {
        "schema": schema,
        "domain": domain,
        "history": []
    }

    return jsonify({
        "success": True,
        "session_id": session_id,
        "message": "Schema loaded successfully."
    })


# ------------------------------------------------------------------
# Chat Endpoint
# ------------------------------------------------------------------

@app.route("/chat", methods=["POST"])
def chat():

    data = request.get_json()

    session_id = data.get("session_id")
    question = data.get("question", "").strip()

    if not session_id:
        return jsonify({
            "success": False,
            "error": "Missing session_id."
        }), 400

    if session_id not in sessions:
        return jsonify({
            "success": False,
            "error": "Invalid or expired session."
        }), 404

    if not question:
        return jsonify({
            "success": False,
            "error": "Question is required."
        }), 400

    session = sessions[session_id]

    result = generate_sql_tool_call(
        schema=session["schema"],
        history=session["history"],
        question=question,
        domain=session["domain"]
    )

    if result["success"]:

        session["history"].append({
            "user": question,
            "assistant": result["assistant"]
        })

        result["history_length"] = len(session["history"])

    return jsonify(result)


# ------------------------------------------------------------------
# View Conversation (Optional)
# Useful for debugging
# ------------------------------------------------------------------

@app.route("/history/<session_id>", methods=["GET"])
def history(session_id):

    if session_id not in sessions:
        return jsonify({
            "success": False,
            "error": "Session not found."
        }), 404

    return jsonify({
        "success": True,
        "history": sessions[session_id]["history"]
    })


# ------------------------------------------------------------------
# Reset Conversation
# Keeps schema but clears chat
# ------------------------------------------------------------------

@app.route("/reset/<session_id>", methods=["POST"])
def reset(session_id):

    if session_id not in sessions:
        return jsonify({
            "success": False,
            "error": "Session not found."
        }), 404

    sessions[session_id]["history"] = []

    return jsonify({
        "success": True,
        "message": "Conversation reset."
    })


# ------------------------------------------------------------------
# Delete Session
# Removes schema + history
# ------------------------------------------------------------------

@app.route("/session/<session_id>", methods=["DELETE"])
def delete_session(session_id):

    if session_id not in sessions:
        return jsonify({
            "success": False,
            "error": "Session not found."
        }), 404

    del sessions[session_id]

    return jsonify({
        "success": True,
        "message": "Session deleted."
    })


# ------------------------------------------------------------------

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )