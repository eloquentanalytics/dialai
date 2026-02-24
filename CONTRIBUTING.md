# Contributing to DIAL

Thank you for your interest in contributing to DIAL! This document provides guidelines for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/dialai.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b my-feature`

## Development Workflow

```bash
npm run build        # Build with TypeScript compiler
npm test             # Run tests
npm run typecheck    # Type check
npm run lint         # ESLint
npm run ci           # Full CI pipeline (typecheck + lint + test + build)
```

## Pre-Commit Checks

This repository uses Husky git hooks:

- **Pre-commit**: TypeScript type checking + ESLint
- **Pre-push**: Full CI pipeline (typecheck + lint + test + build)

If pre-push passes locally, CI should pass too.

## Submitting Changes

1. Make your changes on a feature branch
2. Run `npm run ci` to verify everything passes
3. Commit with a clear, descriptive message
4. Push to your fork and open a pull request
5. Fill out the PR template

## Code Style

- TypeScript with strict mode enabled
- Prettier for formatting (`npm run format`)
- ESLint for linting (`npm run lint`)
- ESM-only (no CommonJS)

## Reporting Issues

- Use the [bug report template](https://github.com/eloquentanalytics/dialai/issues/new?template=bug_report.md) for bugs
- Use the [feature request template](https://github.com/eloquentanalytics/dialai/issues/new?template=feature_request.md) for ideas

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
