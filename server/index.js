import express from 'express';
import cors from 'cors';
import { chromium } from 'playwright';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

/**
 * Extract article content from X/Twitter Article page
 * Returns structured content with images in their correct positions
 */
async function scrapeXArticle(url) {
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  });

  const page = await context.newPage();

  try {
    console.log(`Navigating to: ${url}`);

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait for article content
    try {
      await page.waitForSelector('article', { timeout: 15000 });
      console.log('Found article element');
    } catch {
      console.log('No article element found, continuing...');
    }

    // Wait for content to load
    await page.waitForTimeout(5000);

    // Scroll to load all content
    await page.evaluate(async () => {
      const delay = ms => new Promise(r => setTimeout(r, ms));
      for (let i = 0; i < 5; i++) {
        window.scrollBy(0, window.innerHeight);
        await delay(800);
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(2000);

    // Extract structured article data
    const articleData = await page.evaluate(() => {
      // Get author info
      const authorContainer = document.querySelector('[data-testid="User-Name"]');
      let authorName = 'Unknown';
      let authorHandle = '';
      let authorAvatar = '';

      if (authorContainer) {
        const spans = authorContainer.querySelectorAll('span');
        spans.forEach(span => {
          const text = span.textContent?.trim();
          if (text && !text.startsWith('@') && text.length > 1 && !authorName) {
            authorName = text;
          }
          if (text?.startsWith('@')) {
            authorHandle = text;
          }
        });
      }

      // Get avatar
      const avatarImg = document.querySelector('article img[src*="profile_images"]');
      if (avatarImg) {
        authorAvatar = avatarImg.src;
      }

      // Get the article title - look for the main headline
      let title = '';

      // Method 1: Look for h1 in article
      const h1 = document.querySelector('article h1');
      if (h1) {
        title = h1.textContent?.trim() || '';
      }

      // Method 2: Look for large text that's likely the title
      if (!title) {
        const possibleTitles = document.querySelectorAll('article [dir="auto"]');
        for (const el of possibleTitles) {
          const text = el.textContent?.trim();
          const style = window.getComputedStyle(el);
          const fontSize = parseFloat(style.fontSize);
          if (text && fontSize > 24 && text.length < 200 && text.length > 10) {
            title = text;
            break;
          }
        }
      }

      // Extract content blocks in order (text and images interleaved)
      const contentBlocks = [];
      const seenTexts = new Set();
      const seenImages = new Set();

      // Find the article content container
      const articleEl = document.querySelector('article');
      if (!articleEl) {
        return { title: '', author: { name: authorName, handle: authorHandle, avatar: authorAvatar }, blocks: [], coverImage: '' };
      }

      // Get cover image (first large image, usually the article cover)
      let coverImage = '';
      const firstImg = articleEl.querySelector('img[src*="pbs.twimg.com/media"]');
      if (firstImg) {
        let imgUrl = firstImg.src;
        if (imgUrl.includes('?')) {
          imgUrl = imgUrl.split('?')[0] + '?format=jpg&name=large';
        }
        coverImage = imgUrl;
        seenImages.add(imgUrl);
      }

      // Walk through the article to get content in order
      const walker = document.createTreeWalker(
        articleEl,
        NodeFilter.SHOW_ELEMENT,
        {
          acceptNode: (node) => {
            const tag = node.tagName.toLowerCase();
            // Accept text containers, images, and links
            if (tag === 'img' || tag === 'a' || tag === 'p' || tag === 'span' || tag === 'div' || tag === 'h2' || tag === 'h3') {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_SKIP;
          }
        }
      );

      let currentNode;
      while (currentNode = walker.nextNode()) {
        const tag = currentNode.tagName.toLowerCase();

        // Handle images
        if (tag === 'img') {
          const src = currentNode.src;
          if (src && src.includes('pbs.twimg.com/media') && !src.includes('profile_images')) {
            let imgUrl = src;
            if (imgUrl.includes('?')) {
              imgUrl = imgUrl.split('?')[0] + '?format=jpg&name=large';
            }
            if (!seenImages.has(imgUrl)) {
              seenImages.add(imgUrl);
              contentBlocks.push({ type: 'image', url: imgUrl });
            }
          }
        }

        // Handle text content (with links)
        if (tag === 'div' || tag === 'p' || tag === 'span') {
          // Only process direct text containers
          const hasOnlyTextOrLinks = Array.from(currentNode.childNodes).every(child =>
            child.nodeType === Node.TEXT_NODE ||
            (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === 'a') ||
            (child.nodeType === Node.ELEMENT_NODE && child.tagName.toLowerCase() === 'span')
          );

          if (hasOnlyTextOrLinks && currentNode.textContent?.trim().length > 10) {
            const text = currentNode.textContent.trim();

            // Skip duplicates, metadata, timestamps
            if (seenTexts.has(text)) continue;
            if (text.match(/^\d{1,2}:\d{2}\s*(AM|PM)?$/i)) continue;
            if (text.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d/i)) continue;
            if (text === title) continue;
            if (text.includes('·') && text.length < 50) continue;

            seenTexts.add(text);

            // Extract links from this text block
            const links = [];
            currentNode.querySelectorAll('a').forEach(a => {
              const href = a.href;
              const linkText = a.textContent?.trim();
              if (href && linkText && !href.includes('javascript:')) {
                links.push({ text: linkText, url: href });
              }
            });

            // Determine if this is a heading
            const style = window.getComputedStyle(currentNode);
            const fontSize = parseFloat(style.fontSize);
            const fontWeight = style.fontWeight;
            const isHeading = fontSize > 18 || parseInt(fontWeight) >= 600;

            contentBlocks.push({
              type: isHeading ? 'heading' : 'text',
              content: text,
              links: links.length > 0 ? links : undefined
            });
          }
        }

        // Handle headings
        if (tag === 'h2' || tag === 'h3') {
          const text = currentNode.textContent?.trim();
          if (text && !seenTexts.has(text)) {
            seenTexts.add(text);
            contentBlocks.push({ type: 'heading', content: text });
          }
        }
      }

      return {
        title,
        author: {
          name: authorName,
          handle: authorHandle,
          avatar: authorAvatar
        },
        blocks: contentBlocks,
        coverImage
      };
    });

    console.log('Scraped data:', {
      title: articleData.title?.substring(0, 50),
      blocksCount: articleData.blocks?.length,
      hasCover: !!articleData.coverImage
    });

    await browser.close();

    // Process blocks to create summary
    const textBlocks = articleData.blocks?.filter(b => b.type === 'text' || b.type === 'heading') || [];
    const allText = textBlocks.map(b => b.content).join(' ');
    const summary = allText.length > 200 ? allText.substring(0, 197) + '...' : allText;

    // Extract hashtags for tags
    const hashtagMatches = allText.match(/#\w+/g) || [];
    const tags = hashtagMatches.slice(0, 3).map(tag => tag.replace('#', ''));
    if (tags.length === 0) {
      tags.push('Twitter', 'Article');
    }

    // Get all images for backwards compatibility
    const images = articleData.blocks?.filter(b => b.type === 'image').map(b => b.url) || [];
    if (articleData.coverImage && !images.includes(articleData.coverImage)) {
      images.unshift(articleData.coverImage);
    }

    return {
      title: articleData.title || 'Untitled Article',
      author: articleData.author?.name || 'Unknown',
      authorHandle: articleData.author?.handle || '',
      authorAvatar: articleData.author?.avatar || '',
      summary,
      tags,
      images,
      blocks: articleData.blocks || [],
      coverImage: articleData.coverImage || '',
      tweetUrl: url,
      // Backwards compatibility: join text blocks for simple content
      content: textBlocks.map(b => b.content).join('\n\n')
    };
  } catch (error) {
    console.error('Scraping error:', error);
    await browser.close();
    throw error;
  }
}

// API endpoint
app.post('/api/scrape', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  if (!url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/\d+/i)) {
    return res.status(400).json({ error: 'Invalid Twitter/X URL' });
  }

  try {
    console.log(`\n=== Scraping: ${url} ===`);
    const data = await scrapeXArticle(url);
    res.json(data);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({
      error: 'Failed to scrape article',
      message: error.message
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`API endpoint: POST http://localhost:${PORT}/api/scrape`);
});
