import React, { createContext, useContext, useEffect, useState } from 'react';

const SessionContext = createContext(null);

const STORAGE_KEY = 'querycrafter_session';

const defaultState = {
  sessionId: null,
  schema: '',
  domain: 'General',
  chatMessages: [],
};

export function SessionProvider({ children }) {
  const [session, setSession] = useState(defaultState);

  // Load from localStorage on startup
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSession(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load session', e);
    }
  }, []);

  // Persist on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  const updateSession = (patch) => {
    setSession((prev) => ({
      ...prev,
      ...patch,
    }));
  };

  const clearSession = () => {
    setSession(defaultState);
    localStorage.removeItem(STORAGE_KEY);
  };

  const appendChatMessage = (message) => {
    setSession((prev) => ({
      ...prev,
      chatMessages: [...prev.chatMessages, message],
    }));
  };

  const updateChatMessage = (index, updatedMessage) => { // Renamed 'message' to 'updatedMessage' for clarity
    setSession((prev) => ({
      ...prev,
      chatMessages: prev.chatMessages.map((msg, idx) => (idx === index ? updatedMessage : msg)),
    }));
  };

  const clearChatMessages = () => {
    setSession((prev) => ({
      ...prev,
      chatMessages: [],
    }));
  };

  return (
    <SessionContext.Provider value={{ session, updateSession, clearSession, appendChatMessage, updateChatMessage, clearChatMessages }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}