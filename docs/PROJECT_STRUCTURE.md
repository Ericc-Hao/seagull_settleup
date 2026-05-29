# Seagull Split — Project Structure

## Stack

- **React Native** + **Expo SDK 56** + **TypeScript**
- **Expo Router** for navigation
- **NativeWind** (Tailwind) + `src/theme` design tokens
- **react-native-heroicons** for icons
- **Supabase** (`EXPO_PUBLIC_SUPABASE_*`) as the single source of truth

## Color palette

| Token | Hex |
|-------|-----|
| Primary | `#B1B2FF` |
| Primary light | `#AAC4FF` |
| Surface muted | `#D2DAFF` |
| Background | `#EEF1FF` |

## Folder layout

```
app/                          # Expo Router routes (thin wrappers)
  (tabs)/
    home.tsx                  → HomeScreen
    expenses.tsx
    groups.tsx
    profile.tsx
    _layout.tsx               → BottomTabBar
  create-group.tsx            → CreateGroupScreen
  group/[groupId]/
    add-expense.tsx           → AddExpenseScreen
    settle-up.tsx             → SettleUpScreen

src/
  theme/                      # design system: colors, typography, spacing, radii, shadows, buttons, cards
  types/                      # models, inputs, view DTOs
  lib/
    supabase.ts               # Supabase client (AsyncStorage session)
    supabaseSnapshot.ts       # fetch all tables → cache
    dataCache.ts              # in-memory read cache for UI
    mappers.ts                # DB rows → domain models
  data/
    constants.ts              # UI copy, categories, quick actions
  services/                   # group, expense, member, settlement, profile, home
  hooks/                      # useHomeData, useGroupsData, useExpensesData, etc.
  context/
    AppDataContext.tsx        # refresh() after mutations
  utils/
    money.ts                  # integer cents only
    date.ts
  components/                 # reusable UI
    AppHeader.tsx
    SeagullAvatar.tsx
    OverviewCard.tsx
    PrimaryButton.tsx
    SecondaryButton.tsx
    SectionCard.tsx
    SplitGroupCard.tsx
    FormInputCard.tsx
    BottomTabBar.tsx
    Icon.tsx
    ScreenLayout.tsx
  screens/                    # screen compositions
    HomeScreen.tsx
    CreateGroupScreen.tsx
    AddExpenseScreen.tsx
    SettleUpScreen.tsx
  core/settlement/            # settlement engine (tests)
```

## Run

```bash
npm start
npm run typecheck
npm test
```

## Data flow

```
Screen → hook → service → Supabase → dataCache
                ↓
         core/settlement (balance + transfer optimization)
```

Mutations call `refresh()` from `AppDataProvider` to reload Supabase into cache.

### Supabase setup

1. Copy `.env.example` → `.env` (or use project values).
2. Run `db/supabase_app_schema.sql` in the Supabase SQL editor.
3. Restart Expo (`npm start`).
