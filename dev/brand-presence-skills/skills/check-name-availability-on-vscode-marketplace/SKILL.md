---
name: check-name-availability-on-vscode-marketplace
description: Check if an extension name is available on the VS Code Marketplace. Use when planning to publish a VS Code extension.
---

# Check Name Availability on VS Code Marketplace

How to verify if an extension name is available on the VS Code Marketplace.

## Method 1: HTTP Request (Recommended for Agents)

Fetch the extension page directly:

```bash
curl -s -o /dev/null -w "%{http_code}" "https://marketplace.visualstudio.com/items?itemName={publisher}.{extensionName}"
```

- **404** = Extension name is available (for that publisher)
- **200** = Extension exists

Example:
```bash
curl -s -o /dev/null -w "%{http_code}" "https://marketplace.visualstudio.com/items?itemName=dialai.dialai"
```

## Method 2: Marketplace API Query

Use the extension query API:

```bash
curl -X POST "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json;api-version=7.1-preview.1" \
  -d '{
    "filters": [{
      "criteria": [
        {"filterType": 7, "value": "{publisher}.{extensionName}"}
      ]
    }],
    "flags": 914
  }'
```

- Empty `results[0].extensions` array = available
- Extensions returned = name is taken

**Filter types:**
- `7` = ExtensionId (publisher.name format)
- `10` = ExtensionName (just the name)

## Method 3: vsce CLI

Use the official VS Code Extension Manager:

```bash
npx vsce show {publisher}.{extensionName}
```

- Shows extension info if exists
- Error if not found

## Understanding Extension IDs

VS Code extensions have a unique identifier format:

```
{publisher}.{extensionName}
```

- **Publisher**: Your marketplace publisher name (must be created first)
- **Extension Name**: The `name` field in `package.json`

Both components must be unique together. The same extension name can exist under different publishers.

## Creating a Publisher

Before checking extension availability, you need a publisher:

1. Go to [Visual Studio Marketplace Management](https://marketplace.visualstudio.com/manage)
2. Sign in with Microsoft account
3. Create a publisher with a unique ID

## Extension Naming Rules

Extension names:
- Are case-insensitive
- Can contain letters, numbers, and hyphens
- Cannot contain spaces
- Are defined in `package.json` `name` field

## Caveats

### Publisher + Name Combination

The full extension ID `{publisher}.{name}` must be unique. You can have:
- `alice.my-extension`
- `bob.my-extension`

Both can coexist.

### Display Name vs ID

- **ID**: `dialai.dial-extension` - Must be unique
- **Display Name**: `DIAL Extension` - Can have duplicates

### Unlisted Extensions

Some extensions are unlisted but still occupy their ID.

### Open VSX Alternative

For open-source alternatives, check [Open VSX Registry](https://open-vsx.org/):

```bash
curl -s -o /dev/null -w "%{http_code}" "https://open-vsx.org/api/{namespace}/{extension}"
```

## Recording Results

Record all availability checks in `NAME_VARIATION_AVAILABILITY.md`. Add or update the **Developer Tool Marketplaces** section:

```markdown
## Developer Tool Marketplaces

### VS Code Marketplace
- **URL:** marketplace.visualstudio.com/publishers/{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| {name} | {YYYY-MM-DD} | YES/NO | [marketplace.visualstudio.com/publishers/{name}](https://marketplace.visualstudio.com/publishers/{name}) |
| {variation1} | {YYYY-MM-DD} | YES/NO | |
| {variation2} | {YYYY-MM-DD} | YES/NO | |
```

**Column definitions:**
- **Name**: The variation being checked (publisher name)
- **Date**: Date of check (YYYY-MM-DD format)
- **Available**: YES or NO
- **Link**: URL if taken (leave empty if available)

After checking all variations, update the **Cross-Service Summary** section to reflect VS Code Marketplace availability.

## Sources

- [Publishing Extensions - VS Code](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Extension Marketplace - VS Code](https://code.visualstudio.com/docs/configure/extensions/extension-marketplace)
- [Extension Manifest - VS Code](https://code.visualstudio.com/api/references/extension-manifest)
- [Open VSX Registry](https://open-vsx.org/)
