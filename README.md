# Ai Guide App

This app provide Ai Assistance features for visitor in Science Center Singapore

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the dev server:
   ```bash
   npm run dev
   ```

3. Open your browser at the URL shown in the console (usually `http://localhost:5173`). Append a query string like:
   ```
   http://localhost:5173/?session=abc123
   ```

   You should see `session_id: abc123` displayed.

## Build for production

```bash
npm run build
```

The output will be in the `dist/` folder.

---

## Notes
- The `.gitignore` file ignores `node_modules` and build outputs.
- Styling is in a separate `App.css` file.
