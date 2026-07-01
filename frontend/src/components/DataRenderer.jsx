import React, { useMemo, useState } from 'react';
import './data_renderer.css';

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
  return headers.filter((column) =>
    rows.some((row) => isNumericValue(row?.[column]))
  );
}

function extractRows(payload) {
  if (!payload) return null;
  if (Array.isArray(payload)) return payload;

  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.rows)) {
      if (
        payload.rows.length > 0 &&
        payload.rows[0] &&
        typeof payload.rows[0] === 'object' &&
        Array.isArray(payload.rows[0].rows)
      ) {
        return payload.rows[0].rows;
      }
      return payload.rows;
    }

    if (Array.isArray(payload.preview)) {
      const firstPreview = payload.preview[0];
      if (firstPreview && typeof firstPreview === 'object') {
        if (Array.isArray(firstPreview.rows)) return firstPreview.rows;
        if (Array.isArray(firstPreview.data)) return firstPreview.data;
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
  const numericColumns = useMemo(
    () => getNumericColumns(dataArray || []),
    [dataArray]
  );

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
        body: JSON.stringify({
          data: dataArray,
          x_column: xColumn,
          y_column: yColumn
        })
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
    return (
      <div className="data-empty">
        No data available to display.
      </div>
    );
  }

  if (viewMode === 'table' && dataArray && dataArray.length > 0) {
    const sampleRow = dataArray[0];
    const headers =
      typeof sampleRow === 'object' && sampleRow !== null
        ? Object.keys(sampleRow)
        : ['Value'];

    const minX = Math.min(...(regression?.x_values || [0]));
    const maxX = Math.max(...(regression?.x_values || [1]));
    const minY = Math.min(...(regression?.y_values || [0]));
    const maxY = Math.max(...(regression?.y_values || [1]));

    const scaleX = (x) =>
      20 + ((x - minX) / (maxX - minX || 1)) * 260;

    const scaleY = (y) =>
      140 - ((y - minY) / (maxY - minY || 1)) * 120;

    return (
      <div className="data-renderer">
        <div className="controls">
          <label className="label">
            X axis
            <select
              className="select"
              value={xColumn}
              onChange={(e) => setXColumn(e.target.value)}
            >
              {numericColumns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
          </label>

          <label className="label">
            Y axis
            <select
              className="select"
              value={yColumn}
              onChange={(e) => setYColumn(e.target.value)}
            >
              {numericColumns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="button"
            onClick={computeRegression}
            disabled={isComputing || !xColumn || !yColumn}
          >
            {isComputing ? 'Computing…' : 'Compute Regression'}
          </button>
        </div>

        {regressionError && (
          <div className="error">{regressionError}</div>
        )}

        {regression && (
          <div className="regression-card">
            <div>
              <strong>
                y = {regression.slope.toFixed(3)}x +{' '}
                {regression.intercept.toFixed(3)}
              </strong>
            </div>

            <div>
              Residual std. dev.:{' '}
              {regression.standard_deviation.toFixed(3)}
            </div>

            <div className="chart-container">
              <svg viewBox="0 0 300 160" width="100%" height="100%">
                <line x1="20" y1="140" x2="280" y2="140" stroke="#94a3b8" />
                <line x1="20" y1="20" x2="20" y2="140" stroke="#94a3b8" />

                {regression.x_values.map((xValue, i) => (
                  <circle
                    key={i}
                    cx={scaleX(xValue)}
                    cy={scaleY(regression.y_values[i])}
                    r="3"
                    fill="#2563eb"
                  />
                ))}

                <line
                  x1={scaleX(regression.x_values[0])}
                  y1={scaleY(regression.line_y_values[0])}
                  x2={scaleX(regression.x_values.at(-1))}
                  y2={scaleY(regression.line_y_values[1])}
                  stroke="#0f766e"
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>
        )}

        <div className="table-wrapper">
          <table className="preview-table">
            <thead>
              <tr>
                {headers.map((key) => (
                  <th key={key}>{key}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {dataArray.map((row, rIdx) => {
                const isObj =
                  typeof row === 'object' && row !== null;

                return (
                  <tr key={rIdx}>
                    {headers.map((col) => {
                      const value = isObj ? row[col] : row;

                      return (
                        <td key={col}>
                          {typeof value === 'object' && value !== null
                            ? JSON.stringify(value)
                            : String(value ?? '')}
                        </td>
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

  return (
    <pre className="fallback">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}