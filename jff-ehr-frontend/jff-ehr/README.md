# JFF EHR — design system + assessment vertical

Reference front-end slice for the Just Footprints Foundation EHR. Cream/teal
theme, shared components, and one clinical feature (Camper Assessment) wired
end to end. Every other screen in the app clones the shapes established here.

## Stack

React 18 + TypeScript + Vite · Tailwind (custom theme tokens) · TanStack Query
· React Hook Form + Zod · Axios · lucide-react · date-fns.

## Getting started

```bash
npm install
npm run dev        # mock API is on by default
npm run typecheck  # strict, passes clean
```

The mock API layer is active while `VITE_USE_MOCKS` is not `"false"`, so screens
work before the ASP.NET Core API exists. Point at the real API with a `.env`:

```
VITE_USE_MOCKS=false
VITE_API_BASE_URL=https://your-api.example/api
```

## Structure

```
src/
├── styles/theme.css                 # palette as CSS custom properties (edit colours here)
├── lib/utils.ts                     # cn() class merge
├── api/
│   ├── client.ts                    # Axios + JWT interceptor + OfflineError
│   └── query-client.ts              # TanStack Query defaults
├── components/
│   ├── ui/       button, field (input/textarea/select), status-pill
│   ├── forms/    form-section, form-field
│   └── layout/   app-header, offline-banner
└── features/campers/
    ├── components/  patient-banner, camper-assessment-page
    ├── forms/       camper-assessment-form
    ├── schemas/     assessment.schema.ts (Zod, conditional HIV block)
    ├── hooks/       use-assessment.ts (query + mutation)
    └── api/         assessment.api.ts (mock + real toggle)
```

## Design tokens

Colours live only in `src/styles/theme.css` as HSL channels and are surfaced as
Tailwind utilities in `tailwind.config.ts`. Never hardcode hex in a component.

| Role     | Utility            | Meaning                          |
| -------- | ------------------ | -------------------------------- |
| accent   | `accent`           | teal — clinical, primary actions |
| danger   | `danger`           | red — safety, HIV, alerts        |
| warning  | `warning`          | amber — pending, due             |
| admin    | `admin`            | purple — admin role              |
| neutral  | `neutral`          | gray — closed, inactive          |

Each has a `-tint` background variant (e.g. `bg-accent-tint text-accent`).

## Cloning a screen

To build MedShack, Incident, etc., reuse the same shape:

1. `PatientBanner` at the top (allergies passed in, so they follow the patient).
2. `FormSection` cards, `tone="danger"` for safety/HIV blocks.
3. `FormField` + the `field` inputs, wired with React Hook Form.
4. A Zod schema in `schemas/`, mirroring the ERD entity; use `superRefine`
   for conditional-required fields.
5. A `*.api.ts` with the mock/real toggle and an insert-only `create*` call.
6. Query + mutation hooks in `hooks/`.

Clinical records are insert-only by design: the API returns the saved record
with a server id and `signedAt`; there is no update endpoint.

## Notes

- Layout is desktop / landscape-tablet first. Tables and multi-column grids
  need a stack-to-card fallback below ~640px before mobile use at camp.
- Icons use lucide-react (typed, tree-shakeable). Swap freely; only valid
  exported names compile.
