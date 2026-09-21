# Morfynx

A beginner-friendly JavaScript / React / Next.js media studio.

**Live Here -> ** https://morfynx.vercel.app/

## Start here — no accounts needed

Install Node.js 22 LTS or newer from https://nodejs.org. Open this folder in your editor and run:

```bash
npm install
npm run dev
```

Open http://localhost:3000. Try the sample illustration, select Story, and download the JPEG. Next, upload your own image. Open Media library to find it again.

No `.env.local` is needed for demo mode. Images are center-cropped inside your browser using Canvas. Demo files stay in memory and disappear on refresh. Videos can be previewed and downloaded unchanged. **The demo does not perform AI cropping or video compression.**

## What works in live mode

- Clerk sign-in and server-side authentication checks.
- Image and video uploads to Cloudinary (4 MB maximum per file).
- Cloudinary automatic content-aware cropping (`g_auto`) into four social formats.
- Automatic video quality adjustment and MP4 output. Compression savings depend on the input; files can grow.
- Neon PostgreSQL history, scoped to the signed-in user.
- JPEG / video downloads, validation, error messages, and responsive layout.
- A basic 25-upload daily check per account. This is not an atomic quota or a complete abuse-prevention system.

The AI capability is Cloudinary’s crop selection, not an AI model trained by this project. The bundled sample illustration always uses a local centered crop; upload your own image in live mode to use AI cropping.

## Connect your accounts

Create projects in [Clerk](https://dashboard.clerk.com), [Cloudinary](https://console.cloudinary.com), and [Neon](https://console.neon.tech). Review their current usage limits before uploading. Do not paste secrets into chat or commit them to GitHub.

1. Copy `.env.example` to `.env.local` in this folder.
2. In Clerk, create an application with email sign-in enabled. Copy its publishable and secret keys into the matching variables. Use development keys for local work. The `/sign-in` screen uses Clerk’s hosted sign-up link for registration.
3. In Cloudinary, copy the cloud name, API key, and API secret into the matching variables. No unsigned upload preset is needed; the backend uploads with the SDK.
4. In Neon, create a project and copy its PostgreSQL connection string, including its SSL parameters, into `DATABASE_URL`.
5. Open Neon's SQL Editor and run the contents of `schema.sql` once. This creates the media table and its index.
6. Stop the development server with Ctrl+C and run `npm run dev` again. When all six values exist, the badge changes to LIVE MODE.
7. Sign in, upload a small image, select Story, and download it. Upload a short MP4, then refresh the library to verify persistence.
8. Test with another account: it should see only its own uploads.

If setup is incomplete, the app stays in demo mode and live API calls return 503. If keys exist but are invalid, fix the credentials in `.env.local`. Live mode is configuration detection, not a connectivity test. Check terminal errors for database/schema issues.

## How the project fits together

Browser → Next.js API → Clerk authentication → Cloudinary upload → Neon metadata.

| File                      | What to learn                                                  |
| ------------------------- | -------------------------------------------------------------- |
| `app/studio.js`           | React components, state, events, file input, fetch, and Canvas |
| `app/globals.css`         | CSS grid, responsive layout, and reusable visual styles        |
| `app/page.js`             | A server component passes configuration to the browser UI      |
| `app/api/upload/route.js` | Authenticate, validate, upload, then save metadata             |
| `app/api/media/route.js`  | Query only the signed-in user's records                        |
| `lib/server.js`           | Server-only service clients and error handling                 |
| `lib/media.js`            | Shared validation, format presets, and crop math               |
| `proxy.js`                | Clerk request integration, bypassed when Clerk is unconfigured |
| `schema.sql`              | The database table and user lookup index                       |

HTML knowledge transfers to JSX (HTML-like markup in JavaScript). React `useState` stores values that change the screen. `useEffect` runs work such as loading a preview. An API route runs on the server, where secrets remain private. PostgreSQL stores metadata; Cloudinary stores media bytes. This version uses SQL directly instead of Prisma to reduce initial setup.

## Reference documentation

- https://nextjs.org/docs/app
- https://clerk.com/docs/reference/nextjs/clerk-middleware
- https://cloudinary.com/documentation/image_automatic_gravity
- https://cloudinary.com/documentation/node_image_and_video_upload
- https://neon.com/docs/serverless/serverless-driver
