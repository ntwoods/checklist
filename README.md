# NT Woods Checklist System

Production-ready checklist system for NT Woods. React (Vite) frontend + Google Apps Script backend with Google Sheet data source and GIS ID token authentication.

## Project Structure
- `src/` React app
- `apps-script/` Google Apps Script backend (deploy as Web App)
- `.github/workflows/deploy.yml` GitHub Pages deployment

## Google Apps Script Setup
1) Create a new Google Apps Script project.
2) Replace the default code with `apps-script/Code.gs`.
3) Add `apps-script/appsscript.json` (Project Settings -> “Show appsscript.json”).
4) In Apps Script, set the deployment:
   - Deploy > New deployment
   - Type: Web App
   - Execute as: Me
   - Who has access: Anyone
5) Copy the **Web App exec URL**.

## Frontend Setup
1) Copy `.env.example` to `.env`.
2) Set:
   - `VITE_GAS_WEBAPP_URL` to the Web App exec URL
   - `VITE_GOOGLE_CLIENT_ID` (already populated)
3) Install and run locally:

```bash
npm install
npm run dev
```

## GitHub Pages Deployment
1) Push to `main`.
2) In GitHub repo settings, set Pages -> Source: GitHub Actions.
3) The workflow builds and deploys from `dist/`.

## Notes
- Backend verifies ID tokens with Google `tokeninfo` and filters tasks by email.
- Tasks are returned only when `Actual` is blank and `Planned` is due today or earlier.
- Frontend posts `text/plain` to avoid CORS preflight for Apps Script Web Apps.

## Environment Variables
See `.env.example` for required values.
