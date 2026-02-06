# Check Name Availability on Reddit

How to verify if a subreddit name is available on Reddit.

## Method 1: HTTP Request (Recommended for Agents)

Fetch the subreddit about page JSON:

```bash
curl -s -o /dev/null -w "%{http_code}" "https://www.reddit.com/r/{name}/about.json"
```

- **404** = Subreddit doesn't exist (may be available)
- **200** = Subreddit exists
- **403** = Subreddit is private or quarantined

Example:
```bash
curl -s -o /dev/null -w "%{http_code}" "https://www.reddit.com/r/dialai/about.json"
```

**Get more details:**
```bash
curl -s "https://www.reddit.com/r/{name}/about.json" | jq '.data.display_name'
```

## Method 2: Check for Banned/Reserved

A 404 might mean the subreddit is banned (name unavailable):

```bash
response=$(curl -s "https://www.reddit.com/r/{name}/about.json")
echo "$response" | jq -r '.reason // .data.display_name // "available or banned"'
```

## Method 3: Reddit API with Authentication

Using OAuth (for higher rate limits):

```bash
# First get access token
curl -X POST -d "grant_type=client_credentials" \
  --user "{client_id}:{client_secret}" \
  https://www.reddit.com/api/v1/access_token

# Then check subreddit
curl -H "Authorization: Bearer {access_token}" \
  -H "User-Agent: {app_name}" \
  "https://oauth.reddit.com/r/{name}/about"
```

## Method 4: PRAW (Python)

Using the Python Reddit API Wrapper:

```python
import praw

reddit = praw.Reddit(
    client_id="your_client_id",
    client_secret="your_client_secret",
    user_agent="your_app_name"
)

try:
    subreddit = reddit.subreddit("dialai")
    # Access any attribute to trigger the fetch
    _ = subreddit.id
    print("Subreddit exists")
except Exception as e:
    if "404" in str(e):
        print("Subreddit may be available")
    else:
        print(f"Error: {e}")
```

## Subreddit Naming Rules

Reddit subreddit names must:
- Be 3-21 characters
- Contain only letters, numbers, and underscores
- Not start with an underscore
- Be case-insensitive (r/DIALai = r/dialai)

## Caveats

### Banned Subreddits

A subreddit that returns 404 might be:
- Never created (available)
- Banned (name may be permanently unavailable)
- Removed by admins

### Private Subreddits

Private subreddits return 403, not 404. The name is taken even if you can't see it.

### Rate Limits

- **Unauthenticated**: Very limited (may get blocked)
- **Authenticated**: 60 requests/minute

### User-Agent Required

Reddit requires a descriptive User-Agent header:

```bash
curl -H "User-Agent: MyApp/1.0 by username" \
  "https://www.reddit.com/r/{name}/about.json"
```

## Bypassing 403 Blocks

Reddit's bot detection often returns 403 even with proper headers. Workarounds:

### Use OAuth Authentication

The most reliable method. Register an app at https://www.reddit.com/prefs/apps:

```bash
# Get access token
token=$(curl -s -X POST -d "grant_type=client_credentials" \
  --user "{client_id}:{client_secret}" \
  -A "MyApp/1.0" \
  https://www.reddit.com/api/v1/access_token | jq -r '.access_token')

# Use authenticated endpoint
curl -s -H "Authorization: Bearer $token" \
  -H "User-Agent: MyApp/1.0 by username" \
  "https://oauth.reddit.com/r/{name}/about"
```

### Use Old Reddit

Old Reddit has less aggressive bot detection:

```bash
curl -s -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" \
  "https://old.reddit.com/r/{name}/about.json"
```

### Browser Automation (Playwright)

For persistent blocks, use browser automation:

```javascript
const { chromium } = require('playwright');

async function checkReddit(name) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const response = await page.goto(`https://www.reddit.com/r/${name}`);
  const available = response.status() === 404;
  await browser.close();
  return available;
}
```

### Third-Party Services

- [Apify Reddit Scraper](https://apify.com/trudax/reddit-scraper)
- Web scraping APIs (ZenRows, ScrapingBee) with residential proxies

## Sources

- [Reddit API Documentation - PRAW](https://praw.readthedocs.io/en/stable/)
- [Reddit API Subreddit Reference](https://github.com/Pyprohly/reddit-api-doc-notes/blob/main/docs/api-reference/subreddit.rst)
- [Reddit API Guide - Apidog](https://apidog.com/blog/reddit-api-guide/)
- [How to Fix Reddit 403 Forbidden Error](https://www.browseract.com/blog/how-to-fix-reddit-403-forbidden-error-in-n8n)
- [Solving 403 Errors in Web Scraping](https://rebrowser.net/blog/solving-403-errors-in-web-scraping-the-ultimate-guide-or-bypass-protection-successfully)
