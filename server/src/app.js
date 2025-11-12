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

const uploadsPath = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsPath));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/classes', classesRouter);
app.use('/api/settings', settingsRouter);

const port = process.env.PORT || 4000;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${port}`);
});

module.exports = app;



