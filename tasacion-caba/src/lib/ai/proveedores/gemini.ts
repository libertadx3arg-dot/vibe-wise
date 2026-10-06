// Proveedor Gemini (Google AI Studio). AI_MODEL lo elegís vos en tu cuenta.
import type { ProveedorIA } from '../tipos.ts';

export function gemini(apiKey: string, modelo: string, f: typeof fetch = fetch): ProveedorIA {
  return {
    async generar(prompt, señal) {
      const r = await f(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, {
        method: 'POST', signal: señal,
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });
      if (!r.ok) throw new Error(`Gemini respondió ${r.status}`);
      const j: any = await r.json();
      const t = j?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('');
      if (!t) throw new Error('Gemini devolvió una respuesta vacía');
      return t;
    },
  };
}
