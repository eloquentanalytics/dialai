# Check Name Availability on Product Hunt

How to verify if a product name/slug is available on Product Hunt.

## Method 1: HTTP Request (Best Free Option for Agents)

Fetch the Product Hunt product page and check response:

```bash
curl -s -o /dev/null -w "%{http_code}" "https://www.producthunt.com/products/{name}"
```

- **404** = Product name may be available
- **200** = Product name is taken

Example:
```bash
curl -s -o /dev/null -w "%{http_code}" "https://www.producthunt.com/products/dialai"
```

## Method 2: GraphQL API

Product Hunt uses a GraphQL API. First, get an API token from the [Developer Portal](https://api.producthunt.com/v2/oauth/applications).

```bash
curl -X POST "https://api.producthunt.com/v2/api/graphql" \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { post(slug: \"{name}\") { id name } }"
  }'
```

- Returns post data if exists
- Returns `null` for post if available

**Search by name:**
```graphql
query {
  posts(first: 5, search: "dialai") {
    edges {
      node {
        id
        name
        slug
      }
    }
  }
}
```

## Method 3: API Explorer

Use the interactive [API Explorer](https://api.producthunt.com/v2/docs) to test queries:

1. Authenticate with your Product Hunt account
2. Run queries in the GraphQL playground
3. Check if a slug returns results

## Product Hunt Slugs vs Names

- **Name**: Display name (can have duplicates like "Notion" and "Notion AI")
- **Slug**: URL identifier (`producthunt.com/products/{slug}`) - must be unique

You're checking slug availability, not name uniqueness.

## Caveats

### API Access Restrictions

- Default API access is for **non-commercial** use only
- Contact hello@producthunt.com for commercial usage
- Rate limits apply

### Claimed vs Unclaimed Products

Products can be:
- **Claimed**: Managed by the maker
- **Unclaimed**: Listed but not managed

Both occupy the slug.

### Authentication Required for Full API

The GraphQL API requires OAuth authentication. Get credentials at:
https://api.producthunt.com/v2/oauth/applications

### Launch vs Product

- **Product**: The product page (`/products/dialai`)
- **Post/Launch**: A specific launch (`/posts/dialai`)

Both use slugs but are different namespaces.

## Rate Limits

Product Hunt rate limits API requests. Use authentication and add delays between requests.

## Bypassing 403 Blocks

Product Hunt blocks unauthenticated scraping requests with 403. Workarounds:

### Use the Official GraphQL API (Recommended)

The most reliable method. Register at https://api.producthunt.com/v2/oauth/applications:

```bash
# Get access token via OAuth
curl -X POST "https://api.producthunt.com/v2/oauth/token" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "{client_id}",
    "client_secret": "{client_secret}",
    "grant_type": "client_credentials"
  }'

# Query the API
curl -X POST "https://api.producthunt.com/v2/api/graphql" \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ post(slug: \"dialai\") { id } }"}'
```

### Browser Automation (Playwright)

For checking without API credentials:

```javascript
const { chromium } = require('playwright');

async function checkProductHunt(name) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`https://www.producthunt.com/products/${name}`);

  // Check if product exists or 404 page
  const is404 = await page.$('text="Page not found"');
  await browser.close();
  return is404 !== null;
}
```

### Use Playwright Stealth

For better evasion:

```javascript
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);

// Then use as normal
```

### Third-Party Scraping Services

- [Apify Product Hunt Scraper](https://apify.com/canadesk/product-hunt-scraper)
- [ScrapingBee](https://www.scrapingbee.com/) with JavaScript rendering
- [ZenRows](https://www.zenrows.com/) with anti-bot bypass

## Sources

- [Product Hunt API Documentation](https://api.producthunt.com/v2/docs)
- [Product Hunt API on PublicAPI](https://publicapi.dev/product-hunt-api)
- [Product Hunt API on GitHub](https://github.com/producthunt/producthunt-api)
- [How to Scrape Product Hunt](https://roundproxies.com/blog/scrape-product-hunt/)
- [Solving 403 Errors in Web Scraping](https://rebrowser.net/blog/solving-403-errors-in-web-scraping-the-ultimate-guide-or-bypass-protection-successfully)
