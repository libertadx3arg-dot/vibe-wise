// Base de datos falsa en memoria, SOLO para tests. Imita lo mínimo de supabase-js que usamos.
export function crearFalsoDb(inicial: Record<string, any[]> = {}) {
  const tablas: Record<string, any[]> = Object.fromEntries(Object.entries(inicial).map(([k, v]) => [k, v.map((r) => ({ ...r }))]));
  const log = { selects: [] as { tabla: string; cols: string }[] };
  let seq = 0;
  const from = (t: string) => {
    const filas = (tablas[t] ??= []);
    let op = 'select', cols = '*', payload: any, uno: false | 'maybe' | 'single' = false, lim = Infinity;
    const filtros: ((r: any) => boolean)[] = [];
    const coinciden = () => filas.filter((r) => filtros.every((f) => f(r)));
    const proyectar = (r: any) => (cols === '*' ? { ...r } : Object.fromEntries(cols.split(',').map((c) => c.trim()).map((c) => [c, r[c]])));
    const ejecutar = () => {
      if (op === 'select') {
        const rows = coinciden().slice(0, lim).map(proyectar);
        if (uno) return { data: rows[0] ?? null, error: uno === 'single' && !rows.length ? { message: 'no rows' } : null };
        return { data: rows, error: null };
      }
      if (op === 'insert' || op === 'upsert') {
        const out: any[] = [];
        for (const p of Array.isArray(payload) ? payload : [payload]) {
          const pk = t === 'intereses' ? ['oportunidad_id', 'desarrollador_id'] : t === 'barrios' ? ['nombre'] : t === 'informes_cache' ? ['hash'] : ['id'];
          const existente = filas.find((r) => pk.every((k) => p[k] !== undefined && r[k] === p[k]));
          const dupEmail = t === 'desarrolladores' && filas.some((r) => r.email === p.email);
          if ((existente || dupEmail) && op === 'insert') return { data: null, error: { code: '23505', message: 'duplicate' } };
          if (existente) Object.assign(existente, p); else filas.push({ id: pk[0] === 'id' ? `id${++seq}` : undefined, ...p });
          out.push(p);
        }
        return { data: out, error: null };
      }
      if (op === 'update') { const m = coinciden(); m.forEach((r) => Object.assign(r, payload)); return { data: m, error: null }; }
      if (op === 'delete') { const m = coinciden(); m.forEach((r) => filas.splice(filas.indexOf(r), 1)); return { data: m, error: null }; }
      return { data: null, error: null };
    };
    const b: any = {
      select(c = '*') { cols = c; if (op === 'select') log.selects.push({ tabla: t, cols: c }); return b; },
      eq(c: string, v: any) { filtros.push((r) => r[c] === v); return b; },
      ilike(c: string, v: string) { filtros.push((r) => String(r[c]).toLowerCase() === v.toLowerCase()); return b; },
      in(c: string, vs: any[]) { filtros.push((r) => vs.includes(r[c])); return b; },
      order() { return b; }, limit(n: number) { lim = n; return b; },
      insert(p: any) { op = 'insert'; payload = p; return b; }, update(p: any) { op = 'update'; payload = p; return b; },
      upsert(p: any) { op = 'upsert'; payload = p; return b; }, delete() { op = 'delete'; return b; },
      maybeSingle() { uno = 'maybe'; return b; }, single() { uno = 'single'; return b; },
      then(res: any, rej: any) { return Promise.resolve(ejecutar()).then(res, rej); },
    };
    return b;
  };
  return { from, tablas, log };
}
