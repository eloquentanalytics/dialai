# Check Name Availability on Bluesky

How to verify if a handle is available on Bluesky.

## Method 1: HTTP Request (Recommended for Agents)

Use the public AT Protocol API to resolve a handle:

```bash
curl -s -o /dev/null -w "%{http_code}" \
  "https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor={handle}.bsky.social"
```

- **400** (InvalidRequest) = Handle is available
- **200** = Handle is taken

Example:
```bash
curl -s -o /dev/null -w "%{http_code}" \
  "https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=dialai.bsky.social"
```

**Get full response:**
```bash
curl -s "https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=dialai.bsky.social"
```

If taken, returns profile JSON. If available, returns error:
```json
{
  "error": "InvalidRequest",
  "message": "Profile not found"
}
```

## Method 2: Resolve Handle Endpoint

Use the identity resolution endpoint:

```bash
curl -s "https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle={handle}.bsky.social"
```

- Returns `{"did": "did:plc:..."}` if handle exists
- Returns error if handle is available

## Method 3: BlueSky-Username-Checker

Use the open-source [BlueSky-Username-Checker](https://github.com/Sallie-May/BlueSky-Username-Checker):

```python
# Python script that checks handle availability using the Bluesky API
```

## Handle Rules

Bluesky handles:
- Must be 3+ characters
- Can contain letters, numbers, and hyphens
- Are case-insensitive
- End with `.bsky.social` (default) or can be a custom domain

## Custom Domain Handles

Bluesky allows using your own domain as a handle (e.g., `dialai.dev` instead of `dialai.bsky.social`). This provides:
- Verification (proves domain ownership)
- Branding (custom domain as handle)

To check if a custom domain handle is taken:
```bash
curl -s "https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle={domain}"
```

## Rate Limits

Bluesky recommends:
- Reasonable timeouts and retries
- Exponential backoff
- Handle 429 (Rate-Limit Exceeded) responses properly

## Caveats

### Reserved Handles

Some handles may be reserved by Bluesky for policy reasons.

### Deactivated Accounts

A handle from a deactivated account may not be immediately available.

### No Authentication Required

The public API endpoints don't require authentication for read-only operations like handle resolution.

## Sources

- [BlueSky-Username-Checker on GitHub](https://github.com/Sallie-May/BlueSky-Username-Checker)
- [Resolving Identities - Bluesky Docs](https://docs.bsky.app/docs/advanced-guides/resolving-identities)
- [Bluesky Handle Checker - SocialRails](https://socialrails.com/free-tools/bluesky-username-checker)
- [API Hosts and Auth - Bluesky Docs](https://docs.bsky.app/docs/advanced-guides/api-directory)
