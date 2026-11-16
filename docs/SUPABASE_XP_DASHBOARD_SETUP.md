# Tuzla Tour Guide — Supabase XP and dashboard setup

This change uses the existing Supabase project and gamification tables. It does not create a replacement project and does not touch Storage audio files.

## 1. Vercel environment variables

Add these to the existing Vercel project for **Production, Preview, and Development**:

- `VITE_SUPABASE_URL` — the Supabase project API URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — the Supabase publishable key (or legacy anon key)

Do **not** add a `service_role` key to any `VITE_*` variable or browser bundle.

After saving the variables, redeploy the app.

## 2. Supabase Auth redirect URLs

In Supabase → Authentication → URL Configuration:

- Set the Site URL to the production app URL.
- Add the production callback: `https://tuzlatourguide.vercel.app/dashboard`
- Add the local callback: `http://localhost:3000/dashboard`
- Add any Vercel preview domains you intend to test.

The dashboard uses passwordless email magic links. Make sure the Email provider is enabled and the email template redirects to the supplied `redirectTo` URL.

## 3. Give the operator admin access

The app uses the existing `public.user_roles` allowlist. Run this once in Supabase SQL Editor, replacing the email with the operator's actual sign-in email:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'
from auth.users
where lower(email) = lower('ADMIN_EMAIL_HERE')
on conflict (user_id, role) do nothing;
```

The user must sign in at least once before this query can find their `auth.users` row. Do not create a client-side admin switch; admin access is enforced in database functions and RLS.

To revoke access:

```sql
delete from public.user_roles
where user_id = (select id from auth.users where lower(email) = lower('ADMIN_EMAIL_HERE'))
  and role = 'admin';
```

## 4. Configure the 12 physical QR codes

Open `/dashboard`, sign in with the admin account, then open **Admin control room → Quest & QR control**.

For each quest:

1. Click **Generate secure QR** to create a unique random payload, or paste the exact text from an existing QR if it is at least 16 characters.
2. Click **Download PNG** and print/place that QR at the matching physical location.
3. Click **Save QR**. The database stores a SHA-256 digest, not the raw QR payload.
4. Confirm the status changes to **QR configured**.

Generated payloads use the quest ID as a prefix followed by a random secret. The scanner recognises that prefix, while the database verifies the complete payload. Replace short/old QR codes with the newly generated PNGs; do not reuse the same payload at different locations.

All active quests are configured to require GPS within their existing **20 metre** radius. The completion RPC validates the signed-in player, active quest, QR digest, GPS coordinates, unique completion, and XP transaction on the server. A static QR can still be photographed/shared and GPS can be spoofed on a compromised device; this is anti-replay and location friction, not perfect proof of physical presence.

## 5. XP rules already configured

- Quest completion: each quest's existing `xp_reward` (currently 100 XP).
- Phase completion bonuses: 150 / 200 / 250 XP for phases 1–3.
- Grand finale bonus: 500 XP.
- XP is written to `public.xp_transactions` with idempotency keys.
- Achievements are unlocked once per player.
- Levels are calculated by the existing `tuzla_level_for_xp` / `tuzla_level_title` functions.
- The public leaderboard includes only players who opt in.

## 6. Test before production

Use a Vercel Preview deployment and test:

- Email magic-link sign-in and return to `/dashboard`.
- Player XP, level, completion history, achievements, and opt-in leaderboard.
- Admin-only metrics and QR configuration.
- Valid QR + GPS inside 20m awards XP once.
- Same QR again returns already completed and awards no extra XP.
- Wrong QR and GPS outside 20m are rejected and logged.
- A normal player cannot open admin controls or write XP/completion rows directly.

## Notes

The Supabase project already had the core XP ledger, achievements, completion RPC, leaderboard, and admin dashboard. This frontend consumes those existing database features. The current 12 quests have no QR payload configured yet, so rewards remain blocked until the QR setup step is completed.
