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

The educator dashboard uses the teacher login endpoint and aggregates the linked students, error
distribution, and top words from the backend. If the acceptance-rate endpoint is unavailable, the
interface keeps the remaining live metrics visible and marks that KPI as temporarily unavailable.

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
