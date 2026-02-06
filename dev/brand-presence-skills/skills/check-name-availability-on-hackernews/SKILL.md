---
name: check-name-availability-on-hackernews
description: Check if a username is available on Hacker News. Use when verifying brand name availability for tech community presence on Y Combinator's Hacker News.
---

# Check Name Availability on Hacker News

How to verify if a username is available on Hacker News.

## Method 1: Firebase API (Recommended for Agents)

Hacker News uses a Firebase-based API:

```bash
curl -s "https://hacker-news.firebaseio.com/v0/user/{username}.json"
```

- **null** = Username may be available
- **JSON object** = Username is taken

Example:
```bash
curl -s "https://hacker-news.firebaseio.com/v0/user/dialai.json"
```

**Check with jq:**
```bash
result=$(curl -s "https://hacker-news.firebaseio.com/v0/user/dialai.json")
if [ "$result" = "null" ]; then
  echo "Username may be available"
else
  echo "Username is taken"
fi
```

## Method 2: Profile Page Check

Check the user profile page:

```bash
curl -s -o /dev/null -w "%{http_code}" "https://news.ycombinator.com/user?id={username}"
```

- **200** with "No such user" = Username is available
- **200** with user data = Username is taken

**More reliable:**
```bash
curl -s "https://news.ycombinator.com/user?id={username}" | grep -q "No such user" && echo "available" || echo "taken"
```

## Important Caveat

The Firebase API only returns data for users with **public activity** (comments or submissions). A user who registered but never posted will return `null` from the API but still have the username taken.

The profile page check is more reliable for true availability.

## User Object Fields

When a user exists, the API returns:
```json
{
  "id": "username",
  "created": 1234567890,
  "karma": 100,
  "about": "bio text",
  "submitted": [123, 456, 789]
}
```

## Username Rules

Hacker News usernames:
- Are case-sensitive
- Can contain letters, numbers, and underscores
- Have no spaces
- Are unique

## Caveats

### Inactive Users

Users who registered but never posted:
- Return `null` from Firebase API
- But still appear on the profile page as existing

### Rate Limits

Hacker News may rate limit aggressive scraping. Add delays between requests.

### No Registration API

There's no API to register usernames. Registration must be done through the web interface.

### Banned Users

Banned users may still occupy their username. The API won't indicate ban status.

## Recording Results

Record all availability checks in `NAME_VARIATION_AVAILABILITY.md`. Add or update the **Launch Platforms** section:

```markdown
## Launch Platforms

### Hacker News
- **URL:** news.ycombinator.com/user?id={name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| {name} | {YYYY-MM-DD} | YES/NO | [news.ycombinator.com/user?id={name}](https://news.ycombinator.com/user?id={name}) |
| {variation1} | {YYYY-MM-DD} | YES/NO | |
| {variation2} | {YYYY-MM-DD} | YES/NO | |
```

**Column definitions:**
- **Name**: The variation being checked
- **Date**: Date of check (YYYY-MM-DD format)
- **Available**: YES or NO (note: inactive users may show as available in API but still occupy the name)
- **Link**: URL if taken (leave empty if available)

After checking all variations, update the **Cross-Service Summary** section to reflect Hacker News availability.

## Sources

- [Hacker News API on GitHub](https://github.com/HackerNews/API)
- [Hacker News API Tutorial](http://justinhj.github.io/2017/07/26/hacker-news-api-1.html)
