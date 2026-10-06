// Validaciones compartidas. Todo lo que llega del navegador se valida de nuevo en el servidor.
export const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
export const numero = (v: unknown, max = 1_000_000_000): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) && n >= 0 && n <= max ? n : null;
};
export const emailValido = (e: string) => /^\S+@\S+\.\S+$/.test(e) && e.length <= 150;
