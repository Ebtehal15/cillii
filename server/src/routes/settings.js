const express = require('express');
const { db } = require('../db');

const router = express.Router();

const SETTINGS_KEY = 'column_visibility';

const DEFAULT_VISIBILITY = {
  specialId: true,
  mainCategory: true,
  quality: true,
  className: true,
  classFeatures: true,
  classWeight: true,
  classPrice: true,
  classVideo: true,
};

const normalizeVisibility = (visibility = {}) => {
  const normalized = { ...DEFAULT_VISIBILITY };
  Object.keys(DEFAULT_VISIBILITY).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(visibility, key)) {
      normalized[key] = Boolean(visibility[key]);
    }
  });
  if (!Object.values(normalized).some(Boolean)) {
    return { ...DEFAULT_VISIBILITY };
  }
  return normalized;
};

router.get('/columns', (_req, res) => {
  db.get('SELECT value FROM settings WHERE key = ?', [SETTINGS_KEY], (err, row) => {
    if (err) {
      res.status(500).json({ message: 'Failed to load column visibility', error: err.message });
      return;
    }
    if (!row) {
      res.json(DEFAULT_VISIBILITY);
      return;
    }
    try {
      const parsed = JSON.parse(row.value);
      res.json(normalizeVisibility(parsed));
    } catch {
      res.json(DEFAULT_VISIBILITY);
    }
  });
});

router.put('/columns', (req, res) => {
  const { columns } = req.body || {};
  if (!columns || typeof columns !== 'object') {
    res.status(400).json({ message: 'Invalid payload. Expected "columns" object.' });
    return;
  }

  const normalized = normalizeVisibility(columns);
  const value = JSON.stringify(normalized);

  db.run(
    `
      INSERT INTO settings(key, value)
      VALUES(?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
    [SETTINGS_KEY, value],
    (err) => {
      if (err) {
        res.status(500).json({ message: 'Failed to update column visibility', error: err.message });
        return;
      }
      res.json(normalized);
    },
  );
});

module.exports = {
  router,
  DEFAULT_VISIBILITY,
};


