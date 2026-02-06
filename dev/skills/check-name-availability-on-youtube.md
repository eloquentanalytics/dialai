# Check Name Availability on YouTube

How to verify if a channel handle (@name) is available on YouTube.

## Method 1: HTTP Request (Best Free Option for Agents)

Fetch the YouTube handle page and check response:

```bash
curl -s -o /dev/null -w "%{http_code}" "https://www.youtube.com/@{name}"
```

- **404** = Handle may be available
- **200** = Handle is taken

Example:
```bash
curl -s -o /dev/null -w "%{http_code}" "https://www.youtube.com/@dialai"
```

## Method 2: YouTube Data API v3 (Official)

Use the channels.list endpoint with forHandle parameter:

```bash
curl "https://www.googleapis.com/youtube/v3/channels?part=id&forHandle={name}&key={API_KEY}"
```

- Empty `items` array = handle may be available
- Items returned = handle is taken

Example:
```bash
curl "https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=dialai&key=YOUR_API_KEY"
```

**Response when taken:**
```json
{
  "items": [
    { "id": "UC..." }
  ]
}
```

**Response when available:**
```json
{
  "items": []
}
```

## Method 3: youtube-handles Library

Use the open-source [youtube-handles](https://github.com/maxtheaxe/youtube-handles) Python library:

```python
# Clone and use the library to check handle availability
```

## Getting a YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project
3. Enable "YouTube Data API v3"
4. Create credentials (API Key)

**Free quota:** 10,000 units/day (channels.list = 1 unit)

## Handle Naming Rules

YouTube handles must:
- Be 3-30 characters
- Contain only letters (a-z), numbers (0-9), underscores, hyphens, periods
- Not contain spaces or special characters
- Not impersonate others or be misleading

## Caveats

### Handle vs Username vs Custom URL

YouTube has had multiple naming systems:
- **Handle** (@dialai) - Current system, unique
- **Legacy username** - Old system, may still exist
- **Custom URL** - Can be based on channel name

Check all variations for complete picture.

### Reserved Handles

Some handles are reserved by YouTube or taken by verified channels.

### Rate Limits

- **API**: 10,000 units/day free
- **Direct HTTP**: May get rate limited or blocked

### Brand Accounts

Brand accounts can have handles too. A handle being available doesn't guarantee you can claim it if there's a trademark conflict.

## Sources

- [youtube-handles on GitHub](https://github.com/maxtheaxe/youtube-handles)
- [YouTube Username Checker - Terrific Tools](https://www.terrific.tools/youtube/username-checker)
- [YouTube Channel Name Availability Checker](https://getlate.dev/tools/youtube-channel-name-availability-checker)
