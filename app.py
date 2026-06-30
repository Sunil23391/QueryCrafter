from flask import Flask, render_template, request, jsonify
from ai_engine import generate_sql_tool_call
import uuid

app = Flask(__name__)

# ------------------------------------------------------------------
# In-memory session store
# Replace with Redis/DB for production
# ------------------------------------------------------------------

sessions = {}


@app.route("/")
def index():
    return render_template("index.html")


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