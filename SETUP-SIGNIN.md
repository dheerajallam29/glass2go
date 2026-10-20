# Turning on Google sign-in

The sign-in code is already in the site. It stays hidden on the live site until you add two keys. You do this once, and it is free.

1. **Create a Supabase project** at https://supabase.com (free plan). Pick any name and region.
2. **Create the table.** In the project open *SQL Editor*, paste everything in `supabase/schema.sql`, and run it. Each student can only read and write their own row.
3. **Create Google credentials.** In https://console.cloud.google.com open *APIs & Services > Credentials > Create credentials > OAuth client ID* (type: Web application). Under *Authorized redirect URIs* add the callback URL Supabase shows you in *Authentication > Providers > Google* (it looks like `https://<project>.supabase.co/auth/v1/callback`).
4. **Enable the provider.** In Supabase open *Authentication > Providers > Google*, switch it on, and paste the Google client ID and secret.
5. **Allow your site addresses.** In *Authentication > URL Configuration* set the Site URL to your main address and add every address you use under *Redirect URLs* (for example `http://localhost:3000/**`, `https://dheerajallam29.github.io/glass2go/**` and your Vercel address with `/**`).
6. **Add the two keys.** In *Project Settings > API* copy the Project URL and the `anon` public key.
   - Local: copy `web/.env.example` to `web/.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Vercel: add the same two variables under *Settings > Environment Variables*, then redeploy.
   - GitHub Pages: add them as repository variables or secrets and pass them to the Pages build step as environment variables.

After that a **Sign in** button appears in the header. Signing in merges the progress on that device with the cloud copy (nothing is lost on either side) and then saves every answer to the account.

Never put the `service_role` key anywhere in this project.
