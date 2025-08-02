# GeekCalendar Project Guidelines

This file outlines the development guidelines for the GeekCalendar project.

## Build/Run Commands
- **Install Dependencies**: `npm install`
- **Start Application**: `npm start`
- **Install Globally**: `npm install -g .`

## Test Commands
- **No tests configured**: The `package.json` indicates no tests are currently configured (`"test": "echo \"Error: no test specified\" && exit 1"`).
  - *Recommendation*: Implement unit and integration tests using a suitable framework (e.g., Jest, React Testing Library for Ink components).

## Code Style Guidelines

### General
- Follow existing code patterns and conventions.
- Prioritize readability and maintainability.

### Imports
- Use ES module syntax: `import { ... } from '...';`
- Group imports: built-in modules, npm packages, then local project modules.

### Formatting
- Consistent indentation (e.g., 2 spaces).
- Use semicolons.
- Consistent bracing style.

### Naming Conventions
- **Files**: `camelCase` for JavaScript files (e.g., `calendarData.js`).
- **Components**: `PascalCase` for React/Ink components (e.g., `Calendar.js`, `MonthEventList.js`).
- **Variables/Functions**: `camelCase`.
- **Constants**: `UPPER_SNAKE_CASE` (if applicable).

### Types
- JavaScript is used, so no static typing (like TypeScript) is enforced.
- *Recommendation*: Use JSDoc for documenting types and function signatures to improve code clarity and enable IDE type-checking.

### Error Handling
- Use `try...catch` blocks for asynchronous operations and potential runtime errors.
- Provide meaningful error messages.

### Comments
- Add comments to explain *why* complex logic is implemented, not *what* it does.
- Keep comments concise and up-to-date.

---
