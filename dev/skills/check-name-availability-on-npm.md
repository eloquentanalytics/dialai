# Check Name Availability on npm

How to verify if a package name is available on the npm registry.

## Method 1: HTTP Request (Recommended for Agents)

Fetch the npm registry API directly:

```bash
curl -s -o /dev/null -w "%{http_code}" https://registry.npmjs.org/{name}
```

- **404** = Name is available
- **200** = Name is taken

Example:
```bash
curl -s -o /dev/null -w "%{http_code}" https://registry.npmjs.org/dialai
```

## Method 2: npm CLI

```bash
npm view {name}
```

- If the package exists, it prints package info
- If available, it prints `npm error code E404`

## Method 3: npm-name Package

Install and use the [npm-name](https://github.com/sindresorhus/npm-name) package:

```bash
npx npm-name-cli {name}
```

Or programmatically:
```javascript
import npmName from 'npm-name';
const available = await npmName('dialai');
console.log(available); // true if available
```

## Validation Rules

npm package names must:
- Be lowercase
- Be 214 characters or fewer
- Not start with a dot or underscore
- Not contain spaces
- Not contain uppercase letters
- Only contain URL-safe characters

## Scoped Packages

For scoped packages like `@org/package`:
```bash
curl -s -o /dev/null -w "%{http_code}" https://registry.npmjs.org/@org%2Fpackage
```

## Rate Limits

The npm registry API has rate limits. For bulk checking, add delays between requests or use the [npm-name](https://www.npmjs.com/package/npm-name) package which handles this.

## Sources

- [npm-name GitHub](https://github.com/sindresorhus/npm-name)
- [Exploring the npm registry API](https://www.edoardoscibona.com/exploring-the-npm-registry-api)
- [How to check NPM package availability](https://carlosroso.com/how-to-check-npm-package-availability/)
