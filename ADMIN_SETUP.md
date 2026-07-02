# Cover Up Admin Dashboard Setup

The dashboard is available at:

`https://coverup.tech/admin.html`

It is protected at the API level. The page can load publicly, but product changes, orders, reviews, complaints, and chat data require the admin password and a private server-side data store.

## Required Vercel Environment Variables

- `ADMIN_USERNAME`: private dashboard username.
- `ADMIN_PASSWORD`: strong private password for the dashboard.
- `KV_REST_API_URL`: Vercel KV / Upstash Redis REST URL.
- `KV_REST_API_TOKEN`: Vercel KV / Upstash Redis REST token.

Optional payment variables are documented in `PAYMENT_SETUP.md`.

## Why These Are Required

Static website files cannot safely store private orders, customer phone numbers, complaints, or uploaded product data. Upstash Redis keeps this data server-side, and the API checks `ADMIN_USERNAME` and `ADMIN_PASSWORD` before returning sensitive dashboard data.

## Current Safety Behavior

- If KV is not configured, the public website keeps working.
- Dashboard data storage will show a setup message.
- Sensitive dashboard APIs return unauthorized unless the correct admin password is sent.
- Product upload uses images embedded as data URLs inside the secure store. For larger catalogs, move images to Vercel Blob later.
