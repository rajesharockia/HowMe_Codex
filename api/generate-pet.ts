function dataUrlParts(value: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value);
  return match ? { mimeType: match[1], data: match[2] } : null;
}

const petPrompt = `Use the supplied image as the sole likeness reference. Create a realistic premium 3D digital companion of this same consenting adult: friendly, intelligent, warm and approachable. Preserve recognisable facial structure, skin tone, ethnicity, hair, body proportions, and age from the reference. Show a polished full-body character in a relaxed, welcoming standing pose, with contemporary understated clothing and subtle future-tech detail. The character must feel like an authentic personal companion, not a mascot or cartoon. Studio-quality 3D render, soft natural key light, neutral deep-indigo background, whole figure visible from head to shoes, no text, no watermark, no logo, no extra people, no uncanny expression. This is a creative character asset, not a prediction.`;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const reference = typeof req.body?.originalImage === 'string' ? dataUrlParts(req.body.originalImage) : null;
  // Future simulations can be larger PNGs than the original photo upload.
  if (!reference || reference.data.length > 28_000_000) return res.status(400).json({ error: 'A JPG, PNG, or WebP source image under 20 MB is required.' });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Image generation is not configured. Add OPENAI_API_KEY to the server environment.' });
  try {
    const form = new FormData();
    form.append('model', 'gpt-image-2.5-sunburst');
    form.append('prompt', petPrompt);
    form.append('size', '1024x1536');
    form.append('quality', 'high');
    form.append('output_format', 'png');
    form.append('n', '1');
    form.append('image[]', new Blob([Buffer.from(reference.data, 'base64')], { type: reference.mimeType }), 'howme-current-image.png');
    const upstream = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form });
    const result: any = await upstream.json();
    if (!upstream.ok) return res.status(upstream.status).json({ error: result?.error?.message || 'The image provider could not create this pet.' });
    const image = result?.data?.[0]?.b64_json;
    if (!image) return res.status(502).json({ error: 'The image provider returned no usable pet image.' });
    return res.status(200).json({ image: `data:image/png;base64,${image}` });
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown network error';
    console.error('HowMe pet request failed:', detail);
    return res.status(502).json({ error: `Could not reach OpenAI Image API: ${detail}. Check this computer's DNS, firewall, or proxy settings.` });
  }
}
