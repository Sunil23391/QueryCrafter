import React, { createContext, useContext, useEffect, useState } from 'react';

const SessionContext = createContext(null);

const STORAGE_KEY = 'querycrafter_session_v2';

const createEmptyState = () => ({
  sessionId: null,
  activeConversationId: null,
  conversations: [],
  messagesByConversationId: {},
  hydrated: false,
});

const readSavedSession = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return createEmptyState();
    const parsed = JSON.parse(saved);
    return {
      ...createEmptyState(),
      sessionId: parsed.sessionId || null,
      activeConversationId: parsed.activeConversationId || null,
    };
  } catch (error) {
    console.error('Failed to load session state', error);
    return createEmptyState();
  }
};

const mergeConversation = (conversations, nextConversation) => {
  const exists = conversations.some((item) => item.id === nextConversation.id);
  if (!exists) {
    return [...conversations, nextConversation];
  }
  return conversations.map((item) => (item.id === nextConversation.id ? { ...item, ...nextConversation } : item));
};

const sortByUpdatedAt = (items) =>
  [...items].sort((a, b) => {
    const left = new Date(a.updated_at || a.updatedAt || 0).getTime();
    const right = new Date(b.updated_at || b.updatedAt || 0).getTime();
    return right - left;
  });

const mapMessageDto = (message) => ({
  type: message.role === 'assistant' ? 'assistant' : 'user',
  content: message.content || '',
  sql: message.sql_query || '',
  reasoning: message.reasoning || '',
  attempts: message.attempts_used ?? 0,
});

export function SessionProvider({ children }) {
  const [state, setState] = useState(readSavedSession);

  const activeConversation = state.conversations.find((item) => item.id === state.activeConversationId) || null;
  const activeMessages = state.messagesByConversationId[state.activeConversationId] || [];

  const session = {
    sessionId: state.sessionId,
    activeConversationId: state.activeConversationId,
    schema: activeConversation?.schema || '',
    domain: activeConversation?.domain || 'General',
    chatMessages: activeMessages,
    conversations: state.conversations,
  };

  useEffect(() => {
    if (!state.sessionId) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sessionId: state.sessionId,
        activeConversationId: state.activeConversationId,
      }),
    );
  }, [state.sessionId, state.activeConversationId]);

  useEffect(() => {
    const hydrate = async () => {
      if (!state.sessionId) {
        setState((prev) => ({ ...prev, hydrated: true }));
        return;
      }

      try {
        const sessionResponse = await fetch(`/sessions/${state.sessionId}`);
        const sessionData = await sessionResponse.json();
        if (!sessionResponse.ok || !sessionData.success) {
          setState(createEmptyState());
          return;
        }

        const serverSession = sessionData.session || {};
        const conversations = sortByUpdatedAt(serverSession.conversations || []);
        const activeConversationId =
          state.activeConversationId &&
          conversations.some((item) => item.id === state.activeConversationId)
            ? state.activeConversationId
            : serverSession.last_active_conversation_id || conversations[0]?.id || null;

        const nextState = {
          sessionId: serverSession.id || state.sessionId,
          activeConversationId,
          conversations,
          messagesByConversationId: {},
          hydrated: true,
        };

        if (activeConversationId) {
          const messagesResponse = await fetch(
            `/sessions/${nextState.sessionId}/conversations/${activeConversationId}/messages`,
          );
          const messagesData = await messagesResponse.json();
          if (messagesResponse.ok && messagesData.success) {
            nextState.messagesByConversationId[activeConversationId] = (messagesData.messages || []).map(mapMessageDto);
          }
        }

        setState(nextState);
      } catch (error) {
        console.error('Failed to hydrate session', error);
        setState((prev) => ({ ...prev, hydrated: true }));
      }
    };

    hydrate();
    // We intentionally hydrate only once from the persisted ids.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSessionIdentity = (sessionId, activeConversationId = null) => {
    setState((prev) => ({
      ...prev,
      sessionId,
      activeConversationId,
    }));
  };

  const setConversations = (conversations, activeConversationId = null) => {
    setState((prev) => ({
      ...prev,
      conversations: sortByUpdatedAt(conversations),
      activeConversationId: activeConversationId ?? prev.activeConversationId,
    }));
  };

  const upsertConversation = (conversation) => {
    setState((prev) => ({
      ...prev,
      conversations: sortByUpdatedAt(mergeConversation(prev.conversations, conversation)),
    }));
  };

  const replaceConversationMessages = (conversationId, messages) => {
    setState((prev) => ({
      ...prev,
      messagesByConversationId: {
        ...prev.messagesByConversationId,
        [conversationId]: messages,
      },
    }));
  };

  const appendChatMessage = (message) => {
    if (!state.activeConversationId) return;
    setState((prev) => {
      const currentMessages = prev.messagesByConversationId[prev.activeConversationId] || [];
      return {
        ...prev,
        messagesByConversationId: {
          ...prev.messagesByConversationId,
          [prev.activeConversationId]: [...currentMessages, message],
        },
      };
    });
  };

  const updateChatMessage = (index, updatedMessage) => {
    if (!state.activeConversationId) return;
    setState((prev) => {
      const currentMessages = prev.messagesByConversationId[prev.activeConversationId] || [];
      return {
        ...prev,
        messagesByConversationId: {
          ...prev.messagesByConversationId,
          [prev.activeConversationId]: currentMessages.map((item, idx) => (idx === index ? updatedMessage : item)),
        },
      };
    });
  };

  const clearChatMessages = () => {
    if (!state.activeConversationId) return;
    setState((prev) => ({
      ...prev,
      messagesByConversationId: {
        ...prev.messagesByConversationId,
        [prev.activeConversationId]: [],
      },
    }));
  };

  const updateSession = (patch) => {
    if (!state.activeConversationId) {
      setState((prev) => ({ ...prev, ...patch }));
      return;
    }

    setState((prev) => ({
      ...prev,
      conversations: prev.conversations.map((conversation) =>
        conversation.id === prev.activeConversationId ? { ...conversation, ...patch } : conversation,
      ),
    }));
  };

  const clearSession = () => {
    setState(createEmptyState());
    localStorage.removeItem(STORAGE_KEY);
  };

  const selectConversation = async (conversationId) => {
    if (!state.sessionId || !conversationId) return;

    setState((prev) => ({
      ...prev,
      activeConversationId: conversationId,
    }));

    try {
      await fetch(`/sessions/${state.sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active_conversation_id: conversationId }),
      });
    } catch (error) {
      console.error('Failed to persist active conversation', error);
    }

    const hasMessages = Boolean(state.messagesByConversationId[conversationId]);
    if (!hasMessages) {
      await loadConversationMessages(conversationId);
    }
  };

  const loadConversationMessages = async (conversationId) => {
    if (!state.sessionId || !conversationId) return [];
    try {
      const response = await fetch(
        `/sessions/${state.sessionId}/conversations/${conversationId}/messages?limit=200`,
      );
      const data = await response.json();
      if (response.ok && data.success) {
        const mappedMessages = (data.messages || []).map(mapMessageDto);
        replaceConversationMessages(conversationId, mappedMessages);
        return mappedMessages;
      }
    } catch (error) {
      console.error('Failed to load conversation messages', error);
    }
    return [];
  };

  const refreshSession = async () => {
    if (!state.sessionId) return;
    const response = await fetch(`/sessions/${state.sessionId}`);
    const data = await response.json();
    if (!response.ok || !data.success) return;

    const serverSession = data.session || {};
    setState((prev) => ({
      ...prev,
      sessionId: serverSession.id || prev.sessionId,
      activeConversationId: serverSession.last_active_conversation_id || prev.activeConversationId,
      conversations: sortByUpdatedAt(serverSession.conversations || prev.conversations),
    }));
  };

  const value = {
    state,
    session,
    activeConversation,
    activeMessages,
    setSessionIdentity,
    setConversations,
    upsertConversation,
    replaceConversationMessages,
    appendChatMessage,
    updateChatMessage,
    clearChatMessages,
    updateSession,
    clearSession,
    selectConversation,
    loadConversationMessages,
    refreshSession,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  return useContext(SessionContext);
}
