# Check Name Availability on GitHub

How to verify if a repository name is available on GitHub.

## Method 1: HTTP Request (Recommended for Agents)

Fetch the GitHub API directly:

```bash
curl -s -o /dev/null -w "%{http_code}" https://api.github.com/repos/{owner}/{repo}
```

- **404** = Repository name is available (for that owner)
- **200** = Repository exists

Example:
```bash
curl -s -o /dev/null -w "%{http_code}" https://api.github.com/repos/dialai/dialai
```

## Method 2: With Authentication

For higher rate limits, use a personal access token:

```bash
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer {token}" \
  https://api.github.com/repos/{owner}/{repo}
```

## Method 3: Check User/Organization Name

To check if a username or organization name is available:

```bash
curl -s -o /dev/null -w "%{http_code}" https://api.github.com/users/{name}
```

- **404** = Username is available
- **200** = Username is taken

Example:
```bash
curl -s -o /dev/null -w "%{http_code}" https://api.github.com/users/dialai
```

## Method 4: gh CLI

Using the GitHub CLI:

```bash
gh repo view {owner}/{repo} 2>/dev/null && echo "taken" || echo "available"
```

## Important Notes

### Repository Names are Scoped

Repository names are unique per owner, not globally. `alice/myapp` and `bob/myapp` can both exist.

### Naming Rules

GitHub repository names must:
- Be 1-100 characters
- Contain only alphanumerics, hyphens, underscores, and periods
- Not start with a period
- Not end with `.git`

### Rate Limits

- **Unauthenticated**: 60 requests/hour
- **Authenticated**: 5,000 requests/hour

### Deleted Repositories

Recently deleted repository names may be held for a period. A 404 doesn't guarantee you can immediately create that name.

### Reserved Names

Some names are reserved by GitHub (e.g., `api`, `blog`, `about`).

## Sources

- [GitHub REST API - Repositories](https://docs.github.com/en/rest/repos)
- [GitHub REST API Documentation](https://docs.github.com/en/rest)
