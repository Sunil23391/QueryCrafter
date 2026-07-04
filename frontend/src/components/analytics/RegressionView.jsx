import React, { useState, useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Line, Area, ComposedChart, Legend
} from 'recharts';
import { useAnalyticsData } from './AnalyticsContext';

function isNumericValue(v) {
  if (v === null || v === undefined || v === '') return false;
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'string') return v.trim() !== '' && !Number.isNaN(Number(v.trim()));
  return false;
}

function getNumericKeys(rows) {
  if (!rows.length) return [];
  return Object.keys(rows[0]).filter(k =>
    rows.some(r => isNumericValue(r[k]))
  );
}

function linearRegression(points) {
  const n = points.length;
  if (n < 2) return null;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (const { x, y } of points) {
    sumX += x; sumY += y; sumXY += x * y; sumXX += x * x;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const yMean = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (const { x, y } of points) {
    const yPred = slope * x + intercept;
    ssRes += (y - yPred) ** 2;
    ssTot += (y - yMean) ** 2;
  }
  const rSquared = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  const stdDev = Math.sqrt(ssRes / n);
  return { slope, intercept, rSquared, stdDev };
}

export default function RegressionView() {
  const { data } = useAnalyticsData();
  const numericKeys = useMemo(() => getNumericKeys(data), [data]);

  const [xCol, setXCol] = useState('');
  const [yCol, setYCol] = useState('');

  // Auto-select first two numeric columns on mount
  const effectiveX = xCol || numericKeys[0] || '';
  const effectiveY = yCol || numericKeys[1] || numericKeys[0] || '';

  const { chartData, reg } = useMemo(() => {
    if (!effectiveX || !effectiveY || !data.length) return { chartData: [], reg: null };

    const points = data
      .map(r => ({ x: Number(r[effectiveX]), y: Number(r[effectiveY]) }))
      .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));

    const reg = linearRegression(points);
    if (!reg) return { chartData: points, reg: null };

    // Build combined data: scatter points + regression line + std-dev bands
    const xMin = Math.min(...points.map(p => p.x));
    const xMax = Math.max(...points.map(p => p.x));
    const steps = 60;
    const stepSize = (xMax - xMin) / steps || 1;

    const lineData = [];
    for (let i = 0; i <= steps; i++) {
      const xi = xMin + i * stepSize;
      const yPred = reg.slope * xi + reg.intercept;
      lineData.push({
        x: xi,
        regressionY: yPred,
        upperBand: yPred + reg.stdDev,
        lowerBand: yPred - reg.stdDev,
      });
    }

    return { chartData: { scatter: points, line: lineData }, reg };
  }, [data, effectiveX, effectiveY]);

  if (!numericKeys.length) {
    return <div className="analytics-empty"><p>No numeric columns found in the dataset.</p></div>;
  }

  return (
    <div>
      <div className="analytics-selectors">
        <div className="analytics-selector-group">
          <label>X Axis (numeric)</label>
          <select value={effectiveX} onChange={e => setXCol(e.target.value)}>
            {numericKeys.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="analytics-selector-group">
          <label>Y Axis (numeric)</label>
          <select value={effectiveY} onChange={e => setYCol(e.target.value)}>
            {numericKeys.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
      </div>

      {reg && (
        <div className="analytics-stats">
          <div className="analytics-stat">
            <div className="stat-label">Equation</div>
            <div className="stat-value" style={{ fontSize: 14 }}>
              y = {reg.slope.toFixed(4)}x + {reg.intercept.toFixed(4)}
            </div>
          </div>
          <div className="analytics-stat">
            <div className="stat-label">R²</div>
            <div className="stat-value accent">{reg.rSquared.toFixed(4)}</div>
          </div>
          <div className="analytics-stat">
            <div className="stat-label">Std. Deviation</div>
            <div className="stat-value">{reg.stdDev.toFixed(4)}</div>
          </div>
        </div>
      )}

      <div className="analytics-chart-container">
        {chartData.scatter && chartData.scatter.length > 0 ? (
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart margin={{ top: 10, right: 30, bottom: 10, left: 10 }}>
              <defs>
                <linearGradient id="bandGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
              <XAxis
                dataKey="x"
                type="number"
                name={effectiveX}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                stroke="rgba(148,163,184,0.2)"
                label={{ value: effectiveX, position: 'insideBottomRight', offset: -5, fill: '#64748b', fontSize: 12 }}
              />
              <YAxis
                type="number"
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                stroke="rgba(148,163,184,0.2)"
                label={{ value: effectiveY, angle: -90, position: 'insideLeft', offset: 10, fill: '#64748b', fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{ background: 'rgba(30,41,59,0.95)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8 }}
                labelStyle={{ color: '#e2e8f0' }}
                itemStyle={{ color: '#94a3b8' }}
              />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />

              {/* Std-dev band — rendered as area between upper and lower */}
              <Area
                data={chartData.line}
                dataKey="upperBand"
                stroke="none"
                fill="url(#bandGradient)"
                name="+1 Std Dev"
                dot={false}
                activeDot={false}
                legendType="none"
              />
              <Area
                data={chartData.line}
                dataKey="lowerBand"
                stroke="none"
                fill="rgba(15,23,42,0.9)"
                name="-1 Std Dev"
                dot={false}
                activeDot={false}
                legendType="none"
              />

              {/* Regression line */}
              <Line
                data={chartData.line}
                dataKey="regressionY"
                stroke="#818cf8"
                strokeWidth={2}
                dot={false}
                name="Regression Line"
                activeDot={false}
              />

              {/* Scatter points */}
              <Scatter
                data={chartData.scatter}
                dataKey="y"
                fill="#3b82f6"
                name="Data Points"
                r={4}
                fillOpacity={0.8}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ color: '#64748b' }}>Select columns to visualize regression.</p>
        )}
      </div>
    </div>
  );
}
