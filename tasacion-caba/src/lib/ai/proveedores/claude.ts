// Proveedor Claude (Anthropic).
import type { ProveedorIA } from '../tipos.ts';

export function claude(apiKey: string, modelo: string, f: typeof fetch = fetch): ProveedorIA {
  return {
    async generar(prompt, señal) {
      const r = await f('https://api.anthropic.com/v1/messages', {
        method: 'POST', signal: señal,
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: modelo, max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }),
      });
      if (!r.ok) throw new Error(`Claude respondió ${r.status}`);
      const j: any = await r.json();
      const t = j?.content?.map((c: any) => c.text ?? '').join('');
      if (!t) throw new Error('Claude devolvió una respuesta vacía');
      return t;
    },
  };
}
