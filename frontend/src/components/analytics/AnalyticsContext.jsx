import React, { createContext, useContext, useState } from 'react';

const AnalyticsContext = createContext(null);

export function AnalyticsProvider({ children }) {
  const [data, setData] = useState([]);

  return (
    <AnalyticsContext.Provider value={{ data, setData }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalyticsData() {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) {
    throw new Error('useAnalyticsData must be used within an AnalyticsProvider');
  }
  return ctx;
}

export default AnalyticsContext;
