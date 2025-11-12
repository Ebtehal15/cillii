require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./db');
const classesRouter = require('./routes/classes');
const { router: settingsRouter } = require('./routes/settings');

initializeDatabase();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 📁 Uploads folder path
const uploadsPath = path.join(__dirname, '..', 'uploads');

// ✅ Static uploads route with proper headers
app.use(
  '/uploads',
  express.static(uploadsPath, {
    setHeaders(res, filePath) {
      // Ensure correct MIME type for videos
      if (filePath.endsWith('.mp4')) {
        res.setHeader('Content-Type', 'video/mp4');
      }

      // CORS and cross-origin headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    },
  }),
);

// ✅ Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ✅ API routes
app.use('/api/classes', classesRouter);
app.use('/api/settings', settingsRouter);

// ✅ Start server
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

module.exports = app;
