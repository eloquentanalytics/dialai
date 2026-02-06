---
name: check-name-availability-on-huggingface
description: Check if a username or organization name is available on Hugging Face. Use when verifying brand name availability for ML/AI model hosting presence.
---

# Check Name Availability on Hugging Face

How to verify if a username or organization name is available on Hugging Face.

## Method 1: HTTP Request (Recommended for Agents)

Fetch the Hugging Face user/org API endpoint:

```bash
curl -s -o /dev/null -w "%{http_code}" "https://huggingface.co/api/users/{name}/overview"
```

- **404** = Username may be available
- **200** = Username is taken

Example:
```bash
curl -s -o /dev/null -w "%{http_code}" "https://huggingface.co/api/users/dialai/overview"
```

**For organizations:**
```bash
curl -s -o /dev/null -w "%{http_code}" "https://huggingface.co/api/organizations/{name}/overview"
```

## Method 2: Profile Page Check

Check if the profile page exists:

```bash
curl -s -o /dev/null -w "%{http_code}" "https://huggingface.co/{name}"
```

- **404** = Name may be available
- **200** = Name is taken (user or org)

## Method 3: huggingface_hub Library

Use the official Python library:

```python
from huggingface_hub import HfApi

api = HfApi()

try:
    # Try to get user info
    user_info = api.list_models(author="{name}")
    if list(user_info):
        print("Name is taken (has models)")
    else:
        # Check if profile exists
        import requests
        r = requests.get("https://huggingface.co/{name}")
        if r.status_code == 200:
            print("Name is taken")
        else:
            print("Name may be available")
except:
    print("Name may be available")
```

## Method 4: Check Specific Namespace Types

Hugging Face has separate namespaces for users and organizations:

```bash
# Check user
curl -s "https://huggingface.co/api/users/{name}/overview" | jq -r '.user.username // "not found"'

# Check organization
curl -s "https://huggingface.co/api/organizations/{name}/overview" | jq -r '.name // "not found"'
```

## Naming Rules

Hugging Face usernames/org names:
- Are case-insensitive (displayed as entered)
- Can contain letters, numbers, and hyphens
- Cannot start with a hyphen
- Must be unique across both users and organizations

## Namespace Collision

Users and organizations share the same namespace. If `dialai` is taken by a user, you cannot create an organization with that name (and vice versa).

## Caveats

### Reserved Names

Some names may be reserved by Hugging Face for policy reasons.

### Model/Dataset/Space Names

This check is for user/org names only. Models, datasets, and spaces have their own names under namespaces (e.g., `dialai/my-model`).

### Rate Limits

Hugging Face may rate limit unauthenticated requests. For bulk checking, add authentication:

```bash
curl -H "Authorization: Bearer {hf_token}" \
  "https://huggingface.co/api/users/{name}/overview"
```

### No Official Availability Endpoint

Hugging Face doesn't have a dedicated "check availability" endpoint. These methods infer availability from 404 responses.

## Recording Results

Record all availability checks in `NAME_VARIATION_AVAILABILITY.md`. Add or update the **AI/ML Platforms** section:

```markdown
## AI/ML Platforms

### Hugging Face Organization
- **URL:** huggingface.co/{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| {name} | {YYYY-MM-DD} | YES/NO | [huggingface.co/{name}](https://huggingface.co/{name}) |
| {variation1} | {YYYY-MM-DD} | YES/NO | |
| {variation2} | {YYYY-MM-DD} | YES/NO | |
```

**Column definitions:**
- **Name**: The variation being checked
- **Date**: Date of check (YYYY-MM-DD format)
- **Available**: YES or NO
- **Link**: URL if taken (leave empty if available)

After checking all variations, update the **Cross-Service Summary** section to reflect Hugging Face availability.

## Sources

- [Hugging Face Hub API Documentation](https://huggingface.co/docs/huggingface_hub/en/package_reference/hf_api)
- [Organizations, Security, and the Hub API](https://huggingface.co/docs/hub/en/other)
- [Authentication - Hugging Face Hub](https://huggingface.co/docs/huggingface_hub/en/package_reference/authentication)
