const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// ── Product Hunt ──────────────────────────────────────────────────────────
app.get('/api/producthunt', async (req, res) => {
  try {
    const response = await axios.get('https://www.producthunt.com/search?q=claude', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    const posts = [];

    $('[data-test="post-item"], .styles_item__Dk_nz, [class*="item_"]').each((_, el) => {
      const titleEl = $(el).find('h3, [class*="title"], [class*="name"]').first();
      const title = titleEl.text().trim();
      if (!title) return;
      const linkEl = $(el).find('a[href*="/posts/"]').first();
      const href = linkEl.attr('href') ?? '';
      const link = href.startsWith('http') ? href : `https://www.producthunt.com${href}`;
      const votesText = $(el).find('[class*="vote"], [class*="upvote"], button').first().text().replace(/[^0-9]/g, '');
      if (title && href) {
        posts.push({ id: href, title, url: link, permalink: link, upvotes: parseInt(votesText, 10) || 0, createdAt: null, source: 'producthunt' });
      }
    });

    if (posts.length === 0) {
      $('a[href*="/posts/"]').each((_, el) => {
        const $el = $(el);
        const title = $el.attr('aria-label') || $el.text().trim();
        const href = $el.attr('href') ?? '';
        if (!title || !href || posts.find((p) => p.id === href)) return;
        posts.push({ id: href, title, url: `https://www.producthunt.com${href}`, permalink: `https://www.producthunt.com${href}`, upvotes: 0, createdAt: null, source: 'producthunt' });
      });
    }

    res.json({ posts: posts.slice(0, 30), fetchedAt: Date.now() });
  } catch (err) {
    console.error('Product Hunt fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch Product Hunt posts', detail: err.message });
  }
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
