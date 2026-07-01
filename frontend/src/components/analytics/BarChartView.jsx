import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell
} from 'recharts';
import { useAnalyticsData } from './AnalyticsContext';

function isNumericValue(v) {
  if (v === null || v === undefined || v === '') return false;
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'string') return v.trim() !== '' && !Number.isNaN(Number(v.trim()));
  return false;
}

function classifyColumns(rows) {
  if (!rows.length) return { categorical: [], numeric: [] };
  const keys = Object.keys(rows[0]);
  const numeric = keys.filter(k => rows.some(r => isNumericValue(r[k])));
  const categorical = keys.filter(k => !numeric.includes(k) || rows.some(r => typeof r[k] === 'string' && !isNumericValue(r[k])));
  // Ensure at least one categorical column — if all are numeric, offer all as potential categories
  const finalCategorical = categorical.length > 0 ? categorical : keys;
  return { categorical: finalCategorical, numeric };
}

const COLORS = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316',
];

export default function BarChartView() {
  const { data } = useAnalyticsData();
  const { categorical, numeric } = useMemo(() => classifyColumns(data), [data]);

  const [xCol, setXCol] = useState('');
  const [yCol, setYCol] = useState('');

  const effectiveX = xCol || categorical[0] || '';
  const effectiveY = yCol || numeric[0] || '';

  const chartData = useMemo(() => {
    if (!effectiveX || !effectiveY || !data.length) return [];

    const grouped = {};
    for (const row of data) {
      const key = String(row[effectiveX] ?? 'N/A');
      const val = Number(row[effectiveY]);
      if (!Number.isFinite(val)) continue;
      grouped[key] = (grouped[key] || 0) + val;
    }

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [data, effectiveX, effectiveY]);

  if (!categorical.length || !numeric.length) {
    return <div className="analytics-empty"><p>Need at least one categorical and one numeric column.</p></div>;
  }

  return (
    <div>
      <div className="analytics-selectors">
        <div className="analytics-selector-group">
          <label>X Axis (category)</label>
          <select value={effectiveX} onChange={e => setXCol(e.target.value)}>
            {categorical.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="analytics-selector-group">
          <label>Y Axis (numeric)</label>
          <select value={effectiveY} onChange={e => setYCol(e.target.value)}>
            {numeric.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
      </div>

      <div className="analytics-stats">
        <div className="analytics-stat">
          <div className="stat-label">Categories</div>
          <div className="stat-value accent">{chartData.length}</div>
        </div>
        <div className="analytics-stat">
          <div className="stat-label">Total</div>
          <div className="stat-value">{chartData.reduce((s, d) => s + d.value, 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="analytics-chart-container">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={chartData} margin={{ top: 10, right: 30, bottom: 40, left: 10 }}>
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.7} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                stroke="rgba(148,163,184,0.2)"
                angle={-35}
                textAnchor="end"
                interval={0}
                height={60}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                stroke="rgba(148,163,184,0.2)"
              />
              <Tooltip
                contentStyle={{ background: 'rgba(30,41,59,0.95)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8 }}
                labelStyle={{ color: '#e2e8f0' }}
                itemStyle={{ color: '#94a3b8' }}
              />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              <Bar dataKey="value" name={effectiveY} radius={[6, 6, 0, 0]} maxBarSize={56}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ color: '#64748b' }}>Select columns to generate a bar chart.</p>
        )}
      </div>
    </div>
  );
}
