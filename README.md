This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
bun run dev
# or
yarn dev
# or
pnpm dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment Variables

Create a `.env.local` file in the root directory and add the following variables:

# Supabase

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key # Optional, for server-side admin actions

# Database (Prisma)

DATABASE_URL="postgresql://..." # From Supabase connection string (Pooler recommended)
DIRECT_URL="postgresql://..." # From Supabase connection string (Direct connection for migrations)

# Google Cloud

GCP_PROJECT_ID="your-gcp-project-id"

# Path to the downloaded service account key JSON file

GOOGLE_APPLICATION_CREDENTIALS="./keys/your-service-account-key.json"

# GCS Bucket for storing TTS audio files

GCS_BUCKET_NAME="your-gcs-bucket-name"

# Vertex AI Gemini API (Required for Explanation/Translation)

VERTEX_AI_REGION="us-central1" # Region where model is available (e.g., us-central1)
VERTEX_AI_MODEL_NAME="gemini-2.0-flash-001" # Model confirmed to work

# Google Cloud Text-to-Speech (Required for TTS)

# Used by frontend onClick (must start with NEXT*PUBLIC*) OR backend default

NEXT_PUBLIC_TTS_LANGUAGE_CODE_EN="en-US" # Or just TTS_LANGUAGE_CODE_EN if only used backend
NEXT_PUBLIC_TTS_VOICE_NAME_EN="en-US-Chirp3-HD-Leda" # Or just TTS_VOICE_NAME_EN
NEXT_PUBLIC_TTS_LANGUAGE_CODE_JA="ja-JP" # Or just TTS_LANGUAGE_CODE_JA
NEXT_PUBLIC_TTS_VOICE_NAME_JA="ja-JP-Wavenet-B" # Or just TTS_VOICE_NAME_JA

# Other variables (optional)

# e.g., NEXTAUTH_URL, NEXTAUTH_SECRET if using NextAuth

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
