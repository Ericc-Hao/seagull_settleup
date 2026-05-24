# Seagull SettleUp MVP Scope (v1)

## Product focus

Seagull SettleUp is an iPhone app for CAD-only shared expense tracking and EMT-ready settlement for trips, couples, and small groups.

**Flow:** Create trip → Add people → Record expenses during trip → Settle when ready.

See [product-ia.md](./product-ia.md) for implemented navigation.

## Primary user outcome

Users can input shared expenses manually and instantly get a clear "who pays whom" EMT transfer list with the smallest number of transfers.

## In scope (v1 must-have)

1. Authentication: Apple login + email login
2. Group management: create, edit, archive group
3. Member management: add members manually (registered and non-registered)
4. EMT profile fields per member (email, phone, preferred method, note)
5. Expense entry:
   - CAD amount
   - payer
   - participants
   - split method: equal or custom amount
   - category, note, date
6. Settlement engine:
   - individual mode
   - couple/team mode (team-level merge)
   - transfer minimization
   - cent-level rounding guarantees
7. Settlement tracking:
   - pending / paid / cancelled
   - mark transfer as paid
8. EMT assistant:
   - copy amount
   - copy receiver EMT contact
   - copy generated EMT message

## Out of scope (v1)

- Multi-currency support
- Bank API or Interac direct integration
- Receipt OCR and AI item recognition
- Social/chat features
- Subscription and monetization
- Web version

## Key acceptance criteria

### AC-01 Group + member setup

Given a user creates a group named "Banff Trip" in CAD,  
when they add A, B, C, D manually,  
then the group dashboard shows the 4 members and group status is active.

### AC-02 Expense recording

Given a group exists,  
when user adds:
- A paid CAD 2000 split equally across A/B/C/D
- B paid CAD 900 split equally across A/B/C/D  
then both expenses are persisted and visible in expense list.

### AC-03 Balance calculation

Given the above expenses,  
when settlement is recalculated,  
then member balances are:
- A: +1275.00
- B: +175.00
- C: -725.00
- D: -725.00

### AC-04 Optimized individual settlement

Given balances in AC-03,  
when system generates transfers,  
then output is:
- C -> A CAD 725.00
- D -> A CAD 550.00
- D -> B CAD 175.00

### AC-05 Couple/team settlement

Given team AC (A+C) and team BD (B+D),  
when system generates team settlement,  
then output is:
- BD -> AC CAD 550.00

### AC-06 EMT readiness

Given a settlement transfer has receiver EMT profile,  
when user views transfer details,  
then app shows receiver EMT email/phone and an EMT message template and allows one-tap copy.

## Implementation phases

1. Data model + schema
2. Settlement core + unit tests
3. App shell screens + local state flows
4. Backend integration (Supabase)
5. QA + TestFlight preparation
