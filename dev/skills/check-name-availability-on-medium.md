# Check Name Availability on Medium

How to verify if a username is available on Medium.

## Method 1: HTTP Request (Best Free Option for Agents)

Fetch the Medium profile page and check response:

```bash
curl -s -o /dev/null -w "%{http_code}" "https://medium.com/@{username}"
```

- **404** = Username may be available
- **200** = Username is taken

Example:
```bash
curl -s -o /dev/null -w "%{http_code}" "https://medium.com/@dialai"
```

## Method 2: Check Profile API

Medium has an undocumented profile endpoint:

```bash
curl -s "https://medium.com/@{username}?format=json" | tail -c +17 | jq '.payload.user.username'
```

- Returns username if profile exists
- Returns null/error if available

**Note:** Medium prepends `])}while(1);</x>` to JSON responses for security. The `tail -c +17` strips this.

## Method 3: Third-Party APIs

**Apify All-in-One Username Checker:**
```bash
curl -X POST "https://api.apify.com/v2/acts/scraper-mind~all-in-one-username-availability-checker/runs?token={token}" \
  -H "Content-Type: application/json" \
  -d '{"username": "dialai", "platforms": ["medium"]}'
```

**Checkmarks API:**
```bash
curl "https://checkmarks.com/api?username={username}&platform=medium"
```

## Username Rules

Medium usernames:
- Are case-insensitive
- Can contain letters, numbers, and underscores
- Are displayed with @ prefix (@dialai)
- Cannot be changed once set (you'd need a new account)

## Caveats

### Publications vs Users

Medium has both user profiles (`@username`) and publications (custom URLs). This check is for user profiles only.

### Deactivated Accounts

Usernames from deactivated accounts may be held by Medium and not immediately available.

### Rate Limits

Medium may rate limit or block automated requests. Add delays between checks.

### No Official API

Medium's API is limited and doesn't include username availability checking. The profile fetch method is the most reliable approach.

## Bypassing 403 Blocks

Medium uses Cloudflare protection that often returns 403 for automated requests. Workarounds:

### Add Browser Headers

Include full browser headers to appear legitimate:

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
  -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8" \
  -H "Accept-Language: en-US,en;q=0.5" \
  -H "Accept-Encoding: gzip, deflate, br" \
  -H "Connection: keep-alive" \
  "https://medium.com/@{username}"
```

### Browser Automation (Playwright)

For persistent blocks, use browser automation:

```javascript
const { chromium } = require('playwright');

async function checkMedium(username) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const response = await page.goto(`https://medium.com/@${username}`);
  const available = response.status() === 404 ||
    (await page.content()).includes('PAGE_NOT_FOUND');
  await browser.close();
  return available;
}
```

### Use Cloudscraper (Python)

Cloudscraper bypasses Cloudflare protection:

```python
import cloudscraper

scraper = cloudscraper.create_scraper()
response = scraper.get(f"https://medium.com/@{username}")
available = response.status_code == 404
```

### Third-Party Services

Use scraping APIs with built-in Cloudflare bypass:
- [ZenRows](https://www.zenrows.com/) - Handles anti-bot automatically
- [ScrapingBee](https://www.scrapingbee.com/) - JavaScript rendering + proxies
- [Apify](https://apify.com/) - Username checker actors

## Sources

- [Username Availability Checker - Apify](https://apify.com/easyapi/username-availability-checker/api)
- [All-in-One Username Availability Checker - Apify](https://apify.com/scraper-mind/all-in-one-username-availability-checker/api)
- [Checkmarks Username API](https://checkmarks.com/)
- [Cloudflare 403 Forbidden Bypass - ZenRows](https://www.zenrows.com/blog/cloudflare-403-forbidden-bypass)
- [How to Fix 403 Forbidden in BeautifulSoup](https://medium.com/@spaw.co/how-to-fix-403-forbidden-in-beautifulsoup-3e6fc7ba5674)
