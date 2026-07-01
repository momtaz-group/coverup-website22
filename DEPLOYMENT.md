# Deployment Notes

## Current Project State

- The website is committed locally on the `main` branch.
- The custom-domain file `CNAME` is set to `coverup.tech`.
- The domain currently uses OrderBox nameservers and has no active `A` record for `coverup.tech` or `CNAME` for `www.coverup.tech`.

## GitHub

Create a repository named:

```text
coverup-website
```

Then push this local repository:

```bash
git remote add origin https://github.com/YOUR_USERNAME/coverup-website.git
git push -u origin main
```

## Recommended Hosting: Vercel

1. Import the GitHub repository into Vercel.
2. Framework preset: `Other`.
3. Build command: leave empty.
4. Output directory: leave empty.
5. Add both domains in Vercel Project Settings -> Domains:
   - `coverup.tech`
   - `www.coverup.tech`

## DNS Records for Vercel

Add these records in your domain DNS panel:

```text
Type  Name  Value
A     @     76.76.21.21
CNAME www   Use the exact CNAME value Vercel shows for your project
```

Vercel may show a project-specific CNAME target in the Domains screen. Use that exact value for `www`.

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
