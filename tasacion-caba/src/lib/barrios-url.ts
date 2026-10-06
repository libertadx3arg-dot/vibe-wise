// "Villa del Parque" → "villa-del-parque" (para las direcciones de las páginas por barrio).
export const slugBarrio = (n: string) => n.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
