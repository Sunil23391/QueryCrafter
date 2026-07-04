import React, { useState, useMemo, useCallback } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Sector
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
  const finalCategorical = categorical.length > 0 ? categorical : keys;
  return { categorical: finalCategorical, numeric };
}

const COLORS = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316',
  '#84cc16', '#f43f5e', '#0ea5e9', '#a855f7', '#22c55e',
];

// Active sector render for hover state
const renderActiveShape = (props) => {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent, value
  } = props;

  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" fill="#e2e8f0" fontSize={14} fontWeight={600}>
        {payload.name}
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#94a3b8" fontSize={12}>
        {value.toLocaleString()} ({(percent * 100).toFixed(1)}%)
      </text>
      <Sector
        cx={cx} cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx} cy={cy}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 16}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.4}
      />
    </g>
  );
};

export default function PieChartView() {
  const { data } = useAnalyticsData();
  const { categorical, numeric } = useMemo(() => classifyColumns(data), [data]);

  const [catCol, setCatCol] = useState('');
  const [valCol, setValCol] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const effectiveCat = catCol || categorical[0] || '';
  const effectiveVal = valCol || numeric[0] || '';

  const chartData = useMemo(() => {
    if (!effectiveCat || !effectiveVal || !data.length) return [];

    const grouped = {};
    for (const row of data) {
      const key = String(row[effectiveCat] ?? 'N/A');
      const val = Number(row[effectiveVal]);
      if (!Number.isFinite(val)) continue;
      grouped[key] = (grouped[key] || 0) + val;
    }

    const total = Object.values(grouped).reduce((s, v) => s + v, 0);
    return Object.entries(grouped)
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100,
        percent: total > 0 ? ((value / total) * 100).toFixed(1) : '0.0',
      }))
      .sort((a, b) => b.value - a.value);
  }, [data, effectiveCat, effectiveVal]);

  const onPieEnter = useCallback((_, index) => {
    setActiveIndex(index);
  }, []);

  if (!categorical.length || !numeric.length) {
    return <div className="analytics-empty"><p>Need at least one categorical and one numeric column.</p></div>;
  }

  return (
    <div>
      <div className="analytics-selectors">
        <div className="analytics-selector-group">
          <label>Category</label>
          <select value={effectiveCat} onChange={e => setCatCol(e.target.value)}>
            {categorical.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="analytics-selector-group">
          <label>Value (numeric)</label>
          <select value={effectiveVal} onChange={e => setValCol(e.target.value)}>
            {numeric.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
      </div>

      <div className="analytics-stats">
        <div className="analytics-stat">
          <div className="stat-label">Slices</div>
          <div className="stat-value accent">{chartData.length}</div>
        </div>
        <div className="analytics-stat">
          <div className="stat-label">Total Value</div>
          <div className="stat-value">{chartData.reduce((s, d) => s + d.value, 0).toLocaleString()}</div>
        </div>
        {chartData.length > 0 && (
          <div className="analytics-stat">
            <div className="stat-label">Largest Slice</div>
            <div className="stat-value">{chartData[0].name} ({chartData[0].percent}%)</div>
          </div>
        )}
      </div>

      <div className="analytics-chart-container">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={140}
                dataKey="value"
                onMouseEnter={onPieEnter}
                paddingAngle={2}
              >
                {chartData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={COLORS[i % COLORS.length]}
                    stroke="rgba(15,23,42,0.6)"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'rgba(30,41,59,0.95)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8 }}
                labelStyle={{ color: '#e2e8f0' }}
                itemStyle={{ color: '#94a3b8' }}
                formatter={(value, name) => [`${value.toLocaleString()} (${chartData.find(d => d.name === name)?.percent ?? 0}%)`, name]}
              />
              <Legend
                wrapperStyle={{ color: '#94a3b8', fontSize: 12 }}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ color: '#64748b' }}>Select columns to generate a pie chart.</p>
        )}
      </div>
    </div>
  );
}
