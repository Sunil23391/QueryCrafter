import React from 'react';

export default function DataRenderer({ data, viewMode }) {
  if (!data) return null;

  // Determine array of rows
  let dataArray = null;
  if (data.preview && Array.isArray(data.preview) && data.preview[0]?.rows) {
    dataArray = data.preview[0].rows;
  } else if (data.rows && Array.isArray(data.rows) && data.rows[0]?.rows) {
    dataArray = data.rows[0].rows;
  } else if (Array.isArray(data)) {
    dataArray = data;
  }

  if (viewMode === 'table' && dataArray && dataArray.length > 0) {
    const sampleRow = dataArray[0];
    const headers = typeof sampleRow === 'object' && sampleRow !== null ? Object.keys(sampleRow) : ['Value'];
    return (
      <div className="table-wrapper" style={{ overflowX: 'auto', marginTop: '10px', maxWidth: '100%', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
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
    );
  }

  // Default JSON view
  return <pre style={{ marginTop: '10px', background: '#f4f4f5', padding: '10px', borderRadius: '4px', overflowX: 'auto' }}>{JSON.stringify(data, null, 2)}</pre>;
}
