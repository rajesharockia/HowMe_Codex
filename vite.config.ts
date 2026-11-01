import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import generateFuture from './api/generate-future';
import generatePet from './api/generate-pet';

function localFutureApi(): Plugin {
  return {
    name: 'mirror-local-future-api',
    configureServer(server) {
      const route = (handler: typeof generateFuture) => (request: any, response: any) => {
        let rawBody = '';
        request.on('data', (chunk: string) => { rawBody += chunk; });
        request.on('end', async () => {
          try {
            (request as typeof request & { body?: unknown }).body = JSON.parse(rawBody || '{}');
            const apiResponse = response as typeof response & {
              status: (code: number) => typeof response;
              json: (payload: unknown) => void;
            };
            apiResponse.status = (code: number) => { response.statusCode = code; return response; };
            apiResponse.json = (payload: unknown) => {
              response.setHeader('Content-Type', 'application/json');
              response.end(JSON.stringify(payload));
            };
            await handler(request, apiResponse);
          } catch {
            response.statusCode = 400;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({ error: 'Invalid request body.' }));
          }
        });
      };
      server.middlewares.use('/api/generate-future', route(generateFuture));
      server.middlewares.use('/api/generate-pet', route(generatePet));
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (env.OPENAI_API_KEY) process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
  return { plugins: [react(), localFutureApi()] };
});
