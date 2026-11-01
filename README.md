# HowMe

HowMe is a local demo of a future-self simulator: a way to explore how you might look across possible future ages and routines. It collects a display name, age, a local photo preview and lifestyle context, then presents explicitly hypothetical paths. The uploaded photograph remains in the browser object URL and is never uploaded by this prototype.

## Run locally

```powershell
npm install
npm run dev
```

## Architecture and integration plan

The client is a Vite + React + TypeScript single-page prototype. State remains in-memory for the demo. In production, route photo uploads through a server endpoint to private Supabase Storage, store profiles and scenarios behind row-level security, and call AI providers only on the server.

Keep two providers behind server interfaces:

- `ScenarioEngine`: receives structured habits and a horizon, returns validated scenario assumptions, presentation copy and safe wellness suggestions.
- `PersonaImageProvider`: receives the original consented reference image and a scenario prompt, returning a generated image. Always use the original reference rather than an earlier generated future image.

Set provider credentials only in server environment variables. No image-generation provider is configured in this demo, so the app labels the visual exploration as a demo simulation and uses the local photo preview consistently across paths.

## Image simulation pipeline

`api/generate-future.ts` implements an OpenAI Image API provider endpoint. It uses `gpt-image-2.5-sunburst` with a portrait and a tightly scoped age-and-scenario prompt. The original upload is passed with every request; generated output is never used as a source for a later age or scenario. Results are cached in browser memory per `scenario + horizon` only after a successful response.

The endpoint validates input type, size at upload, adult age (18–100), horizon, scenario, and an image data URL. It returns a usable image only on success and otherwise provides a recoverable error. Add `OPENAI_API_KEY` to the server environment from [`.env.example`](.env.example); it must never be a `VITE_` variable.

The `api/` endpoint follows the Vercel serverless-function convention. The Vite configuration also bridges this endpoint locally, so `npm run dev` reads `OPENAI_API_KEY` from `.env.local` without exposing it to the browser. Deploy to Vercel or another host that maps `/api/generate-future` to this server handler for production.

For a local presentation without a provider, set `VITE_DEMO_MODE=true`. The app visibly marks the experience as **DEMO MODE** and retains the identity reference instead of falsely presenting an AI result. Live provider requests show a blocking generation state and time out after 45 seconds with a retryable message.

Why GPT Image 2.5 Sunburst: OpenAI positions it for workflows where editing precision matters most. The Image API accepts base64 data-URL reference images and can return the edited image as base64, which makes it a practical fit for independent identity-preserving scenario renders. GPT Image 2.5 Flare is the faster option if generation latency becomes the primary concern. See the official [OpenAI image generation guide](https://developers.openai.com/api/docs/guides/image-generation).

Identity preservation is probabilistic, so the product must describe outputs as simulations rather than predictions. The client and API intentionally avoid clinical framing, medical assessment, diagnoses, or claims that a generated visual forecasts a user’s health or appearance.

## Hackathon delivery sequence

1. This prototype: onboarding, local persona, scenario selection and companion chat.
2. Add authentication, private storage and a profile schema.
3. Add structured scenario generation, server-side validation and provider-backed image generation.
4. Persist the conversation and profile changes with explicit consent.

## Key risks

- Image identity preservation varies by provider and must be evaluated with user consent.
- Lifestyle context is sensitive. Avoid clinical claims, diagnoses or predictive health language.
- Generated futures are illustrative scenarios, never forecasts.
