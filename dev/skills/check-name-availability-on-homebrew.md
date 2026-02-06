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

## Sources

- [Homebrew Formulae API Documentation](https://formulae.brew.sh/docs/api/)
- [Formula Cookbook](https://docs.brew.sh/Formula-Cookbook)
- [Adding Software to Homebrew](https://docs.brew.sh/Adding-Software-to-Homebrew)
