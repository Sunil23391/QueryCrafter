import json
import uuid

from flask import Flask, jsonify, render_template, request

from ai_engine import generate_sql_tool_call
from conversation_service import (
    add_message,
    conversation_history,
    conversation_summary,
    create_conversation,
    clear_conversation_messages,
    delete_conversation,
    delete_message,
    ensure_session,
    get_conversation,
    get_session_or_404,
    list_conversations,
    list_messages,
    message_dto,
    session_dto,
    set_active_conversation,
    utcnow,
    update_conversation,
    update_message,
)
from database import get_db, init_db
from models import ChatMessage
from services.api_connector import ApiConnector
from services.regression import compute_linear_regression

app = Flask(__name__)

# ------------------------------------------------------------------
# Database initialization
# ------------------------------------------------------------------

init_db()


# ------------------------------------------------------------------
# In-memory API config store
# ------------------------------------------------------------------

api_configs = {}


def _parse_headers(raw_value):
    if not raw_value:
        return []
    try:
        parsed = json.loads(raw_value)
        if isinstance(parsed, dict):
            return [{"key": str(k), "value": str(v)} for k, v in parsed.items()]
        if isinstance(parsed, list):
            return [
                {"key": str(item.get("key", "")), "value": str(item.get("value", ""))}
                for item in parsed
                if isinstance(item, dict)
            ]
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


def _conversation_payload(conversation):
    return conversation_summary(conversation) if conversation else None


def _conversation_or_404(db, session_id, conversation_id):
    conversation = get_conversation(db, session_id, conversation_id)
    if not conversation:
        return None, (jsonify({"success": False, "error": "Conversation not found."}), 404)
    return conversation, None


@app.route("/")
def index():
    return render_template("index.html")


# ------------------------------------------------------------------
# Session and conversation APIs
# ------------------------------------------------------------------


@app.route("/sessions/<session_id>", methods=["GET"])
def get_session(session_id):
    with get_db() as db:
        session = get_session_or_404(db, session_id)
        if not session:
            return jsonify({"success": False, "error": "Session not found."}), 404

        active = None
        if session.last_active_conversation_id:
            active = get_conversation(db, session.id, session.last_active_conversation_id)
        elif session.conversations:
            active = session.conversations[0]

        return jsonify({"success": True, "session": session_dto(session, active)})


@app.route("/sessions/<session_id>", methods=["PATCH"])
def update_session(session_id):
    data = request.get_json() or {}
    with get_db() as db:
        session = get_session_or_404(db, session_id)
        if not session:
            return jsonify({"success": False, "error": "Session not found."}), 404

        active_conversation_id = data.get("active_conversation_id")
        if active_conversation_id:
            conversation = set_active_conversation(db, session_id, active_conversation_id)
            if not conversation:
                return jsonify({"success": False, "error": "Conversation not found."}), 404

        active = None
        if session.last_active_conversation_id:
            active = get_conversation(db, session.id, session.last_active_conversation_id)
        elif session.conversations:
            active = session.conversations[0]

        return jsonify({"success": True, "session": session_dto(session, active)})


@app.route("/sessions/<session_id>/conversations", methods=["GET"])
def session_conversations(session_id):
    q = request.args.get("q", "").strip() or None
    limit = min(int(request.args.get("limit", 50)), 100)
    offset = max(int(request.args.get("offset", 0)), 0)

    with get_db() as db:
        session = get_session_or_404(db, session_id)
        if not session:
            return jsonify({"success": False, "error": "Session not found."}), 404

        conversations = list_conversations(db, session_id, query=q, limit=limit, offset=offset)
        return jsonify(
            {
                "success": True,
                "conversations": [conversation_summary(item) for item in conversations],
                "active_conversation_id": session.last_active_conversation_id,
            }
        )


@app.route("/sessions/<session_id>/conversations", methods=["POST"])
def create_session_conversation(session_id):
    data = request.get_json() or {}
    clone_from_active = bool(data.get("clone_from_active", False))
    title = data.get("title")
    schema = data.get("schema", "")
    domain = data.get("domain", "General")
    api_config_id = data.get("api_config_id")

    with get_db() as db:
        session = ensure_session(db, session_id)
        clone_from = None
        if clone_from_active and session.last_active_conversation_id:
            clone_from = get_conversation(db, session.id, session.last_active_conversation_id)

        conversation = create_conversation(
            db,
            session.id,
            title=title,
            schema=schema,
            domain=domain,
            api_config_id=api_config_id,
            clone_from=clone_from,
        )
        return jsonify({"success": True, "conversation": conversation_summary(conversation)})


@app.route("/sessions/<session_id>/conversations/<conversation_id>", methods=["GET"])
def get_session_conversation(session_id, conversation_id):
    with get_db() as db:
        conversation, error = _conversation_or_404(db, session_id, conversation_id)
        if error:
            return error
        return jsonify({"success": True, "conversation": conversation_summary(conversation)})


@app.route("/sessions/<session_id>/conversations/<conversation_id>", methods=["PATCH"])
def patch_session_conversation(session_id, conversation_id):
    data = request.get_json() or {}
    with get_db() as db:
        conversation, error = _conversation_or_404(db, session_id, conversation_id)
        if error:
            return error

        updated = update_conversation(
            db,
            session_id,
            conversation_id,
            title=data.get("title", conversation.title),
            schema=data.get("schema", conversation.schema),
            domain=data.get("domain", conversation.domain),
            api_config_id=data.get("api_config_id", conversation.api_config_id),
        )
        return jsonify({"success": True, "conversation": conversation_summary(updated)})


@app.route("/sessions/<session_id>/conversations/<conversation_id>", methods=["DELETE"])
def delete_session_conversation(session_id, conversation_id):
    with get_db() as db:
        if not delete_conversation(db, session_id, conversation_id):
            return jsonify({"success": False, "error": "Conversation not found."}), 404
        return jsonify({"success": True, "message": "Conversation deleted."})


@app.route("/sessions/<session_id>/conversations/<conversation_id>/messages", methods=["GET"])
def session_conversation_messages(session_id, conversation_id):
    limit = min(int(request.args.get("limit", 100)), 500)
    offset = max(int(request.args.get("offset", 0)), 0)
    with get_db() as db:
        conversation, messages = list_messages(db, session_id, conversation_id, limit=limit, offset=offset)
        if not conversation:
            return jsonify({"success": False, "error": "Conversation not found."}), 404
        return jsonify({"success": True, "messages": [message_dto(item) for item in messages]})


@app.route("/sessions/<session_id>/conversations/<conversation_id>/messages", methods=["POST"])
def add_session_conversation_message(session_id, conversation_id):
    data = request.get_json() or {}
    role = (data.get("role") or "user").strip()
    content = (data.get("content") or "").strip()
    with get_db() as db:
        conversation, error = _conversation_or_404(db, session_id, conversation_id)
        if error:
            return error
        message = add_message(
            db,
            session_id,
            conversation.id,
            role=role,
            content=content,
            sql_query=data.get("sql_query"),
            reasoning=data.get("reasoning"),
            attempts_used=data.get("attempts_used"),
        )
        return jsonify({"success": True, "message": message_dto(message)})


@app.route("/messages/<message_id>", methods=["PATCH"])
def patch_message(message_id):
    data = request.get_json() or {}
    with get_db() as db:
        message = update_message(
            db,
            data.get("session_id"),
            message_id,
            content=data.get("content"),
            sql_query=data.get("sql_query"),
            reasoning=data.get("reasoning"),
            attempts_used=data.get("attempts_used"),
        )
        if not message:
            return jsonify({"success": False, "error": "Message not found."}), 404
        return jsonify({"success": True, "message": message_dto(message)})


@app.route("/messages/<message_id>", methods=["DELETE"])
def remove_message(message_id):
    data = request.get_json(silent=True) or {}
    with get_db() as db:
        if not delete_message(db, data.get("session_id"), message_id):
            return jsonify({"success": False, "error": "Message not found."}), 404
        return jsonify({"success": True, "message": "Message deleted."})


# ------------------------------------------------------------------
# Legacy compatibility endpoints
# ------------------------------------------------------------------


@app.route("/schema", methods=["POST"])
def load_schema():
    data = request.get_json() or {}
    schema = (data.get("schema") or "").strip()
    domain = (data.get("domain") or "General").strip()
    session_id = data.get("session_id")
    conversation_id = data.get("conversation_id")

    if not schema:
        return jsonify({"success": False, "error": "Schema is required."}), 400

    with get_db() as db:
        session = ensure_session(db, session_id)
        conversation = None
        if conversation_id:
            conversation = get_conversation(db, session.id, conversation_id)
        if not conversation and session.last_active_conversation_id:
            conversation = get_conversation(db, session.id, session.last_active_conversation_id)
        if not conversation:
            conversation = create_conversation(db, session.id, schema=schema, domain=domain)
        else:
            conversation = update_conversation(
                db,
                session.id,
                conversation.id,
                schema=schema,
                domain=domain,
            )

        session.last_active_conversation_id = conversation.id
        session.updated_at = utcnow()

        return jsonify(
            {
                "success": True,
                "session_id": session.id,
                "conversation_id": conversation.id,
                "conversation": conversation_summary(conversation),
                "message": "Schema loaded successfully.",
            }
        )


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json() or {}
    session_id = data.get("session_id")
    conversation_id = data.get("conversation_id")
    question = (data.get("question") or "").strip()

    if not session_id:
        return jsonify({"success": False, "error": "Missing session_id."}), 400
    if not question:
        return jsonify({"success": False, "error": "Question is required."}), 400

    with get_db() as db:
        session = get_session_or_404(db, session_id)
        if not session:
            return jsonify({"success": False, "error": "Invalid or expired session."}), 404

        conversation = None
        if conversation_id:
            conversation = get_conversation(db, session_id, conversation_id)
        if not conversation and session.last_active_conversation_id:
            conversation = get_conversation(db, session_id, session.last_active_conversation_id)
        if not conversation and session.conversations:
            conversation = session.conversations[0]
        if not conversation:
            return jsonify({"success": False, "error": "Load schema first."}), 400

        _, history = conversation_history(db, session_id, conversation.id)
        result = generate_sql_tool_call(
            schema=conversation.schema,
            history=history,
            question=question,
            domain=conversation.domain,
        )

        add_message(db, session_id, conversation.id, role="user", content=question)
        if result.get("success"):
            assistant = result["assistant"]
            add_message(
                db,
                session_id,
                conversation.id,
                role="assistant",
                content="",
                sql_query=assistant.get("sql_query", ""),
                reasoning=assistant.get("reasoning", ""),
                attempts_used=result.get("attempts_used", 1),
            )
        else:
            add_message(
                db,
                session_id,
                conversation.id,
                role="assistant",
                content="",
                sql_query="ERROR",
                reasoning=result.get("error", "Unknown error"),
                attempts_used=0,
            )

        session.last_active_conversation_id = conversation.id
        session.updated_at = utcnow()
        result["history_length"] = len(history) + 1
        result["conversation_id"] = conversation.id
        result["session_id"] = session.id
        return jsonify(result)


@app.route("/history/<session_id>", methods=["GET"])
def history(session_id):
    with get_db() as db:
        session = get_session_or_404(db, session_id)
        if not session:
            return jsonify({"success": False, "error": "Session not found."}), 404
        conversation = None
        if session.last_active_conversation_id:
            conversation = get_conversation(db, session_id, session.last_active_conversation_id)
        elif session.conversations:
            conversation = session.conversations[0]
        if not conversation:
            return jsonify({"success": True, "history": []})
        _, history_items = conversation_history(db, session_id, conversation.id)
        return jsonify({"success": True, "history": history_items})


@app.route("/reset/<session_id>", methods=["POST"])
def reset(session_id):
    with get_db() as db:
        session = get_session_or_404(db, session_id)
        if not session:
            return jsonify({"success": False, "error": "Session not found."}), 404

        conversation = None
        if session.last_active_conversation_id:
            conversation = get_conversation(db, session_id, session.last_active_conversation_id)
        elif session.conversations:
            conversation = session.conversations[0]
        if not conversation:
            return jsonify({"success": True, "message": "Conversation reset."})

        clear_conversation_messages(db, session_id, conversation.id)
        return jsonify({"success": True, "message": "Conversation reset."})


@app.route("/session/<session_id>", methods=["DELETE"])
def delete_session(session_id):
    with get_db() as db:
        session = get_session_or_404(db, session_id)
        if not session:
            return jsonify({"success": False, "error": "Session not found."}), 404
        db.delete(session)
        return jsonify({"success": True, "message": "Session deleted."})


# ------------------------------------------------------------------
# Existing API config routes
# ------------------------------------------------------------------


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
        "response_format": data.get("response_format", "auto"),
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
        "response_format": data.get("response_format", config["response_format"]),
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
        "response_format": data.get("response_format", "auto"),
    }

    if not config["endpoint"]:
        return jsonify({"success": False, "error": "Endpoint URL is required."}), 400

    connector = ApiConnector(config)
    return jsonify(connector.validate_connection())


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
            inferred_schema.append({"name": key, "type": "string"})

    ddl_schema = _build_schema_ddl(inferred_schema)

    session_id = data.get("session_id")
    if session_id:
        with get_db() as db:
            session = get_session_or_404(db, session_id)
            if session and session.last_active_conversation_id:
                conversation = get_conversation(db, session_id, session.last_active_conversation_id)
                if conversation:
                    conversation.schema = ddl_schema
                    conversation.updated_at = utcnow()

    return jsonify(
        {
            "success": True,
            "message": "Data imported successfully.",
            "rows": rows,
            "schema": inferred_schema,
            "ddl": ddl_schema,
        }
    )


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


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
