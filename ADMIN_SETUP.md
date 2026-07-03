# Cover Up Admin Dashboard Setup

The dashboard is available at:

`https://coverup.tech/admin.html`

It is protected at the API level. The page can load publicly, but product changes, customers, orders, reviews, complaints, and chat data require the admin password and a private server-side data store.

## Required Vercel Environment Variables

- `ADMIN_USERNAME`: private dashboard username.
- `ADMIN_PASSWORD`: strong private password for the dashboard.
- `SUPABASE_URL`: Supabase project URL.
- `SUPABASE_ANON_KEY`: public read key for active products.
- `SUPABASE_SERVICE_ROLE_KEY`: private server-side key for dashboard writes and sensitive data.

Optional payment variables are documented in `PAYMENT_SETUP.md`.

## Optional Official Email

Customer registration works without an email provider. Welcome emails and password recovery emails need:

- `RESEND_API_KEY`: Resend API key.
- `OFFICIAL_EMAIL_FROM`: sender address, for example `Cover Up <hello@coverup.tech>`.

If email is not configured, password recovery requests are stored in the dashboard so the team can follow up manually.
The same setup is used for welcome emails and email verification codes.

## Why These Are Required

Static website files cannot safely store private orders, customer phone numbers, complaints, account data, or uploaded product data. Supabase keeps this data server-side, and the API checks `ADMIN_USERNAME` and `ADMIN_PASSWORD` before returning sensitive dashboard data.

## Current Safety Behavior

- If Supabase is not configured, the public website keeps working from built-in fallback products.
- Dashboard data storage will show a setup message.
- Sensitive dashboard APIs return unauthorized unless the correct admin password is sent.
- Customer passwords are stored as salted hashes, never as plain text.
- Product upload uses images embedded as data URLs inside Supabase rows. For larger catalogs, move images to Supabase Storage or Vercel Blob later.
