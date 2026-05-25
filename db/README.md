# Seagull Split — Database

## Apply schema

1. Open [Supabase SQL Editor](https://supabase.com/dashboard) for your project.
2. Paste and run the migrations in order:

   **`../supabase/migrations/202605240001_init_core_schema.sql`**
   **`../supabase/migrations/202605240002_add_receipts_categories.sql`**

You can also push with the Supabase CLI after logging in:

```bash
supabase login
supabase link --project-ref yljcebabixdakgwsvqtm
supabase db push
```

## Tables

| Table | Purpose |
|-------|---------|
| `profiles` | 1:1 with `auth.users`, EMT + display name |
| `groups` | Trips / dinners / shared budgets |
| `group_members` | People in a group (`user_id` optional) |
| `expenses` | Personal (`group_id` null) or split |
| `expense_splits` | Per-member shares (cents) |
| `teams` | Couple/team settlement |
| `team_members` | Members in a team |
| `settlements` | Recorded transfers |
| `receipts` | Uploaded receipt metadata |
| `categories` | System and user categories |

## Security

- Row Level Security enabled on all tables.
- Users see their own profile, groups they own, and owned group expenses/settlements.
- No example business data is created by the migration.
