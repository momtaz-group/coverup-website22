# Deployment Notes

## Current Project State

- The website is committed locally on the `main` branch and pushed to GitHub.
- The custom-domain file `CNAME` is set to `coverup.tech`.
- The site is deployed on Vercel production.
- The domain currently uses OrderBox nameservers and has no active Vercel DNS records yet.

## Live URLs

```text
GitHub: https://github.com/momtaz-group/coverup-website22
Vercel: https://premium-website-design-for-cover-up.vercel.app
```

## GitHub

Repository:

```text
https://github.com/momtaz-group/coverup-website22
```

Push updates:

```bash
git push
```

## Recommended Hosting: Vercel

Project:

```text
memo132/premium-website-design-for-cover-up
```

The current production alias is:

```text
https://premium-website-design-for-cover-up.vercel.app
```

The domains have been added in Vercel Project Settings -> Domains:

   - `coverup.tech`
   - `www.coverup.tech`

## DNS Records for Vercel

Add these records in your domain DNS panel at the current DNS provider:

```text
Type   Name   Value
A      @      216.198.79.1
A      @      64.29.17.1
CNAME  www    bbf182c0fbefd0db.vercel-dns-017.com.
```

Alternative: change the domain nameservers to:

```text
ns1.vercel-dns.com
ns2.vercel-dns.com
```

After DNS changes propagate, verify with:

```bash
vercel domains verify coverup.tech
vercel domains verify www.coverup.tech
```

## Alternative Hosting: GitHub Pages

If you host on GitHub Pages instead of Vercel, enable Pages from:

```text
Settings -> Pages -> Deploy from branch -> main -> /root
```

Then set the custom domain to:

```text
coverup.tech
```

GitHub Pages DNS usually requires four apex `A` records plus a `www` CNAME to your GitHub Pages hostname.
