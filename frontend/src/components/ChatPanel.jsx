import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataRenderer from './DataRenderer';
import OpenAnalyticsDropdown from './OpenAnalyticsDropdown';
import { useAnalyticsData } from '../components/analytics/AnalyticsContext';
import { extractRowsForAnalytics } from '../utils/analytics';

export default function ChatPanel({
  chatMessages,
  isChatLoading,
  question,
  setQuestion,
  handleKeyPress,
  sendQuestion,
  previewSqlWithApi,
  setInlineViewMode,
  onResetConversation,
  onEditMessage,
  onRevertMessage,
  chatBoxRef,
}) {
  const { setData: setAnalyticsData } = useAnalyticsData();
  const navigate = useNavigate();
  const [editingMessageIndex, setEditingMessageIndex] = useState(null);
  const [editedSqlValue, setEditedSqlValue] = useState('');

  const handleEditClick = (sql, index) => {
    setEditingMessageIndex(index);
    setEditedSqlValue(sql);
  };

  const handleSaveEdit = (index) => {
    const originalMessage = chatMessages[index];
    onEditMessage(index, {
      ...originalMessage,
      sql: editedSqlValue,
      originalSql: originalMessage.originalSql || originalMessage.sql,
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
    const originalMessage = chatMessages[index];
    if (originalMessage.originalSql) {
      onRevertMessage(index, {
        ...originalMessage,
        sql: originalMessage.originalSql,
        previewLoading: false,
        previewError: null,
        previewData: null,
      });
    }
    setEditingMessageIndex(null);
    setEditedSqlValue('');
  };

  return (
    <div className="chat-shell card">
      <div className="chat-header">
        <div>
          <div className="sidebar-kicker">Active chat</div>
          <h2>Conversation</h2>
        </div>
      </div>

      <div id="chatBox" ref={chatBoxRef} className="chat-box">
        {chatMessages.map((msg, idx) => (
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
                      <button type="button" onClick={() => handleSaveEdit(idx)} style={{ marginRight: '5px' }}>
                        Save
                      </button>
                      <button type="button" onClick={handleCancelEdit}>
                        Cancel
                      </button>
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
                    {msg.originalSql && msg.sql !== msg.originalSql && (
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
                  <div
                    className="preview-result"
                    style={{ marginTop: '12px', background: '#f9fafb', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb' }}
                  >
                    {msg.previewLoading && <div>Loading preview...</div>}
                    {msg.previewError && <div className="error">{msg.previewError}</div>}
                    {msg.previewData && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '6px' }}>
                          <h4 style={{ margin: 0 }}>Preview Result</h4>
                          <div style={{ marginLeft: 'auto' }}>
                            <button
                              type="button"
                              onClick={() => setInlineViewMode(idx, 'table')}
                              style={{ marginRight: '4px', padding: '2px 6px', fontSize: '11px' }}
                            >
                              Table
                            </button>
                            <button
                              type="button"
                              onClick={() => setInlineViewMode(idx, 'json')}
                              style={{ padding: '2px 6px', fontSize: '11px' }}
                            >
                              JSON
                            </button>
                          </div>
                        </div>
                        <div style={{ fontSize: '11px', color: '#777' }}>Format: {msg.previewFormat}</div>
                        <DataRenderer data={msg.previewData} viewMode={msg.viewMode || 'table'} />

                        <div className="mt-3">
                          <OpenAnalyticsDropdown
                            buttonLabel="📊 Open in Analytics"
                            buttonClassName="btn-open-analytics"
                            onSelect={(path) => {
                              const rows = extractRowsForAnalytics(msg.previewData);
                              if (rows && rows.length > 0) {
                                setAnalyticsData(rows);
                                navigate(path);
                              } else {
                                alert('No tabular data available to analyze.');
                              }
                            }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
                <div style={{ marginTop: '8px' }}>
                  <button type="button" onClick={() => previewSqlWithApi(msg.sql, idx)}>
                    Execute Query & Preview
                  </button>
                </div>
                <div className="reasoning">💡 {msg.reasoning}</div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>Attempts: {msg.attempts}</div>
              </div>
            )}
          </div>
        ))}
        {isChatLoading && <div className="loading">Thinking...</div>}
      </div>

      <div className="chat-input-shell">
        <textarea
          id="question"
          placeholder="Ask your SQL question..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <div className="controls">
          <button id="sendBtn" onClick={sendQuestion} disabled={isChatLoading}>
            Send
          </button>
          <button onClick={onResetConversation}>Reset Conversation</button>
        </div>
      </div>
    </div>
  );
}
