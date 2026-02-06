# Contributing to DialAI

## Pre-Commit Checks

This repository uses Git hooks to ensure code quality before commits and pushes:

### Pre-Commit Hook
Runs automatically before each commit:
- TypeScript type checking
- ESLint

To skip (not recommended):
```bash
git commit --no-verify
```

### Pre-Push Hook
Runs automatically before each push:
- TypeScript type checking
- ESLint
- Tests
- Build verification

This matches what GitHub Actions runs in CI, so if pre-push passes, CI should pass too.

To skip (not recommended):
```bash
git push --no-verify
```

## Manual Checks

You can run the same checks manually:

```bash
# Run all CI checks (same as pre-push)
npm run ci

# Individual checks
npm run typecheck  # TypeScript type checking
npm run lint       # ESLint
npm test           # Run tests
npm run build      # Build verification
```

## Development Workflow

1. Make your changes
2. Run `npm run ci` to verify everything passes
3. Commit (pre-commit hook will run automatically)
4. Push (pre-push hook will run automatically)

If any hook fails, fix the issues and try again.
