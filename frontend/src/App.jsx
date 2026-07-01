import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './index.css';
import ApiConfigForm from './components/ApiConfigForm';
import ApiConfigList from './components/ApiConfigList';
import ChatPanel from './components/ChatPanel';
import DataRenderer from './components/DataRenderer';
import { AnalyticsProvider, useAnalyticsData } from './components/analytics/AnalyticsContext';
import AnalyticsLayout from './components/analytics/AnalyticsLayout';
import RegressionView from './components/analytics/RegressionView';
import BarChartView from './components/analytics/BarChartView';
import PieChartView from './components/analytics/PieChartView';
import { extractRowsForAnalytics } from './utils/analytics';



export default function App() {
  return (
    <AnalyticsProvider>
      <Routes>
        <Route path="/dashboard/analytics" element={<AnalyticsLayout />}>
          <Route index element={<Navigate to="regression" replace />} />
          <Route path="regression" element={<RegressionView />} />
          <Route path="barchart" element={<BarChartView />} />
          <Route path="piechart" element={<PieChartView />} />
        </Route>
        <Route path="/*" element={<QueryCrafter />} />
      </Routes>
    </AnalyticsProvider>
  );
}

function QueryCrafter() {
  const navigate = useNavigate();
  const { setData: setAnalyticsData } = useAnalyticsData();
  // Session States
  const [sessionId, setSessionId] = useState(null);
  const [schema, setSchema] = useState('');
  const [domain, setDomain] = useState('General');
  const [isSchemaLoading, setIsSchemaLoading] = useState(false);
  const [schemaStatus, setSchemaStatus] = useState({ text: 'No schema loaded.', className: 'status' });

  // API Config Panel States
  const [apiConfigs, setApiConfigs] = useState([]);
  const [showApiForm, setShowApiForm] = useState(false);
  const [activeApiConfigId, setActiveApiConfigId] = useState(null);
  const [apiImportStatus, setApiImportStatus] = useState({ text: '', className: 'status' });
  
  // Standalone API Global Preview Overlay State
  const [apiPreview, setApiPreview] = useState({ visible: false, format: '', data: null, error: '', viewMode: 'table' });

  // API Form Fields State
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
    authPassword: ''
  });

  // Chat/Conversation States
  const [chatMessages, setChatMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const chatBoxRef = useRef(null);

  // Auto-scroll chat box when new messages arrive or when thinking status finishes
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [chatMessages, isChatLoading]);

  // Load API configurations from backend on initial mount
  useEffect(() => {
    loadApiConfigs();
  }, []);

  // Universal handler for all inputs inside the API configuration form
  const handleFormChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFormFields((prev) => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value
    }));
  };

  // ------------------------------------------------------------
  // Database Schema (DDL) Handlers
  // ------------------------------------------------------------
  const loadSchema = async () => {
    if (!schema.trim()) {
      alert('Please enter a database schema.');
      return;
    }

    setIsSchemaLoading(true);
    setSchemaStatus({ text: 'Loading...', className: 'status' });

    try {
      const response = await fetch('/schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema, domain })
      });
      const data = await response.json();

      if (!data.success) {
        alert(data.error);
        setSchemaStatus({ text: 'No schema loaded.', className: 'status error' });
        setIsSchemaLoading(false);
        return;
      }

      setSessionId(data.session_id);
      setSchemaStatus({ text: '✅ Schema Loaded', className: 'status success' });
    } catch (err) {
      alert(err.message);
      setSchemaStatus({ text: 'No schema loaded.', className: 'status error' });
    } finally {
      setIsSchemaLoading(false);
    }
  };

  const newSession = () => {
    setSessionId(null);
    setSchema('');
    setDomain('General');
    setChatMessages([]);
    setSchemaStatus({ text: 'No schema loaded.', className: 'status' });
    setIsSchemaLoading(false);
  };

  // ------------------------------------------------------------
  // API Configurations Handling
  // ------------------------------------------------------------
  const loadApiConfigs = async () => {
    try {
      const response = await fetch('/api-configs');
      const data = await response.json();
      setApiConfigs(data.configs || []);
    } catch (err) {
      console.error('Failed to fetch API configs:', err);
    }
  };

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
      authPassword: ''
    });
    setShowApiForm(true);
  };

  const cancelApiConfigForm = () => {
    setShowApiForm(false);
    setActiveApiConfigId(null);
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

  const getApiFormData = () => {
    return {
      id: activeApiConfigId,
      name: formFields.name.trim(),
      endpoint: formFields.endpoint.trim(),
      method: formFields.method,
      headers: formFields.headers.trim(),
      body_template: formFields.bodyTemplate.trim(),
      response_format: formFields.responseFormat,
      auth: getAuthData()
    };
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
        body: JSON.stringify(payload)
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
        body: JSON.stringify(payload)
      });
      const data = await response.json();

      setApiImportStatus({
        text: data.success ? '✅ API connection validated.' : `❌ ${data.error}`,
        className: data.success ? 'status success' : 'status error'
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
      authPassword: auth.password || ''
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
    const query = prompt('Enter a SQL-like query to preview the API response', 'SELECT *');
    if (!query) return;

    setApiPreview({ visible: true, format: '', data: null, error: 'Loading preview...', viewMode: 'table' });

    try {
      const response = await fetch(`/api-configs/${id}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await response.json();

      if (!data.success) {
        setApiPreview({ visible: true, format: '', data: null, error: data.error || 'Preview failed', viewMode: 'table' });
        return;
      }
      setApiPreview({ visible: true, format: data.format || 'unknown', data: data, error: '', viewMode: 'table' });
    } catch (err) {
      setApiPreview({ visible: true, format: '', data: null, error: err.message, viewMode: 'table' });
    }
  };

  // ------------------------------------------------------------
  // Inline Bubble Preview (Handles inside individual generated message)
  // ------------------------------------------------------------
  const previewSqlWithApi = async (sql, index) => {
    if (!sql) return;

    const config = apiConfigs[0]; 
    if (!config) {
      setApiImportStatus({ text: '⚠️ Create an API configuration first.', className: 'status error' });
      return;
    }

    setChatMessages((prev) =>
      prev.map((msg, idx) => (idx === index ? { ...msg, previewLoading: true, previewError: '', viewMode: 'table' } : msg))
    );

    try {
      const response = await fetch(`/api-configs/${config.id}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sql })
      });
      const data = await response.json();

      setChatMessages((prev) =>
        prev.map((msg, idx) => {
          if (idx === index) {
            if (!data.success) {
              return { ...msg, previewLoading: false, previewError: data.error || 'Preview failed' };
            }
            return {
              ...msg,
              previewLoading: false,
              previewFormat: data.format || 'unknown',
              previewData: data,
              viewMode: 'table'
            };
          }
          return msg;
        })
      );
    } catch (err) {
      setChatMessages((prev) =>
        prev.map((msg, idx) => (idx === index ? { ...msg, previewLoading: false, previewError: err.message } : msg))
      );
    }
  };

  const setInlineViewMode = (index, mode) => {
    setChatMessages((prev) =>
      prev.map((msg, idx) => (idx === index ? { ...msg, viewMode: mode } : msg))
    );
  };

  // ------------------------------------------------------------
  // Chat Conversation Mechanics
  // ------------------------------------------------------------
  const sendQuestion = async () => {
    if (sessionId === null) {
      alert('Load schema first.');
      return;
    }
    if (!question.trim()) return;

    const currentQuestion = question.trim();
    setChatMessages((prev) => [...prev, { type: 'user', content: currentQuestion }]);
    setQuestion('');
    setIsChatLoading(true);

    try {
      const response = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, question: currentQuestion })
      });
      const data = await response.json();

      if (data.success) {
        setChatMessages((prev) => [
          ...prev,
          {
            type: 'assistant',
            sql: data.assistant.sql_query,
            reasoning: data.assistant.reasoning,
            attempts: data.attempts_used
          }
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          { type: 'assistant', sql: 'ERROR', reasoning: data.error, attempts: 0 }
        ]);
      }
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { type: 'assistant', sql: 'Network Error', reasoning: err.message, attempts: 0 }
      ]);
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
    if (sessionId === null) return;
    try {
      await fetch(`/reset/${sessionId}`, { method: 'POST' });
      setChatMessages([]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container">
      <h1>🛠 QueryCrafter</h1>
      <div className="subtitle">Conversational SQL Assistant powered by Ollama</div>

      <div id="mainLayout" className={`layout ${sessionId ? 'session-active' : ''}`}>
        {/* Left Control Panel */}
        <div className="left-panel">
          <div className="card">
            <label>Database Schema (DDL)</label>
            <textarea
              id="schema"
              placeholder="Paste CREATE TABLE statements here..."
              value={schema}
              disabled={sessionId !== null}
              onChange={(e) => setSchema(e.target.value)}
            />

            <label>Domain</label>
            <input
              id="domain"
              type="text"
              value={domain}
              disabled={sessionId !== null}
              onChange={(e) => setDomain(e.target.value)}
            />

            <div className="controls">
              <button onClick={loadSchema} disabled={isSchemaLoading || sessionId !== null}>
                {sessionId !== null ? 'Loaded' : isSchemaLoading ? 'Loading...' : 'Load Schema'}
              </button>
              <button onClick={newSession}>New Session</button>
            </div>

            <div id="schemaStatus" className={schemaStatus.className}>
              {schemaStatus.text}
            </div>
          </div>

          {/* API Config Component */}
          <div className="card">
            <h3>API Connection Configurations</h3>
            <div className="controls" style={{ marginTop: '10px' }}>
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
                      onClick={() => setApiPreview(prev => ({ ...prev, viewMode: 'table' }))}
                      style={{ marginRight: '4px', padding: '2px 8px', fontSize: '12px' }}
                    >Table</button>
                    <button 
                      type="button" 
                      className={apiPreview.viewMode === 'json' ? 'active' : ''} 
                      onClick={() => setApiPreview(prev => ({ ...prev, viewMode: 'json' }))}
                      style={{ padding: '2px 8px', fontSize: '12px' }}
                    >JSON</button>
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
                    >📊 Open in Analytics</button>
                  </>
                )}
              </div>
            )}

            {apiImportStatus.text && (
              <div id="apiImportStatus" className={apiImportStatus.className}>
                {apiImportStatus.text}
              </div>
            )}
          </div>
        </div>

        {/* Right Chat History Panel */}
        <ChatPanel
          chatMessages={chatMessages}
          isChatLoading={isChatLoading}
          question={question}
          setQuestion={setQuestion}
          handleKeyPress={handleKeyPress}
          sendQuestion={sendQuestion}
          previewSqlWithApi={previewSqlWithApi}
          setInlineViewMode={setInlineViewMode}
          onOpenAnalytics={(previewData) => {
            const rows = extractRowsForAnalytics(previewData);
            if (rows && rows.length > 0) {
              setAnalyticsData(rows);
              navigate('/dashboard/analytics/regression');
            } else {
              alert('No tabular data available to analyze.');
            }
          }}
        />
      </div>
    </div>
  );
}