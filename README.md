# Imamtech — Real Device-Linking Build (MVP)

This ZIP upgrades the original UI prototype into a **backend-ready, permission-based device-linking MVP**.

## What is now real
- Main Device account uses secure email magic-link authentication when Supabase is configured.
- Main Device can create a **one-time, 15-minute invite URL**.
- The invite URL contains no manual device code. The receiving device opens it and explicitly chooses to join.
- The joined device is stored in the Main Device's `Devices` dashboard.
- Device status is prepared for realtime updates.
- Contacts and file metadata are stored per Imamtech account.
- File uploads are prepared for Supabase Storage.
- The UI remains English and keeps the Imamtech branding and supplied photos.

## Important limitation
A normal website cannot silently read another Android phone's call history, SMS, microphone, camera, or all local files. Android requires explicit permissions and, for call-history access, a companion Android app. This build does **not** bypass those permissions.

## Setup for real cloud sync
1. Create a Supabase project.
2. Open Supabase SQL Editor and run `supabase-schema.sql`.
3. Create a Storage bucket named `imamtech-files` (private is recommended).
4. Copy `config.example.js` to `config.js` and enter the project's URL and **anon/publishable** key. Never use a service-role key in browser code.
5. Deploy the folder to Netlify, GitHub Pages (static parts), or another HTTPS host.
6. Open the deployed site on the Main Device and sign in with the intended email.
7. Use **Devices → Create Share Link**, send the link to another phone, open it, and confirm joining.

## Next Android stage
For the feature where numbers/call history from a phone appear automatically in the Main Device, build a companion Android app with explicit `READ_CALL_LOG` permission and a secure authenticated API. The web dashboard can then display only the data that the user has authorized.
