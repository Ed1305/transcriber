# Transcriber

React/Vite frontend with an Express API powered by Gemini.

## Local development

```sh
npm ci
cp .env.example .env
# Set GEMINI_API_KEY in .env (never commit it).
npm run dev
```

`npm run lint` checks TypeScript. `npm run build` builds the frontend.
For a standalone production server, build first, then run `NODE_ENV=production npm start`.
Docker remains supported through the existing Dockerfile and Compose configuration.

## Vercel

`vercel.json` builds the frontend into `dist` and routes `/api/*` to the
Express app exported by `api/index.ts`. `server.ts` is only the standalone
local/Docker entry point; it is not started by Vercel.

In the Vercel project settings:

1. Set `GEMINI_API_KEY` as a sensitive environment variable for Production
   (and Preview if needed). Do not put it in a `VITE_*` variable or client code.
2. Redeploy after changing environment variables.
3. To share without requiring Vercel login, review **Deployment Protection**
   and disable Vercel Authentication for the production deployment if enabled.

Without the API key, the sample transcript/demo is available, but real
transcription and transcript Q&A are not functional.

### Limitations before wider use

- Vercel Functions have a roughly 4.5 MB request-body limit. Base64 adds about
  one-third to file size, so direct uploads should stay below roughly 3 MB.
  Larger files need an object-storage/direct-upload workflow; increasing the
  Express body-parser limit cannot bypass Vercel's limit.
- The API currently has no application authentication or usage controls.
  Public access with a configured Gemini key can incur API usage costs.
- URL imports still require SSRF protection, bounded downloads, and server-side
  timeouts before enabling them for untrusted users.
- Transcript history is browser-local; original recordings are not persisted.
- Live Gemini model availability and output must be verified with a real key.
