import React from 'react';

export default function ApiConfigForm({
  formFields,
  handleFormChange,
  saveApiConfig,
  validateApiConfig,
  cancelApiConfigForm,
  showApiForm,
}) {
  if (!showApiForm) return null;

  return (
    <div id="apiConfigForm" className="api-form">
      <label>API Name</label>
      <input id="name" type="text" placeholder="Example API" value={formFields.name} onChange={handleFormChange} />

      <label>Endpoint URL</label>
      <input id="endpoint" type="text" placeholder="https://api.example.com/data" value={formFields.endpoint} onChange={handleFormChange} />

      <label>HTTP Method</label>
      <select id="method" value={formFields.method} onChange={handleFormChange}>
        <option value="GET">GET</option>
        <option value="POST">POST</option>
      </select>

      <div id="headersSection" className={formFields.authRequired ? '' : 'hidden'}>
        <label>Headers (one per line: Key: Value)</label>
        <textarea id="headers" placeholder="Authorization: Bearer TOKEN" value={formFields.headers} onChange={handleFormChange} />
      </div>

      <label className="checkbox-row">
        <input id="authRequired" type="checkbox" checked={formFields.authRequired} onChange={handleFormChange} />
        <span>Authentication Required</span>
      </label>

      {formFields.authRequired && (
        <div id="authSection" className="auth-section">
          <label>Authentication Type</label>
          <select id="authType" value={formFields.authType} onChange={handleFormChange}>
            <option value="none">None</option>
            <option value="bearer">Bearer Token</option>
            <option value="api_key">API Key</option>
            <option value="basic">Basic Auth</option>
          </select>

          {formFields.authType === 'bearer' && (
            <>
              <label>Bearer Token</label>
              <input id="authToken" type="text" placeholder="Token" value={formFields.authToken} onChange={handleFormChange} />
            </>
          )}
          {formFields.authType === 'api_key' && (
            <>
              <label>Header Name</label>
              <input id="authKeyName" type="text" placeholder="X-API-Key" value={formFields.authKeyName} onChange={handleFormChange} />
              <label>Header Value</label>
              <input id="authKeyValue" type="text" placeholder="API Key" value={formFields.authKeyValue} onChange={handleFormChange} />
            </>
          )}
          {formFields.authType === 'basic' && (
            <>
              <label>Username</label>
              <input id="authUsername" type="text" placeholder="username" value={formFields.authUsername} onChange={handleFormChange} />
              <label>Password</label>
              <input id="authPassword" type="password" placeholder="password" value={formFields.authPassword} onChange={handleFormChange} />
            </>
          )}
        </div>
      )}

      <label>Request Body Template</label>
      <textarea id="bodyTemplate" placeholder='{"query":"{{query}}"}' value={formFields.bodyTemplate} onChange={handleFormChange} />

      <label>Response Format</label>
      <select id="responseFormat" value={formFields.responseFormat} onChange={handleFormChange}>
        <option value="auto">Auto Detect</option>
        <option value="json">JSON</option>
        <option value="csv">CSV</option>
      </select>

      <div className="controls">
        <button type="button" onClick={saveApiConfig}>Save Config</button>
        <button type="button" onClick={validateApiConfig}>Validate</button>
        <button type="button" onClick={cancelApiConfigForm}>Cancel</button>
      </div>
    </div>
  );
}
