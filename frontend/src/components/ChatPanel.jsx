import React from 'react';
import DataRenderer from './DataRenderer';

export default function ChatPanel({
  chatMessages,
  isChatLoading,
  question,
  setQuestion,
  handleKeyPress,
  sendQuestion,
  previewSqlWithApi,
  setInlineViewMode,
}) {
  return (
    <div className="right-panel">
      <div id="chatCard" className="card">
        <h2 style={{ marginBottom: '15px' }}>Conversation</h2>
        <div id="chatBox" className="chat-box">
          {chatMessages.map((msg, idx) => (
            <div className={`message ${msg.type}`} key={idx}>
              {msg.type === 'user' ? (
                <div className="bubble">{msg.content}</div>
              ) : (
                <div>
                  <strong>Generated SQL</strong>
                  <div className="sql">{msg.sql}</div>
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
                        </>
                      )}
                    </div>
                  )}
                  <div style={{ marginTop: '8px' }}>
                    <button type="button" onClick={() => previewSqlWithApi(msg.sql, idx)}>Execute Query & Preview</button>
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
            <button onClick={() => { /* resetConversation placeholder */ }}>Reset Conversation</button>
          </div>
        </div>
      </div>
    </div>
  );
}
