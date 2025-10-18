# ScopeSmart Estimator Suite

ScopeSmart is a construction estimating workspace that combines a project dashboard, cost tracking tools, and a full-featured estimator backed by Firebase authentication and storage. Build and manage projects, sync estimates across devices, and toggle light or dark mode to match your preference.

## Features

- **Dashboard overview** with real-time cards and a projects table sourced from Firestore.
- **Projects workspace** to create, filter, update, and delete project records with activity tracking.
- **Estimator** with detailed category breakdowns, financial summary, JSON export, clipboard summary, and cloud save/load for authenticated users.
- **Materials & Labor analytics** aggregating saved estimates to surface spend and usage patterns.
- **Theme settings** that persist your light or dark preference and account panel with quick sign-out.
- **Firebase Auth + Firestore** storing per-user projects and estimates so teams can access their data from any device.

## Tech Stack

- React 19 + React Router for routing and UI composition.
- TypeScript across components, hooks, and domain models.
- Firebase (Auth + Firestore) for secure persistence.
- Vite for the dev server and production bundling.
- Vanilla CSS with custom design tokens and responsive layout.

## Getting Started

1. Install dependencies:
   `ash
   npm install
   `
2. Create a Firebase project and enable Email/Password authentication. Provision a Firestore database (Start in production mode).
3. Copy .env.example to .env.local and fill in your Firebase settings:
   `ash
   cp .env.example .env.local
   # then edit .env.local with your Firebase project keys
   `
4. Run the development server:
   `ash
   npm run dev
   `
   Vite defaults to http://localhost:5173.
5. Build for production:
   `ash
   npm run build
   `

## Workspace Tips

- Use the **Dashboard** to monitor total approved value, active estimates, and quick links into projects.
- In **Projects**, click **Manage** on any row to update status, adjust approved value, or remove the project entirely.
- The **Estimator** auto-saves locally and lets you save the current state to Firestore. Load any saved estimate from the dropdown, export as JSON, or copy the summary for proposals.
- **Materials** and **Labor** views aggregate every saved estimate so you can see where spend and hours concentrate.
- Head to **Settings** to flip between light and dark theme; the choice is persisted for future visits.

## Key Modules

- src/context/ – AuthProvider and ThemeProvider that manage global authentication state and theme toggling.
- src/hooks/useUserCollection.ts – Re-usable Firestore collection listener scoped to the current user.
- src/utils/firestoreHelpers.ts – Thin wrappers for creating projects and saving/deleting estimates.
- src/pages/ – Route-level components for Dashboard, Projects, Estimates, Materials, Labor, Settings, and Auth screens.
- src/pages/EstimatorPage.tsx – Core estimating logic: state sanitisation, calculations, local persistence, and cloud save/load.

## Scripts

- 
pm run dev – Start the Vite dev server.
- 
pm run build – Type-check and produce a production build.
- 
pm run preview – Preview the production bundle.
- 
pm run lint – Lint the project with ESLint.

Happy estimating with ScopeSmart!
