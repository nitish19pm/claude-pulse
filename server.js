const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// ── Product Hunt (coming soon) ────────────────────────────────────────────
app.get('/api/producthunt', (req, res) => {
  res.json({ posts: [], fetchedAt: Date.now(), disabled: true });
});

// ── Reddit (disabled until OAuth credentials are configured) ──────────────
app.get('/api/reddit', async (req, res) => {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.json({ posts: [], fetchedAt: Date.now(), disabled: true, message: 'Reddit credentials not configured' });
  }
  // OAuth logic can be added here later
  res.json({ posts: [], fetchedAt: Date.now(), disabled: true });
});

// Local dev
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Claude Pulse running at http://localhost:${PORT}`);
  });
}

module.exports = app;
