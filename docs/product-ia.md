# Product IA (implemented)

## Root

- `/(tabs)/home` — Trip list, create trip CTA
- `/(tabs)/profile` — Theme + account shell
- `/create-trip` — Modal create trip flow

## Trip workspace (`/trip/[tripId]`)

| Route | Purpose |
| --- | --- |
| `index` | Trip dashboard — summary, quick actions, settle when ready |
| `people` | Member list, invite placeholder |
| `people/add` | Manual add person |
| `expenses` | Add expense + timeline |
| `settlement` | Review → transfers → mark paid → complete run |
| `settings` | Trip metadata + per-member EMT |

## User flow

1. Home → Create trip
2. Trip dashboard → Add people (≥2)
3. Record expenses during trip
4. When ready → Settlement review → EMT list
5. Mark paid → Complete settlement run

## State

- [`src/state/trips-context.tsx`](../src/state/trips-context.tsx) — multi-trip store
- [`src/state/trip-selectors.ts`](../src/state/trip-selectors.ts) — status, summaries, transfers
