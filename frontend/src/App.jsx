import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './index.css';
import ApiConfigForm from './components/ApiConfigForm';
import ApiConfigList from './components/ApiConfigList';
import ChatPanel from './components/ChatPanel';
import DataRenderer from './components/DataRenderer';
import QueryCrafter from './components/QueryCrafter';
import { AnalyticsProvider, useAnalyticsData } from './components/analytics/AnalyticsContext';
import AnalyticsLayout from './components/analytics/AnalyticsLayout';
import RegressionView from './components/analytics/RegressionView';
import BarChartView from './components/analytics/BarChartView';
import PieChartView from './components/analytics/PieChartView';
import { extractRowsForAnalytics } from './utils/analytics';
import { useSession } from './context/SessionContext';


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

