Supabase Storage — avatars bucket setup

Goal
- Create a public `avatars` bucket in Supabase storage so `uploadAvatar()` can store profile photos and `getPublicUrl()` returns a usable URL.

Steps (Dashboard - recommended)
1. Open your Supabase project dashboard.
2. Go to `Storage` → `Buckets` → `New bucket`.
3. Name the bucket: `avatars`
4. Set: Public (check "Enable public access") so files have public URLs.
5. Create the bucket.

Notes for security
- Public buckets make files accessible by anyone with the URL. This is OK for profile photos. If you need private files, use signed URLs from a server using the service_role key.
- Do NOT commit your service_role key to the repo.

Optional: create bucket with Supabase CLI (requires `supabase` CLI and project configured)

```bash
# Install supabase CLI (if needed)
# https://supabase.com/docs/guides/cli
# Create public bucket named avatars
supabase storage bucket create avatars --public
```

How to test locally (after bucket exists)
1. Ensure `.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set (already used in `src/services/supabaseClient.ts`).
2. Start dev server:

```bash
npm run dev
```

3. Open the app, sign in, open your Profile, click "Edit Profile", choose an image file and Save.
4. After save, check the donor row in Supabase SQL editor:

```sql
SELECT id, auth_user_id, name, avatar
FROM donors
WHERE auth_user_id = '<your-auth-uid-here>'
ORDER BY created_at DESC
LIMIT 1;
```

You should see `avatar` column populated with a public URL like `https://<project>.supabase.co/storage/v1/object/public/avatars/...`

If you see upload errors
- Confirm the bucket name matches `avatars`.
- Confirm the bucket is public (Dashboard Storage settings).
- Check browser console network tab for request errors.
- If CORS issues appear, they are usually resolved by creating the bucket via Dashboard; Supabase Storage supports cross-origin uploads.

If you want private avatars (recommended for sensitive data)
- Create bucket as private.
- Instead of `getPublicUrl`, use `createSignedUrl` server-side with service_role key and return signed URL to client when needed.

I'll proceed to add a minimal README entry to `README.md` if you want, and/or implement health-metrics fields next. Which should I do next?