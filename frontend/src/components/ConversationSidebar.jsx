import React, { useEffect, useState } from 'react';

function formatConversationSubtitle(conversation) {
  if (!conversation) return '';
  const pieces = [];
  if (conversation.domain) pieces.push(conversation.domain);
  if (conversation.last_message_time) {
    const time = new Date(conversation.last_message_time);
    if (!Number.isNaN(time.getTime())) {
      pieces.push(time.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }));
    }
  }
  return pieces.join(' · ');
}

export default function ConversationSidebar({
  conversations,
  activeConversationId,
  onNewConversation,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
}) {
  const [search, setSearch] = useState('');
  const [editingConversationId, setEditingConversationId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    if (!editingConversationId) return;
    const current = conversations.find((conversation) => conversation.id === editingConversationId);
    if (current) {
      setEditTitle(current.title || 'New chat');
    }
  }, [editingConversationId, conversations]);

  const filteredConversations = conversations.filter((conversation) => {
    const haystack = `${conversation.title || ''} ${conversation.domain || ''} ${conversation.schema || ''}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  return (
    <aside className="conversation-sidebar card">
      <div className="sidebar-top">
        <div>
          <div className="sidebar-kicker">Conversations</div>
          <h2>QueryCrafter</h2>
        </div>
        <button type="button" className="sidebar-new-btn" onClick={onNewConversation}>
          New Chat
        </button>
      </div>

      <input
        className="sidebar-search"
        type="search"
        placeholder="Search conversations"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      <div className="sidebar-list">
        {filteredConversations.length === 0 ? (
          <div className="sidebar-empty">No conversations yet.</div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`conversation-item ${conversation.id === activeConversationId ? 'active' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => onSelectConversation(conversation.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectConversation(conversation.id);
                }
              }}
              >
                <div className="conversation-item-main">
                  {editingConversationId === conversation.id ? (
                    <input
                      className="conversation-rename-input"
                      value={editTitle}
                      onChange={(event) => setEditTitle(event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <strong>{conversation.title || 'Untitled conversation'}</strong>
                  )}
                  <span>{formatConversationSubtitle(conversation)}</span>
                </div>
                <div className="conversation-item-actions">
                  {editingConversationId === conversation.id ? (
                    <>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          onRenameConversation(conversation, editTitle);
                          setEditingConversationId(null);
                        }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditingConversationId(null);
                          setEditTitle('');
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditingConversationId(conversation.id);
                          setEditTitle(conversation.title || 'New chat');
                        }}
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        className="icon-btn danger"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteConversation(conversation);
                        }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
