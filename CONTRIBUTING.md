# Contributing to OAuth Connector SDK

Thank you for your interest in contributing to OAuth Connector SDK! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/muthaiyanmani/oauth-connector/issues)
2. If not, create a new issue using the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md)
3. Provide as much detail as possible:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (Node.js version, package version, etc.)
   - Code examples and error messages

### Suggesting Features

1. Check if the feature has already been requested
2. Create a new issue using the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md)
3. Clearly describe the use case and benefits

### Submitting Pull Requests

1. **Fork the repository** and create a new branch from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the existing code style
   - Add comments for complex logic
   - Update documentation if needed

3. **Run tests and checks**
   ```bash
   npm run lint
   npm run format:check
   npm run build
   ```

4. **Commit your changes**
   - Use clear, descriptive commit messages
   - Follow conventional commit format when possible:
     - `feat: add new feature`
     - `fix: fix bug`
     - `docs: update documentation`
     - `refactor: refactor code`
     - `test: add tests`

5. **Push and create a Pull Request**
   - Push your branch to your fork
   - Create a PR with a clear description
   - Reference any related issues
   - Fill out the PR template

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/muthaiyanmani/oauth-connector.git
   cd oauth-connector
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run development commands**
   ```bash
   npm run dev        # Watch mode for development
   npm run lint       # Run linter
   npm run lint:fix   # Fix linting issues
   npm run format     # Format code
   npm run build      # Build the package
   ```

## Code Style Guidelines

- Use TypeScript for all new code
- Follow the existing code style and patterns
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions focused and single-purpose
- Write self-documenting code

## Testing

- Add tests for new features
- Ensure all tests pass before submitting
- Test with different Node.js versions if possible
- Test with different OAuth providers (Zoho, Google, Generic)

## Documentation

- Update README.md if adding new features
- Add code examples for new functionality
- Update type definitions and JSDoc comments
- Keep examples in the `examples/` directory up to date

## Review Process

1. All PRs require at least one approval
2. CI checks must pass (lint, build, tests)
3. Code review feedback should be addressed
4. Maintainers will merge when ready

## Questions?

Feel free to open an issue for questions.

Thank you for contributing! 🎉

