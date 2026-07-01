import React from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAnalyticsData } from './AnalyticsContext';
import './analytics.css';

export default function AnalyticsLayout() {
  const { data } = useAnalyticsData();

  if (!data || data.length === 0) {
    return (
      <div className="analytics-root">
        <div className="analytics-empty">
          <div className="empty-icon">📊</div>
          <h2>No Dataset Loaded</h2>
          <p>Execute a query and click "Open in Analytics" to visualize your data here.</p>
          <Link to="/">← Back to QueryCrafter</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-root">
      <Link to="/" className="analytics-back">← Back to QueryCrafter</Link>

      <div className="analytics-header">
        <h1>Analytics Dashboard</h1>
        <p>{data.length} rows · {Object.keys(data[0]).length} columns</p>
      </div>

      <nav className="analytics-tabs">
        <NavLink
          to="/dashboard/analytics/regression"
          className={({ isActive }) => `analytics-tab${isActive ? ' active' : ''}`}
        >
          📈 Regression
        </NavLink>
        <NavLink
          to="/dashboard/analytics/barchart"
          className={({ isActive }) => `analytics-tab${isActive ? ' active' : ''}`}
        >
          📊 Bar Chart
        </NavLink>
        <NavLink
          to="/dashboard/analytics/piechart"
          className={({ isActive }) => `analytics-tab${isActive ? ' active' : ''}`}
        >
          🥧 Pie Chart
        </NavLink>
      </nav>

      <div className="analytics-card">
        <Outlet />
      </div>
    </div>
  );
}
