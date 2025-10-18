# ScopeSmart Project Status

## Progress
- Firebase authentication, session management, and theme persistence are implemented via dedicated providers (`src/context/AuthContext.tsx:23`, `src/context/ThemeContext.tsx:29`).
- Routing, protected shell navigation, and responsive layout cover every primary page (`src/App.tsx:36`, `src/layouts/AppLayout.tsx:18`).
- Estimator workspace supports material, labor, equipment, and permit inputs, auto-saves to localStorage, syncs with Firestore, and exports summaries (`src/pages/EstimatorPage.tsx:654`, `src/pages/EstimatorPage.tsx:794`, `src/pages/EstimatorPage.tsx:1686`).
- Dashboard and project views expose portfolio metrics and CRUD workflows powered by Firestore (`src/pages/DashboardPage.tsx:29`, `src/pages/ProjectsPage.tsx:40`, `src/components/CreateProjectModal.tsx:27`).
- Vendor management and aggregate reporting cover subcontractors as well as materials and labor analytics (`src/pages/SubcontractorsPage.tsx:35`, `src/components/SubcontractorSection.tsx:22`, `src/pages/MaterialsPage.tsx:328`, `src/pages/LaborPage.tsx:12`).
- Shared Firestore hooks and helpers centralize data subscription patterns and timestamp handling (`src/hooks/useUserCollection.ts:37`, `src/utils/firestoreHelpers.ts:19`).
- Materials catalog now supports add, edit, and removal flows backed by Firestore helpers so estimator selections stay in sync (`src/utils/firestoreHelpers.ts:193`, `src/pages/MaterialsPage.tsx:164`).
- Area conversion utilities now rely on the `AreaUnit` alias, keeping the estimator compliant with strict TypeScript builds (`src/pages/EstimatorPage.tsx:42`).
- Marketing landing page rebuilt around the winning formula with production-ready messaging and subscription CTAs (`src/pages/LandingPage.tsx:1`, `src/App.css:1700`).

## Remaining
- Add automated tests around the financial calculations and estimator state flows to protect core math and persistence logic (`src/utils/calculations.ts:51`, `src/pages/EstimatorPage.tsx:654`).
- Capture a Cypress or Playwright smoke flow that exercises the materials catalog CRUD to guard against regressions (`src/pages/MaterialsPage.tsx:164`).
- Wire up marketing analytics to track hero and plan CTA conversions (consider PostHog or Google Tag Manager) (`src/pages/LandingPage.tsx:164`).

## Suggested Next Step
1. Stand up automated coverage for estimator calculations to lock in recent refactors and protect future releases.
