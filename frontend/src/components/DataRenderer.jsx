import React, { useMemo, useState } from 'react';

function isNumericValue(value) {
  if (value === null || value === undefined || value === '') return false;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed !== '' && !Number.isNaN(Number(trimmed));
  }
  return false;
}

function getNumericColumns(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];

  const headers = Object.keys(rows[0]);
  return headers.filter((column) => rows.some((row) => isNumericValue(row?.[column])));
}

function extractRows(payload) {
  if (!payload) return null;
  if (Array.isArray(payload)) return payload;

  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.rows)) {
      if (payload.rows.length > 0 && payload.rows[0] && typeof payload.rows[0] === 'object' && Array.isArray(payload.rows[0].rows)) {
        return payload.rows[0].rows;
      }
      return payload.rows;
    }

    if (Array.isArray(payload.preview)) {
      const firstPreview = payload.preview[0];
      if (firstPreview && typeof firstPreview === 'object') {
        if (Array.isArray(firstPreview.rows)) {
          return firstPreview.rows;
        }
        if (Array.isArray(firstPreview.data)) {
          return firstPreview.data;
        }
      }
      return payload.preview;
    }

    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.results)) return payload.results;
  }

  return null;
}

export default function DataRenderer({ data, viewMode }) {
  const [xColumn, setXColumn] = useState('');
  const [yColumn, setYColumn] = useState('');
  const [regression, setRegression] = useState(null);
  const [regressionError, setRegressionError] = useState('');
  const [isComputing, setIsComputing] = useState(false);

  if (!data) return null;

  const dataArray = extractRows(data);

  const numericColumns = useMemo(() => getNumericColumns(dataArray || []), [dataArray]);

  React.useEffect(() => {
    if (numericColumns.length > 0) {
      setXColumn((prev) => prev || numericColumns[0]);
      setYColumn((prev) => prev || numericColumns[1] || numericColumns[0]);
    }
  }, [numericColumns]);

  const computeRegression = async () => {
    if (!dataArray || !xColumn || !yColumn) return;
    setIsComputing(true);
    setRegressionError('');
    try {
      const response = await fetch('/api/analytics/regression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: dataArray, x_column: xColumn, y_column: yColumn })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Unable to compute regression.');
      }
      setRegression(payload);
    } catch (err) {
      setRegression(null);
      setRegressionError(err.message || 'Unable to compute regression.');
    } finally {
      setIsComputing(false);
    }
  };
  if (viewMode === 'table' && (!dataArray || dataArray.length === 0)) {
    return <div style={{ marginTop: '10px', color: '#6b7280', fontSize: '14px' }}>No data available to display.</div>;
  }
  
  if (viewMode === 'table' && dataArray && dataArray.length > 0) {
    const sampleRow = dataArray[0];
    const headers = typeof sampleRow === 'object' && sampleRow !== null ? Object.keys(sampleRow) : ['Value'];
    return (
      <div style={{ marginTop: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '10px' }}>
          <label style={{ fontSize: '12px', color: '#374151' }}>
            X axis
            <select value={xColumn} onChange={(e) => setXColumn(e.target.value)} style={{ display: 'block', marginTop: '4px', padding: '4px 6px', borderRadius: '4px', border: '1px solid #d1d5db' }}>
              {numericColumns.map((column) => (
                <option key={column} value={column}>{column}</option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: '12px', color: '#374151' }}>
            Y axis
            <select value={yColumn} onChange={(e) => setYColumn(e.target.value)} style={{ display: 'block', marginTop: '4px', padding: '4px 6px', borderRadius: '4px', border: '1px solid #d1d5db' }}>
              {numericColumns.map((column) => (
                <option key={column} value={column}>{column}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={computeRegression} disabled={isComputing || !xColumn || !yColumn} style={{ alignSelf: 'flex-end', padding: '6px 10px', borderRadius: '4px', border: '1px solid #2563eb', background: '#2563eb', color: '#fff', cursor: 'pointer' }}>
            {isComputing ? 'Computing…' : 'Compute Regression'}
          </button>
        </div>
        {regressionError ? <div style={{ color: '#b91c1c', fontSize: '12px', marginBottom: '8px' }}>{regressionError}</div> : null}
        {regression ? (
          <div style={{ marginBottom: '12px', padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb', background: '#f8fafc' }}>
            <div style={{ fontSize: '12px', color: '#374151' }}>
              <strong>y = {regression.slope.toFixed(3)}x + {regression.intercept.toFixed(3)}</strong>
            </div>
            <div style={{ fontSize: '12px', color: '#374151', marginTop: '4px' }}>Residual std. dev.: {regression.standard_deviation.toFixed(3)}</div>
            <div style={{ marginTop: '8px', height: '180px', background: '#fff', borderRadius: '6px', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 300 160" width="100%" height="100%" aria-label="Regression chart">
                <line x1="20" y1="140" x2="280" y2="140" stroke="#94a3b8" />
                <line x1="20" y1="20" x2="20" y2="140" stroke="#94a3b8" />
                {regression.x_values.map((xValue, index) => {
                  const x = 20 + ((xValue - Math.min(...regression.x_values)) / (Math.max(...regression.x_values) - Math.min(...regression.x_values) || 1)) * 260;
                  const y = 140 - ((regression.y_values[index] - Math.min(...regression.y_values)) / (Math.max(...regression.y_values) - Math.min(...regression.y_values) || 1)) * 120;
                  return <circle key={`${xValue}-${index}`} cx={x} cy={y} r="3" fill="#2563eb" />;
                })}
                <line x1="20" y1={140 - ((regression.line_y_values[0] - Math.min(...regression.y_values)) / (Math.max(...regression.y_values) - Math.min(...regression.y_values) || 1)) * 120} x2="280" y2={140 - ((regression.line_y_values[1] - Math.min(...regression.y_values)) / (Math.max(...regression.y_values) - Math.min(...regression.y_values) || 1)) * 120} stroke="#0f766e" strokeWidth="2" />
                <line x1="20" y1={140 - ((regression.line_y_values[0] + regression.standard_deviation - Math.min(...regression.y_values)) / (Math.max(...regression.y_values) - Math.min(...regression.y_values) || 1)) * 120} x2="280" y2={140 - ((regression.line_y_values[1] + regression.standard_deviation - Math.min(...regression.y_values)) / (Math.max(...regression.y_values) - Math.min(...regression.y_values) || 1)) * 120} stroke="#f59e0b" strokeDasharray="4 4" />
                <line x1="20" y1={140 - ((regression.line_y_values[0] - regression.standard_deviation - Math.min(...regression.y_values)) / (Math.max(...regression.y_values) - Math.min(...regression.y_values) || 1)) * 120} x2="280" y2={140 - ((regression.line_y_values[1] - regression.standard_deviation - Math.min(...regression.y_values)) / (Math.max(...regression.y_values) - Math.min(...regression.y_values) || 1)) * 120} stroke="#f59e0b" strokeDasharray="4 4" />
              </svg>
            </div>
          </div>
        ) : null}
        <div className="table-wrapper" style={{ overflowX: 'auto', maxWidth: '100%', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
          <table className="preview-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr>{headers.map((key) => (
                <th key={key} style={{ padding: '8px 12px', fontWeight: '600', color: '#374151' }}>{key}</th>
              ))}</tr>
            </thead>
            <tbody>
              {dataArray.map((row, rIdx) => {
                const isObj = typeof row === 'object' && row !== null;
                return (
                  <tr key={rIdx} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: rIdx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                    {headers.map((col) => {
                      const value = isObj ? row[col] : row;
                      return (
                        <td key={col} style={{ padding: '8px 12px', color: '#4b5563' }}>{typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '')}</td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return <pre style={{ marginTop: '10px', background: '#f4f4f5', padding: '10px', borderRadius: '4px', overflowX: 'auto' }}>{JSON.stringify(data, null, 2)}</pre>;
}
