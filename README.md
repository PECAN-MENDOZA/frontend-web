# FlorisBoard educator dashboard

Vue frontend for the FlorisBoard educator workspace. The application uses a feature-first
architecture, PrimeVue for the interface, Pinia for shared feature state, and Vue Router for
public and protected routes.

## Local setup

```sh
npm install
npm run dev
```

Create a local `.env` file only when the API URL differs from the default:

```sh
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

The educator dashboard uses the teacher login endpoint and shows, per classroom or student and for
a chosen period (today, yesterday, last 7 days, or a custom range up to 92 days — no month
selector), what students wrote, how they responded to keyboard help, and their errors broken down
by type with recurring words to practice. It also lists students currently taking a sentence test
(polled every 5 seconds), and lets teachers download a per-student PDF report and reset a
student's PIN. The interface is descriptive only: no trends, comparisons, or evaluative statuses.

## Validation

```sh
npm run build
npx oxlint .
npx eslint .
```

## Source structure

```text
src/
  app/          # Router, layouts, and global providers
  assets/       # Shared visual styles and static assets
  features/     # Business modules with their own UI and logic
  shared/       # Cross-feature components, services, and constants
```

Each feature owns its views, components, composables, services, store, and utilities when those
layers are needed. HTTP configuration lives in `src/shared/services/api.js` so backend integration
and authentication behavior remain centralized.
