export type FutureScenario = 'Active path' | 'Your current path' | 'Less active path' | 'Intense training path' | 'High-risk path';

type FutureSimulationRequest = {
  originalImage: string;
  currentAge: number;
  yearsAhead: number;
  scenario: FutureScenario;
  lifestyleSummary: string;
};

export async function requestFutureSimulation(input: FutureSimulationRequest): Promise<string> {
  return requestImage('/api/generate-future', input, 'Generation took too long. Please try again.');
}

export async function requestDigitalPet(originalImage: string): Promise<string> {
  return requestImage(
    '/api/generate-pet',
    { originalImage },
    'Pet creation took too long. Please try again.',
  );
}

async function requestImage(path: string, input: object, timeoutMessage: string): Promise<string> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 45_000);
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: controller.signal
    });
  } catch (error) {
    if (import.meta.env.VITE_DEMO_MODE === 'true' && 'originalImage' in input && typeof input.originalImage === 'string') return input.originalImage;
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error(timeoutMessage);
    throw new Error('The image service is unavailable. Please try again.');
  } finally {
    window.clearTimeout(timeout);
  }
  const payload = await response.json().catch(() => null) as { image?: string; error?: string } | null;
  if ((!response.ok || !payload?.image) && import.meta.env.VITE_DEMO_MODE === 'true') {
    // Explicitly labeled UI fallback for local hackathon demos; never used in a configured deployment.
    return 'originalImage' in input && typeof input.originalImage === 'string' ? input.originalImage : '';
  }
  if (!response.ok || !payload?.image) {
    throw new Error(payload?.error || 'The image service is unavailable. Try again in a moment.');
  }
  return payload.image;
}
