# Check Name Availability on LinkedIn

How to verify if a company page vanity URL is available on LinkedIn.

## Method 1: HTTP Request (Best Free Option for Agents)

Fetch the LinkedIn company page and check response:

```bash
curl -s -o /dev/null -w "%{http_code}" -L "https://www.linkedin.com/company/{name}/"
```

- **404** = Company page name may be available
- **200** = Company page exists
- **999** = LinkedIn blocking (rate limit or bot detection)

Example:
```bash
curl -s -o /dev/null -w "%{http_code}" -L "https://www.linkedin.com/company/dialai/"
```

**Note:** LinkedIn aggressively blocks automated requests. You may need to add headers:

```bash
curl -s -o /dev/null -w "%{http_code}" -L \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
  "https://www.linkedin.com/company/{name}/"
```

## Method 2: LinkedIn Marketing API (Official)

If you have LinkedIn API access, use the Organization Lookup API:

```bash
curl -H "Authorization: Bearer {access_token}" \
  "https://api.linkedin.com/v2/organizations?q=vanityName&vanityName={name}"
```

- Empty results = name may be available
- Results returned = name is taken

**Note:** LinkedIn API access requires application approval.

## Method 3: Third-Party Services

**Apify LinkedIn Company URL Finder:**
- Can search for companies by name
- If no results, name may be available

**Nubela Company Lookup API:**
- Search by company name to see if LinkedIn page exists

## Caveats

### Bot Detection

LinkedIn has aggressive bot detection. Expect:
- Rate limiting (status 999)
- CAPTCHA challenges
- IP blocking

### Vanity URL vs Display Name

- **Vanity URL**: The URL slug (e.g., `/company/dialai`)
- **Display Name**: The visible company name (can have duplicates)

Only the vanity URL needs to be unique.

### URL Rules

LinkedIn company vanity URLs:
- Must be 3-100 characters
- Can contain letters, numbers, and hyphens
- Are case-insensitive
- Cannot be changed easily once set

### No Official Availability Check

LinkedIn does not provide an official "check availability" endpoint. The only way to confirm is to try creating the page.

## Alternative Approach

The most reliable method is to attempt to create the company page through LinkedIn's UI or API and see if it's accepted.

## Sources

- [Organization Lookup API - LinkedIn](https://learn.microsoft.com/en-us/linkedin/marketing/community-management/organizations/organization-lookup-api)
- [LinkedIn Company URL Finder - Apify](https://apify.com/anchor/linkedin-company-url-finder/api)
- [Accessing LinkedIn APIs](https://www.linkedin.com/help/linkedin/answer/a526048)
