const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const REDDIT_HEADERS = {
  'User-Agent': 'ClaudePulse/1.0',
};

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/reddit', async (req, res) => {
  try {
    const [newPosts, searchPosts] = await Promise.all([
      axios.get('https://www.reddit.com/r/ClaudeAI/new.json?limit=25', {
        headers: REDDIT_HEADERS,
        timeout: 10000,
      }),
      axios.get('https://www.reddit.com/search.json?q=claude+anthropic&sort=new&limit=25', {
        headers: REDDIT_HEADERS,
        timeout: 10000,
      }),
    ]);

    const seenIds = new Set();
    const posts = [];

    const extract = (data) => {
      const children = data?.data?.children ?? [];
      for (const child of children) {
        const p = child.data;
        if (!p || seenIds.has(p.id)) continue;
        seenIds.add(p.id);
        posts.push({
          id: p.id,
          title: p.title,
          url: p.url,
          permalink: `https://www.reddit.com${p.permalink}`,
          upvotes: p.ups,
          subreddit: p.subreddit_name_prefixed,
          createdAt: p.created_utc * 1000,
          source: 'reddit',
        });
      }
    };

    extract(newPosts.data);
    extract(searchPosts.data);

    posts.sort((a, b) => b.createdAt - a.createdAt);
    res.json({ posts, fetchedAt: Date.now() });
  } catch (err) {
    console.error('Reddit fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch Reddit posts', detail: err.message });
  }
});

app.get('/api/producthunt', async (req, res) => {
  try {
    const response = await axios.get('https://www.producthunt.com/search?q=claude', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(response.data);
    const posts = [];

    // PH search results — selectors based on their current markup patterns
    $('[data-test="post-item"], .styles_item__Dk_nz, [class*="item_"]').each((_, el) => {
      const titleEl = $(el).find('h3, [class*="title"], [class*="name"]').first();
      const title = titleEl.text().trim();
      if (!title) return;

      const linkEl = $(el).find('a[href*="/posts/"]').first();
      const href = linkEl.attr('href') ?? '';
      const link = href.startsWith('http') ? href : `https://www.producthunt.com${href}`;

      const votesText = $(el)
        .find('[class*="vote"], [class*="upvote"], button')
        .first()
        .text()
        .replace(/[^0-9]/g, '');
      const upvotes = parseInt(votesText, 10) || 0;

      if (title && href) {
        posts.push({
          id: href,
          title,
          url: link,
          permalink: link,
          upvotes,
          createdAt: null,
          source: 'producthunt',
        });
      }
    });

    // Fallback: grab any post links if the component selectors changed
    if (posts.length === 0) {
      $('a[href*="/posts/"]').each((_, el) => {
        const $el = $(el);
        const title = $el.attr('aria-label') || $el.text().trim();
        const href = $el.attr('href') ?? '';
        if (!title || !href || posts.find((p) => p.id === href)) return;
        posts.push({
          id: href,
          title,
          url: `https://www.producthunt.com${href}`,
          permalink: `https://www.producthunt.com${href}`,
          upvotes: 0,
          createdAt: null,
          source: 'producthunt',
        });
      });
    }

    res.json({ posts: posts.slice(0, 30), fetchedAt: Date.now() });
  } catch (err) {
    console.error('Product Hunt fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch Product Hunt posts', detail: err.message });
  }
});

// Local dev
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Claude Pulse running at http://localhost:${PORT}`);
  });
}

module.exports = app;
