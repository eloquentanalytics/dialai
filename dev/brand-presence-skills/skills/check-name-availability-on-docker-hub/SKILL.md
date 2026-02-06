---
name: check-name-availability-on-docker-hub
description: Check if a repository or namespace name is available on Docker Hub. Use when verifying brand name availability for container image hosting.
---

# Check Name Availability on Docker Hub

How to verify if a repository name is available on Docker Hub.

## Method 1: HTTP Request (Recommended for Agents)

Fetch the Docker Hub API directly:

```bash
curl -s -o /dev/null -w "%{http_code}" https://hub.docker.com/v2/repositories/{namespace}/{name}/
```

- **404** = Name is available (in that namespace)
- **200** = Name is taken

Example for a user/org namespace:
```bash
curl -s -o /dev/null -w "%{http_code}" https://hub.docker.com/v2/repositories/dialai/dialai/
```

For library (official) images:
```bash
curl -s -o /dev/null -w "%{http_code}" https://hub.docker.com/v2/repositories/library/{name}/
```

## Method 2: Check Namespace Availability

To check if a Docker Hub username/organization is available:

```bash
curl -s -o /dev/null -w "%{http_code}" https://hub.docker.com/v2/users/{name}/
```

- **404** = Username/org is available
- **200** = Username/org is taken

## Method 3: Docker Hub API with Details

Get full repository info (if it exists):

```bash
curl -s https://hub.docker.com/v2/repositories/{namespace}/{name}/ | jq .
```

Returns JSON with repository details if it exists, or error if not.

## Authentication

For public repositories, no authentication is needed. For private repositories or higher rate limits, use a Personal Access Token:

```bash
curl -H "Authorization: Bearer {token}" \
  https://hub.docker.com/v2/repositories/{namespace}/{name}/
```

## Naming Rules

Docker Hub repository names must:
- Be lowercase
- Contain only letters, numbers, hyphens, underscores, and periods
- Not start or end with a hyphen or period
- Be between 2 and 255 characters

## Note on Namespaces

Repository names are scoped to namespaces (users or organizations). The same repository name can exist under different namespaces:
- `alice/myapp` and `bob/myapp` are different repositories

## Recording Results

Record all availability checks in `NAME_VARIATION_AVAILABILITY.md`. Add or update the **Package Managers** section:

```markdown
## Package Managers

### Docker Hub
- **URL:** hub.docker.com/r/{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| {name} | {YYYY-MM-DD} | YES/NO | [hub.docker.com/r/{name}](https://hub.docker.com/r/{name}) |
| {variation1} | {YYYY-MM-DD} | YES/NO | |
| {variation2} | {YYYY-MM-DD} | YES/NO | |
```

**Column definitions:**
- **Name**: The variation being checked (namespace)
- **Date**: Date of check (YYYY-MM-DD format)
- **Available**: YES or NO
- **Link**: URL if taken (leave empty if available)

After checking all variations, update the **Cross-Service Summary** section to reflect Docker Hub availability.

## Sources

- [Docker Hub API Reference](https://docs.docker.com/reference/api/hub/latest/)
- [Docker Hub API on PublicAPI](https://publicapi.dev/docker-hub-api)
- [DockerHub Registry API Examples](https://www.arthurkoziel.com/dockerhub-registry-api/)
