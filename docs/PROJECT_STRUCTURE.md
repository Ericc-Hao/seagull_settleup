# Seagull Split — Project Structure

## Stack

- **React Native** + **Expo SDK 56** + **TypeScript**
- **Expo Router** for navigation
- **NativeWind** (Tailwind) + `src/theme` design tokens
- **react-native-heroicons** for icons
- **Mock data only** (no backend)

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
  data/
    mockData.ts               # all mock groups, expenses, settlement
    types.ts
  components/                 # reusable UI
    AppHeader.tsx
    SeagullAvatar.tsx
    OverviewCard.tsx
    PrimaryButton.tsx
    SecondaryButton.tsx
    QuickActionCard.tsx
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
  state/                      # legacy trip state (optional)
```

## Run

```bash
npm start
npm run typecheck
```
