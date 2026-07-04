export const extractRowsForAnalytics = (/** @type {{ rows: string | any[]; preview: any[]; data: any; results: any; }} */ payload) => {
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