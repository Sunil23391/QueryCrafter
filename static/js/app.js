let sessionId = null;

// ------------------------------------------------------------
// Load Schema
// ------------------------------------------------------------

async function loadSchema() {
    const schema = document.getElementById("schema").value.trim();
    const domain = document.getElementById("domain").value.trim();

    if (!schema) {
        alert("Please enter a database schema.");
        return;
    }

    const btn = document.getElementById("loadBtn");
    btn.disabled = true;
    btn.innerText = "Loading...";

    try {
        const response = await fetch("/schema", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                schema,
                domain
            })
        });

        const data = await response.json();

        if (!data.success) {
            alert(data.error);
            btn.disabled = false;
            btn.innerText = "Load Schema";
            return;
        }

        sessionId = data.session_id;

        document.getElementById("schema").disabled = true;
        document.getElementById("domain").disabled = true;

        document.getElementById("schemaStatus").innerHTML = "✅ Schema Loaded";
        document.getElementById("schemaStatus").className = "status success";

        document.getElementById("mainLayout").classList.add("session-active");

        btn.innerText = "Loaded";
    } catch (err) {
        alert(err.message);
        btn.disabled = false;
        btn.innerText = "Load Schema";
    }
}

// ------------------------------------------------------------
// Send Question
// ------------------------------------------------------------

async function sendQuestion() {
    if (sessionId == null) {
        alert("Load schema first.");
        return;
    }

    const textarea = document.getElementById("question");
    const question = textarea.value.trim();

    if (question === "") return;

    appendUser(question);
    textarea.value = "";

    const loading = document.createElement("div");
    loading.className = "loading";
    loading.id = "loading";
    loading.innerHTML = "Thinking...";

    document.getElementById("chatBox").appendChild(loading);
    scrollBottom();

    document.getElementById("sendBtn").disabled = true;

    try {
        const response = await fetch("/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                session_id: sessionId,
                question: question
            })
        });

        const data = await response.json();

        document.getElementById("loading").remove();

        if (data.success) {
            appendAssistant(
                data.assistant.sql_query,
                data.assistant.reasoning,
                data.attempts_used
            );
        } else {
            appendAssistant("ERROR", data.error, 0);
        }
    } catch (err) {
        document.getElementById("loading").remove();
        appendAssistant("Network Error", err.message, 0);
    }

    document.getElementById("sendBtn").disabled = false;
}

// ------------------------------------------------------------
// User Bubble
// ------------------------------------------------------------

function appendUser(message) {
    const div = document.createElement("div");
    div.className = "message user";
    div.innerHTML = `
        <div class="bubble">
        ${escapeHtml(message)}
        </div>
    `;

    document.getElementById("chatBox").appendChild(div);
    scrollBottom();
}

// ------------------------------------------------------------
// Assistant Bubble
// ------------------------------------------------------------

function appendAssistant(sql, reasoning, attempts) {
    const div = document.createElement("div");
    div.className = "message assistant";
    div.innerHTML = `
        <div>
            <strong>Generated SQL</strong>
            <div class="sql">
${escapeHtml(sql)}
            </div>
            <div class="reasoning">
💡 ${escapeHtml(reasoning)}
            </div>
            <div style="font-size:12px;color:#999;margin-top:8px;">
Attempts: ${attempts}
            </div>
        </div>
    `;

    document.getElementById("chatBox").appendChild(div);
    scrollBottom();
}

// ------------------------------------------------------------
// Reset Conversation
// ------------------------------------------------------------

async function resetConversation() {
    if (sessionId == null) return;

    await fetch("/reset/" + sessionId, {
        method: "POST"
    });

    document.getElementById("chatBox").innerHTML = "";
}

// ------------------------------------------------------------
// New Session
// ------------------------------------------------------------

function newSession() {
    sessionId = null;

    document.getElementById("schema").disabled = false;
    document.getElementById("domain").disabled = false;
    document.getElementById("schema").value = "";
    document.getElementById("domain").value = "General";
    document.getElementById("chatBox").innerHTML = "";

    document.getElementById("mainLayout").classList.remove("session-active");

    document.getElementById("schemaStatus").innerHTML = "No schema loaded.";
    document.getElementById("schemaStatus").className = "status";

    const btn = document.getElementById("loadBtn");
    btn.disabled = false;
    btn.innerText = "Load Schema";
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function scrollBottom() {
    const box = document.getElementById("chatBox");
    box.scrollTop = box.scrollHeight;
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

document.getElementById("question").addEventListener("keypress", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendQuestion();
    }
});
