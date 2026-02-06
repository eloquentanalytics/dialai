---
name: check-name-availability-on-twitter
description: Check if a username/handle is available on Twitter/X. Use when verifying brand name availability on Twitter or checking if a specific handle is taken.
---

# Check Name Availability on Twitter/X

How to verify if a username/handle is available on Twitter/X.

## Method 1: HTTP Request (Best Free Option for Agents)

Fetch the Twitter profile page and check response:

```bash
curl -s -o /dev/null -w "%{http_code}" "https://x.com/{username}"
```

- **404** = Username may be available
- **200** = Username is taken

Example:
```bash
curl -s -o /dev/null -w "%{http_code}" "https://x.com/dialai"
```

**More reliable check** - look for specific text:
```bash
curl -s "https://x.com/{username}" | grep -q "This account doesn't exist" && echo "available" || echo "taken or suspended"
```

## Method 2: X API (Paid)

The official X API requires a paid subscription ($200+/month for Basic tier).

```bash
curl -H "Authorization: Bearer {bearer_token}" \
  "https://api.twitter.com/2/users/by/username/{username}"
```

- **200** with user data = taken
- **400** with "user not found" = available

## Method 3: Third-Party APIs

**Apify Username Checker:**
```bash
curl -X POST "https://api.apify.com/v2/acts/scraper-mind~all-in-one-username-availability-checker/runs?token={token}" \
  -H "Content-Type: application/json" \
  -d '{"username": "dialai", "platforms": ["twitter"]}'
```

**RapidAPI options:**
Search for "Twitter username checker" on RapidAPI for various paid options.

## Caveats

### Suspended/Deactivated Accounts

A username that returns 404 might be:
- Truly available
- Suspended (may become available later)
- Deactivated (held for 30 days)

### Reserved Names

Some names are reserved by Twitter/X and cannot be registered.

### Username Rules

Twitter usernames must:
- Be 4-15 characters
- Contain only letters, numbers, and underscores
- Not include "twitter" or "admin" (reserved)

### Rate Limiting

Twitter aggressively rate limits. Use delays between requests and consider proxies for bulk checking.

### No Guaranteed Availability

Even if a check shows "available," someone else may register it before you do, or Twitter may reject it for policy reasons.

## Recording Results

Record all availability checks in `NAME_VARIATION_AVAILABILITY.md`. Add or update the **Social Media** section:

```markdown
## Social Media

### Twitter/X
- **URL:** x.com/{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| {name} | {YYYY-MM-DD} | YES/NO/SUSPENDED | [x.com/{name}](https://x.com/{name}) |
| {variation1} | {YYYY-MM-DD} | YES/NO/SUSPENDED | |
| {variation2} | {YYYY-MM-DD} | YES/NO/SUSPENDED | |
```

**Column definitions:**
- **Name**: The variation being checked
- **Date**: Date of check (YYYY-MM-DD format)
- **Available**: YES, NO, or SUSPENDED (suspended accounts may become available)
- **Link**: URL if taken (leave empty if available)

After checking all variations, update the **Cross-Service Summary** section to reflect Twitter availability.

## Sources

- [Twitter Username Checker - SocialPlug](https://www.socialplug.io/free-tools/twitter-username-checker)
- [X Username Availability Checker - XBeast](https://xbeast.io/tools/username-checker)
- [All-in-One Username Availability Checker - Apify](https://apify.com/scraper-mind/all-in-one-username-availability-checker/api)
