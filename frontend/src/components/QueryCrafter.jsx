import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import ApiConfigForm from './ApiConfigForm';
import ApiConfigList from './ApiConfigList';
import ChatPanel from './ChatPanel';
import ConversationSidebar from './ConversationSidebar';
import DataRenderer from './DataRenderer';
import { useAnalyticsData } from './analytics/AnalyticsContext';
import { extractRowsForAnalytics } from '../utils/analytics';
import { useSession } from '../context/SessionContext';

export default function QueryCrafter() {
  const navigate = useNavigate();
  const { setData: setAnalyticsData } = useAnalyticsData();
  const {
    session,
    sessionId,
    appendChatMessage,
    updateChatMessage,
    clearChatMessages,
    setSessionIdentity,
    upsertConversation,
    replaceConversationMessages,
    selectConversation,
    loadConversationMessages,
    refreshSession,
  } = useSession();

  const [isSchemaLoading, setIsSchemaLoading] = useState(false);
  const [schemaStatus, setSchemaStatus] = useState({ text: 'No schema loaded.', className: 'status' });
  const [apiConfigs, setApiConfigs] = useState([]);
  const [showApiForm, setShowApiForm] = useState(false);
  const [activeApiConfigId, setActiveApiConfigId] = useState(null);
  const [apiImportStatus, setApiImportStatus] = useState({ text: '', className: 'status' });
  const [apiPreview, setApiPreview] = useState({ visible: false, format: '', data: null, error: '', viewMode: 'table' });
  const [formFields, setFormFields] = useState({
    name: '',
    endpoint: '',
    method: 'GET',
    headers: '',
    bodyTemplate: '{"query":"{{query}}"}',
    responseFormat: 'auto',
    authRequired: false,
    authType: 'none',
    authToken: '',
    authKeyName: '',
    authKeyValue: '',
    authUsername: '',
    authPassword: '',
  });
  const [question, setQuestion] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [schemaDraft, setSchemaDraft] = useState('');
  const [domainDraft, setDomainDraft] = useState('General');
  const [showTechPanel, setShowTechPanel] = useState(false);
  const chatBoxRef = useRef(null);

  const schema = session.schema;
  const domain = session.domain;
  const chatMessages = session.chatMessages;
  const conversations = session.conversations || [];
  const activeConversationId = session.activeConversationId;

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [chatMessages, isChatLoading]);

  useEffect(() => {
    setSchemaDraft(schema || '');
    setDomainDraft(domain || 'General');
  }, [schema, domain, activeConversationId]);

  useEffect(() => {
    loadApiConfigs();
  }, []);

  const handleFormChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFormFields((prev) => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value,
    }));
  };

  const loadApiConfigs = async () => {
    try {
      const response = await fetch('/api-configs');
      const data = await response.json();
      setApiConfigs(data.configs || []);
    } catch (err) {
      console.error('Failed to fetch API configs:', err);
    }
  };

  const loadSchema = async () => {
    if (!schemaDraft.trim()) {
      alert('Please enter a database schema.');
      return;
    }

    setIsSchemaLoading(true);
    setSchemaStatus({ text: 'Loading...', className: 'status' });

    try {
      const response = await fetch('/schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          conversation_id: activeConversationId,
          schema: schemaDraft,
          domain: domainDraft,
        }),
      });
      const data = await response.json();

      if (!data.success) {
        alert(data.error);
        setSchemaStatus({ text: 'No schema loaded.', className: 'status error' });
        return;
      }

      setSessionIdentity(data.session_id, data.conversation_id);
      upsertConversation(data.conversation);
      setSchemaStatus({ text: '✅ Schema Loaded', className: 'status success' });
      await refreshSession();
    } catch (err) {
      alert(err.message);
      setSchemaStatus({ text: 'No schema loaded.', className: 'status error' });
    } finally {
      setIsSchemaLoading(false);
    }
  };

  const newConversation = async () => {
    if (!sessionId) {
      alert('Load schema first.');
      return;
    }

    try {
      const response = await fetch(`/sessions/${sessionId}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clone_from_active: true,
          schema: schemaDraft,
          domain: domainDraft,
        }),
      });
      const data = await response.json();

      if (!data.success) {
        alert(data.error || 'Unable to create conversation.');
        return;
      }

      const conversation = data.conversation;
      upsertConversation(conversation);
      setSessionIdentity(sessionId, conversation.id);
      replaceConversationMessages(conversation.id, []);
      await refreshSession();
      setSchemaStatus({ text: '✅ New conversation created', className: 'status success' });
    } catch (error) {
      alert(error.message);
    }
  };

  const handleSelectConversation = async (conversationId) => {
    await selectConversation(conversationId);
    const selected = conversations.find((item) => item.id === conversationId);
    if (selected) {
      setSchemaDraft(selected.schema || '');
      setDomainDraft(selected.domain || 'General');
    }
  };

  const handleRenameConversation = async (conversation, nextTitleInput) => {
    const nextTitle = (nextTitleInput || '').trim();
    if (!nextTitle || !sessionId) return;

    try {
      const response = await fetch(`/sessions/${sessionId}/conversations/${conversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: nextTitle,
          schema: conversation.schema,
          domain: conversation.domain,
        }),
      });
      const data = await response.json();
      if (!data.success) {
        alert(data.error || 'Unable to rename conversation.');
        return;
      }
      upsertConversation(data.conversation);
      if (conversation.id === activeConversationId) {
        setSchemaStatus({ text: `✅ Renamed to "${data.conversation.title}"`, className: 'status success' });
      }
      await refreshSession();
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDeleteConversation = async (conversation) => {
    if (!sessionId) return;
    if (!window.confirm(`Delete "${conversation.title}"?`)) return;

    try {
      const response = await fetch(`/sessions/${sessionId}/conversations/${conversation.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!data.success) {
        alert(data.error || 'Unable to delete conversation.');
        return;
      }

      await refreshSession();
      const latestSessionResponse = await fetch(`/sessions/${sessionId}`);
      const latestSessionData = await latestSessionResponse.json();
      if (latestSessionResponse.ok && latestSessionData.success) {
        const nextActiveId = latestSessionData.session?.last_active_conversation_id;
        if (nextActiveId) {
          await loadConversationMessages(nextActiveId);
        } else {
          clearChatMessages();
        }
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const toggleTechPanel = () => {
    setShowTechPanel((prev) => !prev);
  };

  const getAuthData = () => {
    if (!formFields.authRequired) {
      return { required: false, type: 'none' };
    }
    const type = formFields.authType;
    if (type === 'bearer') return { required: true, type, token: formFields.authToken };
    if (type === 'api_key') return { required: true, type, key_name: formFields.authKeyName, key_value: formFields.authKeyValue };
    if (type === 'basic') return { required: true, type, username: formFields.authUsername, password: formFields.authPassword };
    return { required: true, type: 'none' };
  };

  const getApiFormData = () => ({
    id: activeApiConfigId,
    name: formFields.name.trim(),
    endpoint: formFields.endpoint.trim(),
    method: formFields.method,
    headers: formFields.headers.trim(),
    body_template: formFields.bodyTemplate.trim(),
    response_format: formFields.responseFormat,
    auth: getAuthData(),
  });

  const showApiConfigForm = () => {
    setActiveApiConfigId(null);
    setFormFields({
      name: '',
      endpoint: '',
      method: 'GET',
      headers: '',
      bodyTemplate: '{"query":"{{query}}"}',
      responseFormat: 'auto',
      authRequired: false,
      authType: 'none',
      authToken: '',
      authKeyName: '',
      authKeyValue: '',
      authUsername: '',
      authPassword: '',
    });
    setShowApiForm(true);
  };

  const cancelApiConfigForm = () => {
    setShowApiForm(false);
    setActiveApiConfigId(null);
  };

  const saveApiConfig = async () => {
    const payload = getApiFormData();
    if (!payload.name || !payload.endpoint) {
      alert('Please provide an API name and endpoint.');
      return;
    }

    const url = payload.id ? `/api-configs/${payload.id}` : '/api-configs';
    const method = payload.id ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!data.success) {
        alert(data.error || 'Unable to save API config.');
        return;
      }

      await loadApiConfigs();
      cancelApiConfigForm();
      setApiImportStatus({ text: '✅ API configuration saved.', className: 'status success' });
    } catch (err) {
      alert(err.message);
    }
  };

  const validateApiConfig = async () => {
    const payload = getApiFormData();
    if (!payload.name || !payload.endpoint) {
      alert('Please provide an API name and endpoint.');
      return;
    }

    const url = payload.id ? `/api-configs/${payload.id}/validate` : '/api-configs/validate';
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      setApiImportStatus({
        text: data.success ? '✅ API connection validated.' : `❌ ${data.error}`,
        className: data.success ? 'status success' : 'status error',
      });
    } catch (err) {
      setApiImportStatus({ text: `❌ ${err.message}`, className: 'status error' });
    }
  };

  const editApiConfig = (config) => {
    setActiveApiConfigId(config.id);
    const auth = config.auth || {};
    const authRequired = auth.required !== undefined ? Boolean(auth.required) : auth.type !== 'none';

    setFormFields({
      name: config.name || '',
      endpoint: config.endpoint || '',
      method: config.method || 'GET',
      headers: (config.headers || []).map((item) => `${item.key}: ${item.value}`).join('\n'),
      bodyTemplate: config.body_template || '',
      responseFormat: config.response_format || 'auto',
      authRequired,
      authType: auth.type || 'none',
      authToken: auth.token || '',
      authKeyName: auth.key_name || '',
      authKeyValue: auth.key_value || '',
      authUsername: auth.username || '',
      authPassword: auth.password || '',
    });
    setShowApiForm(true);
  };

  const deleteApiConfig = async (id) => {
    try {
      const response = await fetch(`/api-configs/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        await loadApiConfigs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const previewApiConfig = async (id) => {
    const query = window.prompt('Enter a SQL-like query to preview the API response', 'SELECT *');
    if (!query) return;

    setApiPreview({ visible: true, format: '', data: null, error: 'Loading preview...', viewMode: 'table' });

    try {
      const response = await fetch(`/api-configs/${id}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();

      if (!data.success) {
        setApiPreview({ visible: true, format: '', data: null, error: data.error || 'Preview failed', viewMode: 'table' });
        return;
      }
      setApiPreview({ visible: true, format: data.format || 'unknown', data, error: '', viewMode: 'table' });
    } catch (err) {
      setApiPreview({ visible: true, format: '', data: null, error: err.message, viewMode: 'table' });
    }
  };

  const previewSqlWithApi = async (sql, index) => {
    if (!sql) return;

    const config = apiConfigs[0];
    if (!config) {
      setApiImportStatus({ text: '⚠️ Create an API configuration first.', className: 'status error' });
      return;
    }

    updateChatMessage(index, { ...chatMessages[index], previewLoading: true, previewError: '', viewMode: 'table' });

    try {
      const response = await fetch(`/api-configs/${config.id}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sql }),
      });
      const data = await response.json();

      if (!data.success) {
        updateChatMessage(index, { ...chatMessages[index], previewLoading: false, previewError: data.error || 'Preview failed' });
      } else {
        updateChatMessage(index, {
          ...chatMessages[index],
          previewLoading: false,
          previewFormat: data.format || 'unknown',
          previewData: data,
          viewMode: 'table',
        });
      }
    } catch (err) {
      updateChatMessage(index, { ...chatMessages[index], previewLoading: false, previewError: err.message });
    }
  };

  const setInlineViewMode = (index, mode) => {
    updateChatMessage(index, { ...chatMessages[index], viewMode: mode });
  };

  const sendQuestion = async () => {
    if (!session.sessionId) {
      alert('Load schema first.');
      return;
    }
    if (!question.trim()) return;

    const currentQuestion = question.trim();
    appendChatMessage({ type: 'user', content: currentQuestion });
    setQuestion('');
    setIsChatLoading(true);

    try {
      const response = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: session.sessionId,
          conversation_id: session.activeConversationId,
          question: currentQuestion,
        }),
      });
      const data = await response.json();

      if (data.success) {
        appendChatMessage({
          type: 'assistant',
          sql: data.assistant.sql_query,
          reasoning: data.assistant.reasoning,
          attempts: data.attempts_used,
        });
        if (session.conversations.find((item) => item.id === session.activeConversationId)?.title === 'New chat') {
          const updatedTitle = currentQuestion.slice(0, 48);
          await fetch(`/sessions/${session.sessionId}/conversations/${session.activeConversationId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: updatedTitle,
              schema,
              domain,
            }),
          });
        }
      } else {
        appendChatMessage({ type: 'assistant', sql: 'ERROR', reasoning: data.error, attempts: 0 });
      }
      await refreshSession();
    } catch (err) {
      appendChatMessage({ type: 'assistant', sql: 'Network Error', reasoning: err.message, attempts: 0 });
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuestion();
    }
  };

  const resetConversation = async () => {
    if (!session.sessionId) return;
    try {
      await fetch(`/reset/${session.sessionId}`, { method: 'POST' });
      clearChatMessages();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditMessage = (index, updatedMessage) => {
    updateChatMessage(index, updatedMessage);
  };

  const handleRevertMessage = (index, updatedMessage) => {
    updateChatMessage(index, updatedMessage);
  };

  return (
    <div className={`app-shell ${showTechPanel ? 'tech-open' : ''}`}>
      <ConversationSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewConversation={newConversation}
        onSelectConversation={handleSelectConversation}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
      />

      <main className="workspace">
        <header className="workspace-header card">
          <div>
            <div className="sidebar-kicker">Active conversation</div>
            <h1>{session.conversations.find((item) => item.id === activeConversationId)?.title || 'New chat'}</h1>
          </div>
          <button type="button" className="tech-toggle" onClick={toggleTechPanel}>
            {showTechPanel ? 'Close Tech' : 'View Tech'}
          </button>
        </header>

        <ChatPanel
          chatMessages={chatMessages}
          isChatLoading={isChatLoading}
          question={question}
          setQuestion={setQuestion}
          handleKeyPress={handleKeyPress}
          sendQuestion={sendQuestion}
          previewSqlWithApi={previewSqlWithApi}
          setInlineViewMode={setInlineViewMode}
          onResetConversation={resetConversation}
          onEditMessage={handleEditMessage}
          onRevertMessage={handleRevertMessage}
          chatBoxRef={chatBoxRef}
        />
      </main>

      <aside className="tech-drawer card" aria-hidden={!showTechPanel}>
        <div className="tech-drawer-inner">
          <div className="tech-drawer-header">
            <div>
              <div className="sidebar-kicker">Technical context</div>
              <h2>Schema & API</h2>
            </div>
            <button type="button" className="tech-close" onClick={toggleTechPanel}>
              Close
            </button>
          </div>

          <div className="tech-stack">
            <div className="card schema-card">
              <div className="card-header">
                <div>
                  <div className="sidebar-kicker">Schema</div>
                  <h2>Current conversation</h2>
                </div>
                <button type="button" onClick={newConversation} disabled={!session.sessionId}>
                  New Chat
                </button>
              </div>

              <label>Database Schema (DDL)</label>
              <textarea
                id="schema"
                placeholder="Paste CREATE TABLE statements here..."
                value={schemaDraft}
                onChange={(e) => setSchemaDraft(e.target.value)}
              />

              <label>Domain</label>
              <input value={domainDraft} onChange={(e) => setDomainDraft(e.target.value)} />

              <div className="controls">
                <button onClick={loadSchema} disabled={isSchemaLoading}>
                  {isSchemaLoading ? 'Loading...' : session.sessionId ? 'Save Schema' : 'Load Schema'}
                </button>
                <button onClick={resetConversation} disabled={!session.sessionId}>
                  Reset Conversation
                </button>
              </div>

              <div id="schemaStatus" className={schemaStatus.className}>
                {schemaStatus.text}
              </div>
            </div>

            <div className="card api-card">
              <div className="card-header">
                <div>
                  <div className="sidebar-kicker">API</div>
                  <h2>Connections</h2>
                </div>
                <button type="button" onClick={showApiConfigForm}>
                  New API Config
                </button>
              </div>

              <ApiConfigForm
                formFields={formFields}
                handleFormChange={handleFormChange}
                saveApiConfig={saveApiConfig}
                validateApiConfig={validateApiConfig}
                cancelApiConfigForm={cancelApiConfigForm}
                showApiForm={showApiForm}
              />

              <ApiConfigList
                apiConfigs={apiConfigs}
                editApiConfig={editApiConfig}
                previewApiConfig={previewApiConfig}
                deleteApiConfig={deleteApiConfig}
              />

              {apiPreview.visible && (
                <div id="apiPreview" className="preview-panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0 }}>Preview</h4>
                    <div className="toggle-view-buttons" style={{ marginLeft: 'auto' }}>
                      <button
                        type="button"
                        className={apiPreview.viewMode === 'table' ? 'active' : ''}
                        onClick={() => setApiPreview((prev) => ({ ...prev, viewMode: 'table' }))}
                        style={{ marginRight: '4px', padding: '2px 8px', fontSize: '12px' }}
                      >
                        Table
                      </button>
                      <button
                        type="button"
                        className={apiPreview.viewMode === 'json' ? 'active' : ''}
                        onClick={() => setApiPreview((prev) => ({ ...prev, viewMode: 'json' }))}
                        style={{ padding: '2px 8px', fontSize: '12px' }}
                      >
                        JSON
                      </button>
                    </div>
                  </div>
                  {apiPreview.error && <div className={apiPreview.error.includes('Loading') ? '' : 'error'}>{apiPreview.error}</div>}
                  {apiPreview.data && (
                    <>
                      <div style={{ fontSize: '12px', color: '#666' }}>Format: {apiPreview.format}</div>
                      <DataRenderer data={apiPreview.data} viewMode={apiPreview.viewMode} />
                      <button
                        type="button"
                        className="btn-open-analytics"
                        onClick={() => {
                          const rows = extractRowsForAnalytics(apiPreview.data);
                          if (rows && rows.length > 0) {
                            setAnalyticsData(rows);
                            navigate('/dashboard/analytics/regression');
                          } else {
                            alert('No tabular data available to analyze.');
                          }
                        }}
                      >
                        📊 Open in Analytics
                      </button>
                    </>
                  )}
                </div>
              )}

              {apiImportStatus.text && <div id="apiImportStatus" className={apiImportStatus.className}>{apiImportStatus.text}</div>}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
