<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Mundo de Kaboo

A React-based educational platform for managing and viewing collections of books, audio, and video content.

## Run Locally

**Prerequisites:** Node.js 18+ and npm

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file in the root directory:
   ```bash
   cp .env.example .env.local
   ```

3. Set your environment variables in `.env.local`:
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous/public key
   - `GEMINI_API_KEY`: (Optional) Your Gemini API key if using AI features

   Get your Supabase credentials from: https://supabase.com/dashboard/project/_/settings/api

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

## Deploy to Vercel

### Option 1: Deploy via Vercel Dashboard

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Add New Project"
4. Import your repository
5. Configure environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY` (optional)
6. Click "Deploy"

### Option 2: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Set environment variables:
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   vercel env add GEMINI_API_KEY
   ```

5. Redeploy with environment variables:
   ```bash
   vercel --prod
   ```

### Important Notes for Production

- ✅ Environment variables are configured via Vercel dashboard
- ✅ Build output directory is `dist` (configured in `vercel.json`)
- ✅ All routes are handled by React Router (SPA routing configured)
- ✅ Static assets are cached for optimal performance
- ⚠️ Make sure your Supabase RLS policies are properly configured
- ⚠️ Ensure your Supabase Storage bucket is set up and public
- ⚠️ Test authentication flows before going live

## Project Structure

- `/screens` - Main application screens
- `/components` - Reusable React components
- `/lib` - Utilities, API clients, and helpers
- `/hooks` - Custom React hooks
- `/assets` - Static assets (images, etc.)

## Technologies

- React 19
- TypeScript
- Vite
- Supabase (Backend & Auth)
- Tailwind CSS
- React PDF
