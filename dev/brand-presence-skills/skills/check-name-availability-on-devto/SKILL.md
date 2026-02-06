---
name: check-name-availability-on-devto
description: Check if a username is available on Dev.to. Use when verifying brand name availability for a developer community presence.
---

# Check Name Availability on Dev.to

How to verify if a username is available on Dev.to.

## Method 1: HTTP Request (Recommended for Agents)

Fetch the Dev.to user API endpoint:

```bash
curl -s -o /dev/null -w "%{http_code}" "https://dev.to/api/users/by_username?url={username}"
```

- **404** = Username is available
- **200** = Username is taken

Example:
```bash
curl -s -o /dev/null -w "%{http_code}" "https://dev.to/api/users/by_username?url=dialai"
```

**Alternative - fetch profile page:**
```bash
curl -s -o /dev/null -w "%{http_code}" "https://dev.to/{username}"
```

## Method 2: Get User Details

If the user exists, get their profile info:

```bash
curl -s "https://dev.to/api/users/by_username?url={username}" | jq .
```

Returns user object with `id`, `username`, `name`, `twitter_username`, `github_username`, etc.

## Method 3: Third-Party APIs

**RapidAPI Check Username:**
```bash
curl -X GET "https://check-username.p.rapidapi.com/check/{username}" \
  -H "X-RapidAPI-Key: {your_key}" \
  -H "X-RapidAPI-Host: check-username.p.rapidapi.com"
```

Supports Dev.to along with many other platforms.

**Apify Username Checker:**
```bash
curl -X POST "https://api.apify.com/v2/acts/easyapi~username-availability-checker/runs?token={token}" \
  -H "Content-Type: application/json" \
  -d '{"username": "dialai"}'
```

## Username Rules

Dev.to usernames:
- Are case-insensitive
- Can contain letters, numbers, and underscores
- Are displayed in URL as `dev.to/{username}`
- Cannot easily be changed after account creation

## Dev.to API Features

Dev.to has a well-documented public API:
- **Base URL**: `https://dev.to/api`
- **Rate limit**: 30 requests per 30 seconds (unauthenticated)
- **Authentication**: API key for write operations (not needed for reads)

**API Documentation**: https://developers.forem.com/api

## Caveats

### Organizations

Dev.to also has organizations with their own URLs. This check is for user accounts only.

### Suspended Accounts

Suspended accounts may still hold their username.

### Rate Limits

Dev.to rate limits to 30 requests per 30 seconds. Add delays for bulk checking.

## Recording Results

Record all availability checks in `NAME_VARIATION_AVAILABILITY.md`. Add or update the **Content & Newsletter** section:

```markdown
## Content & Newsletter

### Dev.to
- **URL:** dev.to/{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| {name} | {YYYY-MM-DD} | YES/NO | [dev.to/{name}](https://dev.to/{name}) |
| {variation1} | {YYYY-MM-DD} | YES/NO | |
| {variation2} | {YYYY-MM-DD} | YES/NO | |
```

**Column definitions:**
- **Name**: The variation being checked
- **Date**: Date of check (YYYY-MM-DD format)
- **Available**: YES or NO
- **Link**: URL if taken (leave empty if available)

After checking all variations, update the **Cross-Service Summary** section to reflect Dev.to availability.

## Sources

- [Dev.to API Documentation](https://developers.forem.com/api)
- [Check Username API - RapidAPI](https://rapidapi.com/Bmbus/api/check-username)
- [Username Availability Checker - Apify](https://apify.com/easyapi/username-availability-checker/api)
