let sessionId = null;
let activeApiConfigId = null;
let apiConfigs = [];

function toggleAuth() {
    const authRequired = document.getElementById("authRequired").checked;
    const authSection = document.getElementById("authSection");
    const headersSection = document.getElementById("headersSection");
    authSection.classList.toggle("hidden", !authRequired);
    headersSection.classList.toggle("hidden", !authRequired);
    if (!authRequired) {
        document.getElementById("apiAuthType").value = "none";
        document.getElementById("authFields").innerHTML = "";
    } else {
        renderAuthFields();
    }
}

function renderAuthFields() {
    const authType = document.getElementById("apiAuthType").value;
    const container = document.getElementById("authFields");
    container.innerHTML = "";

    if (authType === "bearer") {
        container.innerHTML = `
            <label>Bearer Token</label>
            <input id="authToken" type="text" placeholder="Token">
        `;
    } else if (authType === "api_key") {
        container.innerHTML = `
            <label>Header Name</label>
            <input id="authKeyName" type="text" placeholder="X-API-Key">
            <label>Header Value</label>
            <input id="authKeyValue" type="text" placeholder="API Key">
        `;
    } else if (authType === "basic") {
        container.innerHTML = `
            <label>Username</label>
            <input id="authUsername" type="text" placeholder="username">
            <label>Password</label>
            <input id="authPassword" type="password" placeholder="password">
        `;
    }
}

function showApiConfigForm() {
    document.getElementById("apiConfigForm").classList.remove("hidden");
    document.getElementById("authRequired").checked = false;
    document.getElementById("apiAuthType").value = "none";
    document.getElementById("authFields").innerHTML = "";
    document.getElementById("headersSection").classList.add("hidden");
    toggleAuth();
}

function cancelApiConfigForm() {
    document.getElementById("apiConfigForm").classList.add("hidden");
    document.getElementById("apiConfigForm").reset();
    document.getElementById("authRequired").checked = false;
    document.getElementById("apiAuthType").value = "none";
    document.getElementById("authSection").classList.add("hidden");
    document.getElementById("headersSection").classList.add("hidden");
    document.getElementById("authFields").innerHTML = "";
    activeApiConfigId = null;
}

function getApiFormData() {
    return {
        id: activeApiConfigId,
        name: document.getElementById("apiName").value.trim(),
        endpoint: document.getElementById("apiEndpoint").value.trim(),
        method: document.getElementById("apiMethod").value,
        headers: document.getElementById("apiHeaders").value.trim(),
        body_template: document.getElementById("apiBodyTemplate").value.trim(),
        response_format: document.getElementById("apiResponseFormat").value,
        auth: getAuthData()
    };
}

function getAuthData() {
    const authRequired = document.getElementById("authRequired").checked;
    if (!authRequired) {
        return { required: false, type: "none" };
    }

    const type = document.getElementById("apiAuthType").value;
    if (type === "bearer") {
        return { required: true, type, token: document.getElementById("authToken")?.value || "" };
    }
    if (type === "api_key") {
        return {
            required: true,
            type,
            key_name: document.getElementById("authKeyName")?.value || "",
            key_value: document.getElementById("authKeyValue")?.value || ""
        };
    }
    if (type === "basic") {
        return {
            required: true,
            type,
            username: document.getElementById("authUsername")?.value || "",
            password: document.getElementById("authPassword")?.value || ""
        };
    }
    return { required: true, type: "none" };
}

async function saveApiConfig() {
    const payload = getApiFormData();
    if (!payload.name || !payload.endpoint) {
        alert("Please provide an API name and endpoint.");
        return;
    }

    const url = payload.id ? `/api-configs/${payload.id}` : "/api-configs";
    const method = payload.id ? "PUT" : "POST";

    const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!data.success) {
        alert(data.error || "Unable to save API config.");
        return;
    }

    await loadApiConfigs();
    cancelApiConfigForm();
    document.getElementById("apiImportStatus").innerHTML = "✅ API configuration saved.";
    document.getElementById("apiImportStatus").className = "status success";
}

async function validateApiConfig() {
    const payload = getApiFormData();
    if (!payload.name || !payload.endpoint) {
        alert("Please provide an API name and endpoint.");
        return;
    }

    const url = payload.id ? `/api-configs/${payload.id}/validate` : "/api-configs/validate";
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    const data = await response.json();

    document.getElementById("apiImportStatus").innerHTML = data.success ? "✅ API connection validated." : `❌ ${data.error}`;
    document.getElementById("apiImportStatus").className = data.success ? "status success" : "status error";
}

async function loadApiConfigs() {
    const response = await fetch("/api-configs");
    const data = await response.json();
    apiConfigs = data.configs || [];
    renderApiConfigs();
}

function renderApiConfigs() {
    const list = document.getElementById("apiConfigList");
    if (!apiConfigs.length) {
        list.innerHTML = "<p>No API configurations yet.</p>";
        return;
    }

    list.innerHTML = apiConfigs.map(config => `
        <div class="api-item">
            <strong>${escapeHtml(config.name)}</strong>
            <div>${escapeHtml(config.endpoint)}</div>
            <div>${escapeHtml(config.method)}</div>
            <div class="controls">
                <button type="button" onclick="editApiConfig('${config.id}')">Edit</button>
                <button type="button" onclick="previewApiConfig('${config.id}')">Preview</button>
                <button type="button" onclick="deleteApiConfig('${config.id}')">Delete</button>
            </div>
        </div>
    `).join("");
}

async function editApiConfig(id) {
    const config = apiConfigs.find(item => item.id === id);
    if (!config) return;
    activeApiConfigId = config.id;
    document.getElementById("apiName").value = config.name || "";
    document.getElementById("apiEndpoint").value = config.endpoint || "";
    document.getElementById("apiMethod").value = config.method || "GET";
    document.getElementById("apiHeaders").value = (config.headers || []).map(item => `${item.key}: ${item.value}`).join("\n");
    document.getElementById("apiBodyTemplate").value = config.body_template || "";
    document.getElementById("apiResponseFormat").value = config.response_format || "auto";

    const auth = config.auth || {};
    const authRequired = auth.required !== undefined ? Boolean(auth.required) : auth.type !== "none";
    document.getElementById("authRequired").checked = authRequired;
    document.getElementById("apiAuthType").value = auth.type || "none";
    toggleAuth();

    if (authRequired && auth.type === "bearer") {
        document.getElementById("authToken").value = auth.token || "";
    } else if (authRequired && auth.type === "api_key") {
        document.getElementById("authKeyName").value = auth.key_name || "";
        document.getElementById("authKeyValue").value = auth.key_value || "";
    } else if (authRequired && auth.type === "basic") {
        document.getElementById("authUsername").value = auth.username || "";
        document.getElementById("authPassword").value = auth.password || "";
    }
    showApiConfigForm();
}

async function deleteApiConfig(id) {
    const response = await fetch(`/api-configs/${id}`, { method: "DELETE" });
    const data = await response.json();
    if (data.success) {
        await loadApiConfigs();
    }
}

async function previewApiConfig(id) {
    const query = prompt("Enter a SQL-like query to preview the API response", "SELECT *");
    if (!query) return;

    const previewBox = document.getElementById("apiPreview");
    previewBox.classList.remove("hidden");
    previewBox.innerHTML = "Loading preview...";

    const response = await fetch(`/api-configs/${id}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query })
    });
    const data = await response.json();

    if (!data.success) {
        previewBox.innerHTML = `<div class="error">${escapeHtml(data.error || "Preview failed")}</div>`;
        return;
    }

    previewBox.innerHTML = `
        <h4>Preview</h4>
        <div>Format: ${escapeHtml(data.format || "unknown")}</div>
        <pre>${escapeHtml(JSON.stringify(data.preview, null, 2))}</pre>
    `;
}

async function previewSqlWithApi(sql, configId = null, targetContainer = null) {
    if (!sql) return;

    const availableConfigs = (typeof window !== "undefined" && window.apiConfigs)
        || (typeof globalThis !== "undefined" && globalThis.apiConfigs)
        || apiConfigs;
    const config = availableConfigs.find(item => item.id === configId) || (!configId ? availableConfigs[0] : null);
    if (!config) {
        document.getElementById("apiImportStatus").innerHTML = "⚠️ Create an API configuration first.";
        document.getElementById("apiImportStatus").className = "status error";
        return;
    }

    const previewBox = document.getElementById("apiPreview");
    previewBox.classList.remove("hidden");
    previewBox.innerHTML = "Loading preview...";

    try {
        const response = await fetch(`/api-configs/${config.id}/preview`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: sql })
        });
        const data = await response.json();

        const previewHtml = `
            <h4>Preview</h4>
            <div>Format: ${escapeHtml(data.format || "unknown")}</div>
            <pre>${escapeHtml(JSON.stringify(data.preview, null, 2))}</pre>
        `;

        if (targetContainer) {
            targetContainer.innerHTML = previewHtml;
            targetContainer.className = "preview-result";
        }

        if (!data.success) {
            previewBox.innerHTML = `<div class="error">${escapeHtml(data.error || "Preview failed")}</div>`;
            return;
        }

        previewBox.innerHTML = previewHtml;
    } catch (err) {
        const errorHtml = `<div class="error">${escapeHtml(err.message || "Preview failed")}</div>`;
        if (targetContainer) {
            targetContainer.innerHTML = errorHtml;
            targetContainer.className = "preview-result";
        }
        previewBox.innerHTML = errorHtml;
    }
}

async function importApiConfig(id) {
    const query = prompt("Enter a SQL-like query to import data", "SELECT *");
    if (!query) return;

    const response = await fetch(`/api-configs/${id}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, session_id: sessionId })
    });
    const data = await response.json();

    if (!data.success) {
        document.getElementById("apiImportStatus").innerHTML = `❌ ${data.error}`;
        document.getElementById("apiImportStatus").className = "status error";
        return;
    }

    document.getElementById("apiImportStatus").innerHTML = `✅ Imported ${data.rows.length} rows. ${data.ddl}`;
    document.getElementById("apiImportStatus").className = "status success";
}

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

    const content = document.createElement("div");

    const title = document.createElement("strong");
    title.textContent = "Generated SQL";

    const sqlBox = document.createElement("div");
    sqlBox.className = "sql";
    sqlBox.textContent = sql;

    const previewContainer = document.createElement("div");
    previewContainer.className = "preview-result";
    previewContainer.innerHTML = "";

    const actionRow = document.createElement("div");
    actionRow.style.marginTop = "8px";

    const previewButton = document.createElement("button");
    previewButton.type = "button";
    previewButton.textContent = "Generated SQL";
    previewButton.addEventListener("click", async () => {
        previewContainer.innerHTML = "Loading preview...";
        await previewSqlWithApi(sql, null, previewContainer);
    });

    actionRow.appendChild(previewButton);

    const reasoningBox = document.createElement("div");
    reasoningBox.className = "reasoning";
    reasoningBox.textContent = `💡 ${reasoning}`;

    const attemptsBox = document.createElement("div");
    attemptsBox.style.fontSize = "12px";
    attemptsBox.style.color = "#999";
    attemptsBox.style.marginTop = "8px";
    attemptsBox.textContent = `Attempts: ${attempts}`;

    content.appendChild(title);
    content.appendChild(sqlBox);
    content.appendChild(previewContainer);
    content.appendChild(actionRow);
    content.appendChild(reasoningBox);
    content.appendChild(attemptsBox);
    div.appendChild(content);

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

document.addEventListener("DOMContentLoaded", function () {
    const authRequired = document.getElementById("authRequired");
    const apiAuthType = document.getElementById("apiAuthType");

    if (authRequired) {
        authRequired.checked = false;
        authRequired.addEventListener("change", toggleAuth);
    }

    if (apiAuthType) {
        apiAuthType.addEventListener("change", renderAuthFields);
    }

    document.getElementById("authSection").classList.add("hidden");
    document.getElementById("headersSection").classList.add("hidden");
    document.getElementById("authFields").innerHTML = "";
});

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        toggleAuth,
        renderAuthFields,
        showApiConfigForm,
        cancelApiConfigForm,
        getApiFormData,
        getAuthData,
        previewSqlWithApi,
        appendAssistant
    };
}
