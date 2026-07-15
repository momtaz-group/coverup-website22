# Supabase auth email template setup

Use [confirmation.html](/Users/ahmedmomtaz/coverup-website22/supabase/templates/confirmation.html) as the **Confirm signup** email template.

For a hosted Supabase project:

1. Open `Authentication -> Email Templates -> Confirm signup`.
2. Set the subject to `Confirm your Coverup email`.
3. Paste the contents of `confirmation.html` into the template editor.
4. Set the email OTP length to `6` in `Authentication -> Sign In / Providers -> Email`.

For local Supabase CLI projects, the equivalent config is:

```toml
[auth.email]
otp_length = 6

[auth.email.template.confirmation]
subject = "Confirm your Coverup email"
content_path = "./supabase/templates/confirmation.html"
```
