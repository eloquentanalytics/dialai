# Check Name Availability on Substack

How to verify if a subdomain is available on Substack.

## Method 1: HTTP Request (Recommended for Agents)

Fetch the Substack subdomain and check if it redirects:

```bash
curl -s -o /dev/null -w "%{http_code}" -L "https://{name}.substack.com"
```

- **Redirects to substack.com** = Subdomain is available
- **200** with content = Subdomain is taken

Example:
```bash
curl -s -o /dev/null -w "%{http_code}" -L "https://dialai.substack.com"
```

**More reliable check** - see if it redirects to main site:

```bash
final_url=$(curl -s -o /dev/null -w "%{url_effective}" -L "https://{name}.substack.com")
if [[ "$final_url" == "https://substack.com/"* ]]; then
  echo "available"
else
  echo "taken"
fi
```

## Method 2: Check for Newsletter Content

Active Substacks have content. Check if the archive page exists:

```bash
curl -s "https://{name}.substack.com/archive" | grep -q "This page is not available" && echo "available" || echo "taken"
```

## Method 3: Unofficial substack-api

Use the unofficial [substack-api](https://github.com/NHagar/substack_api) Python library:

```python
from substack_api import SubstackAPI

api = SubstackAPI()
try:
    # Try to get newsletter info
    info = api.get_newsletter("{name}")
    print("Subdomain is taken")
except:
    print("Subdomain may be available")
```

**Note:** This is an unofficial library and may break.

## Substack Naming

Substack has two types of names:

1. **Subdomain**: `{name}.substack.com` - The newsletter URL
2. **Handle**: `@{handle}` - The author's profile handle

Both need to be unique.

## Naming Rules

Substack subdomains:
- Are case-insensitive
- Can contain letters, numbers, and hyphens
- Cannot start or end with a hyphen
- Must be at least 3 characters

## Caveats

### No Official API

Substack does not provide a public API for availability checking. These methods rely on HTTP behavior.

### Reserved Subdomains

Some subdomains are reserved by Substack (e.g., `www`, `api`, `app`).

### Inactive Newsletters

A subdomain might be registered but have no published content. It's still taken.

### Custom Domains

Some Substacks use custom domains but still occupy a subdomain. The subdomain check still applies.

### Handle Availability

Substack handles (`@name`) are separate from subdomains. Check both if needed:
```bash
curl -s "https://substack.com/@{handle}"
```

## Sources

- [What are Substack Handles?](https://support.substack.com/hc/en-us/articles/15574565677204-What-are-Substack-Handles)
- [substack-api on GitHub](https://github.com/NHagar/substack_api)
- [substack-api on PyPI](https://pypi.org/project/substack-api/)
- [Substack Developer API](https://support.substack.com/hc/en-us/articles/45099095296916-Substack-Developer-API)
