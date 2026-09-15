# Frontend — Smart Campus Lost & Found System

React frontend for the Smart Campus Lost & Found System.
See `../docs/api-contract.md` for the proposed backend integration contract.

## Stack

| Concern | Choice |
| --- | --- |
| Build tool | Vite |
| Framework | React (JavaScript/JSX) |
| Routing | React Router |
| Icons | Lucide React |
| Styling | Plain CSS with custom properties — no UI framework |
| HTTP | Native `fetch`, wrapped in `src/services/api.js` |

Only four runtime dependencies: `react`, `react-dom`, `react-router-dom`,
`lucide-react`. No Tailwind, no Bootstrap, no Material UI, no axios, no
TypeScript.

## Getting started

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

The app runs at http://localhost:5173.

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm run lint` | Lint the source |

## Environment variables

| Variable | Meaning |
| --- | --- |
| `VITE_API_BASE_URL` | Backend base URL, no trailing slash |
| `VITE_USE_MOCK` | `true` uses local fixtures; `false` calls the real backend |

`.env` is git-ignored. Only `.env.example` is committed, with placeholders only.

## Structure

```
src/
├── assets/
├── components/
│   ├── common/        Button, Card, StatusBadge, ThemeToggle, state views
│   ├── layout/         (empty — Sidebar/header arrive with the app layout)
│   ├── items/          (empty — item cards arrive with item features)
│   ├── forms/          (empty — shared form controls arrive with forms)
│   ├── claims/         (empty — claim UI arrives with claims)
│   └── notifications/  (empty — notification UI arrives later)
├── pages/               one folder per feature area, currently empty
│   └── FoundationCheck.jsx   temporary Stage 1 verification page
├── services/
│   ├── api.js           fetch wrapper, JWT header, error normalisation
│   ├── endpoints.js      proposed endpoint paths (backend not implemented)
│   ├── authService.js    used by AuthContext
│   └── mock/             isolated placeholder data
├── context/              AuthContext, ThemeContext
├── hooks/                useAuth, useTheme
├── utils/                schema-derived constants, status maps, storage
└── styles/               tokens.css — the design system
```

## Working rules

**Design tokens.** Every colour comes from a semantic token in
`src/styles/tokens.css` (`--color-surface`, `--color-text-muted`, …). Never
write a raw hex value in a component. Dark mode works automatically because
only `tokens.css` redefines those tokens.

**Backend does not exist yet.** Every endpoint in `src/services/endpoints.js`
and `docs/api-contract.md` is proposed, not implemented. `VITE_USE_MOCK=true`
routes every service call through `src/services/mock/` instead.

**Service layer.** Components never call `fetch` directly. All backend access
goes through `src/services/`, so wiring up the real backend later touches no
UI code.

**Database is authoritative.** `src/utils/constants.js` mirrors only the
values the team has confirmed (`users.role`, `claims.status`). No field or
status is invented ahead of the schema.

**Security.** Role checks in this app control what the interface offers, never
what the API permits. The backend must authorise every request independently.
`ownership_verifications.expected_answer` must never be sent to the frontend —
see `docs/api-contract.md`.

## Progress

- [x] Stage 1 — Project setup, design tokens, foundation components, service
      and context foundation
- [ ] Application layout
- [ ] Authentication UI and protected routes
- [ ] Feature pages (dashboard, reporting, search, matching, claims, chat,
      notifications, profile, admin)

`src/pages/FoundationCheck.jsx` is a temporary scaffold that renders the
design system for verification. It is removed once real pages exist.
