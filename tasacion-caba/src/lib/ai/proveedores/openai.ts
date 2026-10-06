// Proveedor OpenAI.
import type { ProveedorIA } from '../tipos.ts';

export function openai(apiKey: string, modelo: string, f: typeof fetch = fetch): ProveedorIA {
  return {
    async generar(prompt, señal) {
      const r = await f('https://api.openai.com/v1/chat/completions', {
        method: 'POST', signal: señal,
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: modelo, messages: [{ role: 'user', content: prompt }] }),
      });
      if (!r.ok) throw new Error(`OpenAI respondió ${r.status}`);
      const j: any = await r.json();
      const t = j?.choices?.[0]?.message?.content;
      if (!t) throw new Error('OpenAI devolvió una respuesta vacía');
      return t;
    },
  };
}
