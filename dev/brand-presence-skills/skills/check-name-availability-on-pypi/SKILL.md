---
name: check-name-availability-on-pypi
description: Check if a package name is available on the Python Package Index (PyPI). Use when planning to publish a Python package and need to verify the package name.
---

# Check Name Availability on PyPI

How to verify if a package name is available on the Python Package Index.

## Method 1: HTTP Request (Recommended for Agents)

Fetch the PyPI JSON API directly:

```bash
curl -s -o /dev/null -w "%{http_code}" https://pypi.org/pypi/{name}/json
```

- **404** = Name is available
- **200** = Name is taken

Example:
```bash
curl -s -o /dev/null -w "%{http_code}" https://pypi.org/pypi/dialai/json
```

Alternative using the project page:
```bash
curl -s -o /dev/null -w "%{http_code}" https://pypi.org/project/{name}/
```

## Method 2: check-pypi-name Package

Install and use [check-pypi-name](https://pypi.org/project/check-pypi-name/):

```bash
pip install check-pypi-name
check-pypi-name {name}
```

## Method 3: pip-name Package

Use [pip-name](https://github.com/danishprakash/pip-name):

```bash
pip install pip-name
pip-name {name}
```

## Name Normalization

PyPI normalizes package names. These are all considered the same:
- `my-package`
- `my_package`
- `my.package`
- `My_Package`

When checking availability, PyPI will treat normalized variants as taken if any variant exists.

## Reserved/Forbidden Names

Some names are reserved or forbidden on PyPI. A 404 response means the name is available, but PyPI may still reject it during upload if it's:
- Too similar to an existing package
- A reserved standard library name
- Flagged for other policy reasons

## Note on pip search

`pip search` has been disabled since 2020. Use the HTTP API method above instead.

## Recording Results

Record all availability checks in `NAME_VARIATION_AVAILABILITY.md`. Add or update the **Package Managers** section:

```markdown
## Package Managers

### PyPI
- **URL:** pypi.org/project/{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| {name} | {YYYY-MM-DD} | YES/NO | [pypi.org/project/{name}](https://pypi.org/project/{name}) |
| {variation1} | {YYYY-MM-DD} | YES/NO | |
| {variation2} | {YYYY-MM-DD} | YES/NO | |
```

**Column definitions:**
- **Name**: The variation being checked
- **Date**: Date of check (YYYY-MM-DD format)
- **Available**: YES or NO
- **Link**: URL if taken (leave empty if available)

After checking all variations, update the **Cross-Service Summary** section to reflect PyPI availability.

## Sources

- [check-pypi-name on PyPI](https://pypi.org/project/check-pypi-name/)
- [pip-name on GitHub](https://github.com/danishprakash/pip-name)
- [Checking if a package name is allowed on PyPI](https://discuss.python.org/t/checking-if-a-package-name-is-allowed-or-forbidden-reserved-on-pypi/8814)
- [PyPI Help](https://pypi.org/help/)
