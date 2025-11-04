Supabase / OAuth setup (important for auth to work)

This project uses Supabase for authentication. To avoid redirect_uri_mismatch and other OAuth problems when using Google sign-in, follow these steps:

- In your `.env` or hosting platform (Vercel / Render) set these environment variables:
  - `VITE_SUPABASE_URL` - your Supabase project URL
  - `VITE_SUPABASE_ANON_KEY` - your Supabase anon/public key
  - (optional) `VITE_APP_URL` - your deployed app origin (e.g. `https://my-app.vercel.app`). If set, the app may use it for email redirects.

- In the Supabase dashboard: Authentication -> Providers -> Google
  - Add the exact redirect URI(s) for your app (for example `http://localhost:5173` for local dev, and your production origin). The redirect URI must match the app origin used by the OAuth flow. If you don't pass a custom redirectTo value from the client, Supabase's configured redirect will be used.

- In the Google Cloud Console where you configured OAuth credentials, ensure the Authorized redirect URIs include the same URIs you added in Supabase.

If you see `redirect_uri_mismatch` errors, it means the redirect the client requests does not match the redirect URIs configured in Google/Supabase. The safe fix is to configure the exact origin(s) in the provider settings and avoid passing custom redirectTo values unless you control the registered URI.

Deployment note: For Vercel/Render, add the Vite env vars in the project settings and redeploy. For local development, run `npm run dev` and use `http://localhost:5173` as an allowed redirect in Supabase/Google.
