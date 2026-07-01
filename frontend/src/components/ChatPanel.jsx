import React, { useState } from 'react'; // Import useState
import DataRenderer from './DataRenderer';
import { useAnalyticsData } from '../components/analytics/AnalyticsContext';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../context/SessionContext'; // Import useSession

import { extractRowsForAnalytics } from '../utils/analytics';

export default function ChatPanel({
  chatMessages, // This will now come from useSession, but keeping for direct passed prop for initial setup
  isChatLoading,
  question,
  setQuestion,
  handleKeyPress,
  sendQuestion,
  previewSqlWithApi, // This function should now take the SQL to execute, not assume msg.sql
  setInlineViewMode,
}) {
  const { setData: setAnalyticsData } = useAnalyticsData();
  const navigate = useNavigate();
  const { session, updateChatMessage, clearChatMessages } = useSession(); // Use the session context
  const currentChatMessages = session.chatMessages; // Get chat messages from session context

  const [editingMessageIndex, setEditingMessageIndex] = useState(null);
  const [editedSqlValue, setEditedSqlValue] = useState('');

  const handleEditClick = (sql, index) => {
    setEditingMessageIndex(index);
    setEditedSqlValue(sql);
  };

  const handleSaveEdit = (index) => {
    const originalMessage = currentChatMessages[index];
    updateChatMessage(index, {
      ...originalMessage,
      sql: editedSqlValue, // Save the edited SQL
      originalSql: originalMessage.originalSql || originalMessage.sql, // Store original if not already stored
      // Reset preview related fields if you want the user to re-execute after editing
      previewLoading: false,
      previewError: null,
      previewData: null,
    });
    setEditingMessageIndex(null);
    setEditedSqlValue('');
  };

  const handleCancelEdit = () => {
    setEditingMessageIndex(null);
    setEditedSqlValue('');
  };

  const handleRevertSql = (index) => {
    const originalMessage = currentChatMessages[index];
    if (originalMessage.originalSql) {
      updateChatMessage(index, {
        ...originalMessage,
        sql: originalMessage.originalSql,
        // Reset preview related fields as SQL changed
        previewLoading: false,
        previewError: null,
        previewData: null,
      });
    }
    setEditingMessageIndex(null); // Exit edit mode
    setEditedSqlValue('');
  };

  // Modify previewSqlWithApi call to use the potentially edited SQL
  const executePreview = (sqlToExecute, index) => {
    previewSqlWithApi(sqlToExecute, index);
  };

  return (
    <div className="right-panel">
      <div id="chatCard" className="card">
        <h2 style={{ marginBottom: '15px' }}>Conversation</h2>
        <div id="chatBox" className="chat-box">
          {currentChatMessages.map((msg, idx) => ( // Use currentChatMessages from context
            <div className={`message ${msg.type}`} key={idx}>
              {msg.type === 'user' ? (
                <div className="bubble">{msg.content}</div>
              ) : (
                <div>
                  <strong>Generated SQL</strong>
                  {editingMessageIndex === idx ? (
                    <>
                      <textarea
                        value={editedSqlValue}
                        onChange={(e) => setEditedSqlValue(e.target.value)}
                        style={{ width: '100%', minHeight: '80px', fontFamily: 'monospace', fontSize: '14px', padding: '8px' }}
                      />
                      <div style={{ marginTop: '5px' }}>
                        <button type="button" onClick={() => handleSaveEdit(idx)} style={{ marginRight: '5px' }}>Save</button>
                        <button type="button" onClick={handleCancelEdit}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <div className="sql">
                      {msg.sql}
                      <button
                        type="button"
                        onClick={() => handleEditClick(msg.sql, idx)}
                        style={{ marginLeft: '10px', padding: '2px 6px', fontSize: '11px' }}
                      >
                        Edit
                      </button>
                      {msg.originalSql && msg.sql !== msg.originalSql && ( // Show revert only if originalSql exists and is different
                        <button
                          type="button"
                          onClick={() => handleRevertSql(idx)}
                          style={{ marginLeft: '5px', padding: '2px 6px', fontSize: '11px' }}
                        >
                          Revert Original
                        </button>
                      )}
                    </div>
                  )}

                  {(msg.previewLoading || msg.previewError || msg.previewData) && (
                    <div className="preview-result" style={{ marginTop: '12px', background: '#f9fafb', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
                    >
                      {msg.previewLoading && <div>Loading preview...</div>}
                      {msg.previewError && <div className="error">{msg.previewError}</div>}
                      {msg.previewData && (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                            <h4 style={{ margin: 0 }}>Preview Result</h4>
                            <div style={{ marginLeft: 'auto' }}>
                              <button type="button" onClick={() => setInlineViewMode(idx, 'table')} style={{ marginRight: '4px', padding: '2px 6px', fontSize: '11px' }}>Table</button>
                              <button type="button" onClick={() => setInlineViewMode(idx, 'json')} style={{ padding: '2px 6px', fontSize: '11px' }}>JSON</button>
                            </div>
                          </div>
                          <div style={{ fontSize: '11px', color: '#777' }}>Format: {msg.previewFormat}</div>
                          <DataRenderer data={msg.previewData} viewMode={msg.viewMode || 'table'} />

                          <button
                            type="button"
                            className="btn-open-analytics"
                            onClick={() => {
                              const rows = extractRowsForAnalytics(msg.previewData);
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
                  <div style={{ marginTop: '8px' }}>
                    <button type="button" onClick={() => executePreview(msg.sql, idx)}>Execute Query & Preview</button>
                  </div>
                  <div className="reasoning">💡 {msg.reasoning}</div>
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>Attempts: {msg.attempts}</div>
                </div>
              )}
            </div>
          ))}
          {isChatLoading && <div className="loading">Thinking...</div>}
        </div>
        <div style={{ marginTop: '20px' }}>
          <textarea
            id="question"
            placeholder="Ask your SQL question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <div className="controls">
            <button id="sendBtn" onClick={sendQuestion} disabled={isChatLoading}>Send</button>
            <button onClick={clearChatMessages}>Reset Conversation</button> {/* Use clearChatMessages from context */}
          </div>
        </div>
      </div>
    </div>
  );
}