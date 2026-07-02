# Cover Up Payment Setup

The storefront is prepared for Paymob hosted checkout. To activate live online payments, add these Vercel environment variables:

- `PAYMOB_SECRET_KEY`
- `PAYMOB_PUBLIC_KEY`
- `PAYMOB_INTEGRATION_ID`
- `PAYMOB_FALLBACK_EMAIL` optional, defaults to `hello@coverup.tech`
- `PAYMOB_REDIRECT_URL` optional, defaults to `https://coverup.tech/products.html`
- `PAYMOB_WEBHOOK_URL` optional, defaults to `https://coverup.tech/api/paymob-webhook`
- `PAYMOB_API_BASE` optional, defaults to `https://accept.paymob.com`

Required Paymob dashboard setup:

1. Complete merchant onboarding.
2. Enable the payment methods needed for Egypt, such as cards and wallets.
3. Copy the live secret key, public key, and integration ID.
4. Add the environment variables to Vercel.
5. Redeploy production.
6. Run one small live test transaction.

Until these variables are configured, the site keeps WhatsApp checkout active and shows a clear payment setup message if online payment is clicked.
