---
name: check-name-availability-on-homebrew
description: Check if a formula name is available in Homebrew. Use when planning to distribute a CLI tool via Homebrew package manager.
---

# Check Name Availability on Homebrew

How to verify if a formula name is available in Homebrew.

## Method 1: HTTP Request (Recommended for Agents)

Fetch the Homebrew Formulae API directly:

```bash
curl -s -o /dev/null -w "%{http_code}" https://formulae.brew.sh/api/formula/{name}.json
```

- **404** = Name is available
- **200** = Name is taken

Example:
```bash
curl -s -o /dev/null -w "%{http_code}" https://formulae.brew.sh/api/formula/dialai.json
```

## Method 2: Get Formula Details

If the formula exists, get full metadata:

```bash
curl -s https://formulae.brew.sh/api/formula/{name}.json | jq .
```

Returns JSON with name, description, homepage, versions, dependencies, etc.

## Method 3: Search All Formulae

Get the complete list of all formulae:

```bash
curl -s https://formulae.brew.sh/api/formula.json | jq '.[].name'
```

Then grep for your desired name:

```bash
curl -s https://formulae.brew.sh/api/formula.json | jq -r '.[].name' | grep -x "dialai"
```

No output = available.

## Casks vs Formulae

Homebrew has two types of packages:
- **Formulae**: Command-line tools (installed via `brew install`)
- **Casks**: GUI applications (installed via `brew install --cask`)

To check cask availability:

```bash
curl -s -o /dev/null -w "%{http_code}" https://formulae.brew.sh/api/cask/{name}.json
```

## Naming Conventions

Homebrew formula names should:
- Be lowercase
- Use hyphens (not underscores) to separate words
- Not include version numbers (unless multiple major versions coexist)
- Match the upstream project name when possible

## Note on Taps

The main API covers homebrew-core. Third-party taps may have their own namespaces. A name being available in core doesn't guarantee it's available in all taps.

## Recording Results

Record all availability checks in `NAME_VARIATION_AVAILABILITY.md`. Add or update the **Package Managers** section:

```markdown
## Package Managers

### Homebrew
- **URL:** formulae.brew.sh/formula/{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| {name} | {YYYY-MM-DD} | YES/NO | [formulae.brew.sh/formula/{name}](https://formulae.brew.sh/formula/{name}) |
| {variation1} | {YYYY-MM-DD} | YES/NO | |
| {variation2} | {YYYY-MM-DD} | YES/NO | |
```

**Column definitions:**
- **Name**: The variation being checked
- **Date**: Date of check (YYYY-MM-DD format)
- **Available**: YES or NO
- **Link**: URL if taken (leave empty if available)

After checking all variations, update the **Cross-Service Summary** section to reflect Homebrew availability.

## Sources

- [Homebrew Formulae API Documentation](https://formulae.brew.sh/docs/api/)
- [Formula Cookbook](https://docs.brew.sh/Formula-Cookbook)
- [Adding Software to Homebrew](https://docs.brew.sh/Adding-Software-to-Homebrew)
