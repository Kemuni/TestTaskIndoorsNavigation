try {
  require('dotenv').config();
} catch {
  // dotenv not available — rely on process.env set externally
}

const target = process.env['API_ORIGIN'] || process.env['api_origin'] || 'http://127.0.0.1:8000';

module.exports = {
  '/api': {
    target,
    changeOrigin: true,
    secure: false,
    logLevel: 'warn',
  },
  '/ws': {
    target,
    changeOrigin: true,
    secure: false,
    ws: true,
    logLevel: 'warn',
  },
};
