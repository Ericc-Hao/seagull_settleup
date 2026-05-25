# Product IA (implemented)

## Root

- `/(tabs)/home` — Trip list, create trip CTA
- `/(tabs)/profile` — Theme + account shell
- `/create-group` — Modal create group flow

## Group workspace (`/group/[groupId]`)

| Route | Purpose |
| --- | --- |
| `add-expense` | Add personal or split expense |
| `settle-up` | Review calculated transfers and mark paid |

## User flow

1. Home → Create group
2. Add members and record expenses
3. Review settlement transfers
4. Mark paid when settled

## State

- Supabase Auth stores session state through AsyncStorage.
- Business data is loaded from Supabase through `src/services`.
