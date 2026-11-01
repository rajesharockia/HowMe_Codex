const assumptions = {
    'Active path': 'consistent movement, restorative sleep, balanced meals, upright open posture, fresh grooming, bright natural-light styling, and an alert relaxed expression',
    'Intense training path': 'a sustained gym and running routine, planned nutrition, good recovery, an athletic conditioned full-body presentation, fitted training clothing, and an authentic gym or running environment',
    'Your current path': 'a plausible continuation of the person’s stated current routine, ordinary natural ageing, neutral posture, and familiar everyday styling',
    'Less active path': 'less regular movement and more variable recovery routines, represented through a softer midsection, more relaxed posture, and looser everyday clothing; do not portray illness or health decline',
    'High-risk path': 'a fictional prolonged high-risk routine involving smoking, frequent drinking, junk food, poor sleep, and little movement, represented only with a visibly softer full-body shape, slouched posture, rumpled casual clothing, and a tired everyday context; never portray illness or a diagnosis'
};
function dataUrlParts(value) {
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value);
    if (!match)
        return null;
    return { mimeType: match[1], data: match[2] };
}
function promptFor(input) {
    const targetAge = input.currentAge + input.yearsAhead;
    const ageDirection = input.yearsAhead >= 15
        ? `The subject must visibly and credibly read as approximately ${targetAge}, not their original age. Show clear age-appropriate maturity across roughly ${input.yearsAhead} years: natural facial contour changes, visible but realistic fine lines around the eyes and forehead, mature skin texture, and age-appropriate hair changes only where plausible for this individual.`
        : input.yearsAhead >= 8
            ? `The subject must visibly read as approximately ${targetAge}, with noticeable but natural age progression: modest facial maturity, fine lines, and realistic skin and hair texture changes.`
            : `The subject must read as approximately ${targetAge}, with gentle but visible natural age progression.`;
    return `Create a photorealistic, full-body photograph of the same consenting adult in the supplied identity reference at approximately age ${targetAge}. This is an illustrative future-self simulation, not a prediction. Preserve identity: facial structure, skin tone, ethnicity, eye shape, recognisable features, and general hairstyle. ${ageDirection} Show the whole person from head to shoes in a believable real-world setting chosen for the scenario. Use natural, documentary-quality photography with realistic light, materials, proportions, and skin texture. Avoid colour grading, abstract backgrounds, illustration, silhouettes, cinematic effects, text, watermarks, logos, or extra people. For this hackathon demo, make the scenario distinction visibly clear through realistic body proportions, posture, clothing fit, expression, grooming, and setting. Apply this non-medical scenario direction prominently: ${assumptions[input.scenario]}. These are visual storytelling choices, not a claim that any habit guarantees a body shape or health outcome. Never portray illness, distress, injury, or a health diagnosis. Do not change ethnicity or gender presentation. User lifestyle context for tone only: ${input.lifestyleSummary.slice(0, 700)}.`;
}
export default async function handler(req, res) {
    if (req.method !== 'POST')
        return res.status(405).json({ error: 'Method not allowed.' });
    const { originalImage, currentAge, yearsAhead, scenario, lifestyleSummary } = req.body ?? {};
    const reference = typeof originalImage === 'string' ? dataUrlParts(originalImage) : null;
    if (!reference || reference.data.length > 11_000_000)
        return res.status(400).json({ error: 'A JPG, PNG, or WebP identity reference under 8 MB is required.' });
    if (!Number.isInteger(currentAge) || currentAge < 18 || currentAge > 100 || !Number.isInteger(yearsAhead) || yearsAhead < 1 || currentAge + yearsAhead > 100)
        return res.status(400).json({ error: 'Use an adult future age no greater than 100.' });
    if (!(scenario in assumptions) || typeof lifestyleSummary !== 'string')
        return res.status(400).json({ error: 'The scenario details are invalid.' });
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey)
        return res.status(503).json({ error: 'Image generation is not configured. Add OPENAI_API_KEY to the server environment to enable simulations.' });
    try {
        const form = new FormData();
        form.append('model', 'gpt-image-2.5-sunburst');
        form.append('prompt', promptFor({ currentAge, yearsAhead, scenario, lifestyleSummary }));
        form.append('size', '1024x1536');
        form.append('quality', 'high');
        form.append('output_format', 'png');
        form.append('n', '1');
        form.append('image[]', new Blob([Buffer.from(reference.data, 'base64')], { type: reference.mimeType }), 'identity-reference.png');
        const upstream = await fetch('https://api.openai.com/v1/images/edits', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
            body: form
        });
        const result = await upstream.json();
        if (!upstream.ok)
            return res.status(upstream.status).json({ error: result?.error?.message || 'The image provider could not create this simulation.' });
        const image = result?.data?.[0]?.b64_json;
        if (!image)
            return res.status(502).json({ error: 'The image provider returned no usable image.' });
        return res.status(200).json({ image: `data:image/png;base64,${image}`, disclaimer: 'Illustrative simulation — not a prediction.' });
    }
    catch (error) {
        const networkCause = error && typeof error === 'object' && 'cause' in error
            ? error.cause
            : undefined;
        const detail = error instanceof Error ? error.message : 'Unknown network error';
        const networkCode = networkCause?.code ? ` (${networkCause.code})` : '';
        console.error('HowMe OpenAI image request failed:', detail);
        return res.status(502).json({ error: `Could not reach OpenAI Image API: ${detail}${networkCode}. Check this computer's DNS, firewall, or proxy settings.` });
    }
}
