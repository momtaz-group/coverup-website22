# Cover Up Admin Dashboard Setup

The dashboard is available at:

`https://coverup.tech/admin.html`

It is protected at the API level. The page can load publicly, but product changes, orders, reviews, complaints, and chat data require the admin password and a private server-side data store.

## Required Vercel Environment Variables

- `ADMIN_USERNAME`: private dashboard username.
- `ADMIN_PASSWORD`: strong private password for the dashboard.
- `SUPABASE_URL`: Supabase project URL.
- `SUPABASE_ANON_KEY`: public read key for active products.
- `SUPABASE_SERVICE_ROLE_KEY`: private server-side key for dashboard writes and sensitive data.

Optional payment variables are documented in `PAYMENT_SETUP.md`.

## Why These Are Required

Static website files cannot safely store private orders, customer phone numbers, complaints, or uploaded product data. Supabase keeps this data server-side, and the API checks `ADMIN_USERNAME` and `ADMIN_PASSWORD` before returning sensitive dashboard data.

## Current Safety Behavior

- If Supabase is not configured, the public website keeps working from built-in fallback products.
- Dashboard data storage will show a setup message.
- Sensitive dashboard APIs return unauthorized unless the correct admin password is sent.
- Product upload uses images embedded as data URLs inside Supabase rows. For larger catalogs, move images to Supabase Storage or Vercel Blob later.
