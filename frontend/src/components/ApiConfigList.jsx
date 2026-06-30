import React from 'react';

export default function ApiConfigList({ apiConfigs, editApiConfig, previewApiConfig, deleteApiConfig }) {
  return (
    <div id="apiConfigList" className="api-list">
      {apiConfigs.length === 0 ? (
        <p>No API configurations yet.</p>
      ) : (
        apiConfigs.map((config) => (
          <div className="api-item" key={config.id}>
            <strong>{config.name}</strong>
            <div>{config.endpoint}</div>
            <div>{config.method}</div>
            <div className="controls">
              <button type="button" onClick={() => editApiConfig(config)}>Edit</button>
              <button type="button" onClick={() => previewApiConfig(config.id)}>Preview</button>
              <button type="button" onClick={() => deleteApiConfig(config.id)}>Delete</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
