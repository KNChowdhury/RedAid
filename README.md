

# LifelineBD

সংক্ষিপ্ত বর্ণনা (বাংলা):

LifelineBD একটি ছোট React + TypeScript অ্যাপ যা Supabase ব্যবহার করে ব্যবহারকারী authentication এবং ডেটা ফেচ করে — রক্তদাতা/রিসিভারের নেটওয়ার্ক প্রদর্শন করে এবং জরুরী অনুরোধ/নোটিফিকেশন পরিচালনা করে।

Brief description (English):

LifelineBD is a Vite + React + TypeScript frontend that integrates with Supabase for authentication, realtime data access, and storage. It provides features for donors, hospitals, and emergency requests.

## Quick Start

Prerequisites:

- Node.js 16+ (or compatible)
- A Supabase project with anon key and URL

Install dependencies:

```bash
npm install
```

Environment:

Create a `.env.local` in the project root with:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Run in development:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Notes:

- Ensure your Supabase project's authentication settings (redirect URLs, email templates) are configured if you use magic links or password reset emails.
- The app reads initial mock data from `src/mockData.ts` if no Supabase data is available.

Contributing:

- Create a branch, make changes, and open a PR.

License: MIT

