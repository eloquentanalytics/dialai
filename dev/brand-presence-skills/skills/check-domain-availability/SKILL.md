---
name: check-domain-availability
description: Check if a domain name is available for registration across TLDs (.com, .dev, .io, .ai, etc.). Use when verifying brand name availability for web presence.
---

# Check Domain Name Availability

How to verify if a domain name is available for registration.

## Method 1: RDAP Query (Recommended for Agents)

RDAP (Registration Data Access Protocol) is the modern replacement for WHOIS with structured JSON responses.

For .com/.net domains (Verisign):
```bash
curl -s "https://rdap.verisign.com/com/v1/domain/{name}.com"
```

- **404** = Domain is available
- **200** = Domain is registered

Example:
```bash
curl -s -o /dev/null -w "%{http_code}" "https://rdap.verisign.com/com/v1/domain/dialai.com"
```

## RDAP Servers by TLD

| TLD | RDAP Server |
|-----|-------------|
| .com, .net | `https://rdap.verisign.com/com/v1/domain/{domain}` |
| .org | `https://rdap.publicinterestregistry.org/rdap/domain/{domain}` |
| .io | `https://rdap.nic.io/domain/{domain}` |
| .dev | `https://rdap.nic.google/domain/{domain}` |
| .ai | No public RDAP (use WHOIS or registrar API) |

## Method 2: DNS Lookup

A quick heuristic (not 100% reliable):

```bash
dig +short {name}.com
```

- No output often means unregistered (but not always)
- Output means registered

This can give false positives for parked/unused domains.

## Method 3: Third-Party APIs

For reliable bulk checking, use a domain availability API:

**Free/Open Options:**
- [DomainStat](https://github.com/namewiz/domainstat) - TypeScript library combining RDAP, WHOIS, and DNS

**Paid APIs:**
- [WhoisXML API](https://domain-availability.whoisxmlapi.com/)
- [WhoAPI](https://whoapi.com/domain-availability-api/)
- [API Ninjas WHOIS](https://api-ninjas.com/api/whois)

Example with DomainStat:
```typescript
import { checkDomain } from 'domainstat';
const result = await checkDomain('dialai.com');
console.log(result.available);
```

## Method 4: Registrar APIs

Most domain registrars offer availability check APIs:

**Namecheap:**
```bash
curl "https://api.namecheap.com/xml.response?ApiUser={user}&ApiKey={key}&UserName={user}&Command=namecheap.domains.check&DomainList={name}.com"
```

**GoDaddy:**
```bash
curl -H "Authorization: sso-key {key}:{secret}" \
  "https://api.godaddy.com/v1/domains/available?domain={name}.com"
```

## Checking Multiple TLDs

Check all common TLDs at once:

```bash
for tld in com io dev ai org; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://rdap.verisign.com/com/v1/domain/dialai.$tld" 2>/dev/null || echo "N/A")
  echo "dialai.$tld: $code"
done
```

Note: Different TLDs have different RDAP servers; the above only works for .com/.net.

## Caveats

- **Premium domains**: Some "available" domains have premium pricing
- **Reserved names**: Some names are reserved by registries
- **Rate limits**: RDAP/WHOIS servers rate limit queries
- **Grace periods**: Recently expired domains may show as registered

## Recording Results

Record all availability checks in `NAME_VARIATION_AVAILABILITY.md`. Add or update the **Domain** section:

```markdown
## Domain

### Website Domain
**Common TLDs (ordered by preference):** .com, .ai, .dev, .io, .app, .org, .co

| Name | Date | Available | Link |
|------|------|-----------|------|
| **{name}.com** | {YYYY-MM-DD} | YES/NO | |
| **{name}.ai** | {YYYY-MM-DD} | YES/NO | |
| **{name}.dev** | {YYYY-MM-DD} | YES/NO | |
| **{name}.io** | {YYYY-MM-DD} | YES/NO | Created {date} |
| **{variation}.com** | {YYYY-MM-DD} | YES/NO | |
```

**Column definitions:**
- **Name**: The full domain being checked (bold for emphasis)
- **Date**: Date of check (YYYY-MM-DD format)
- **Available**: YES or NO
- **Link**: Leave empty; optionally note creation date if recently registered

After checking all variations across TLDs, update the **Cross-Service Summary** section to reflect domain availability patterns.

## Sources

- [DomainStat on GitHub](https://github.com/namewiz/domainstat)
- [WhoisXML API Domain Availability](https://domain-availability.whoisxmlapi.com/)
- [Best WHOIS & RDAP APIs 2025](https://domscan.net/best/whois-api)
