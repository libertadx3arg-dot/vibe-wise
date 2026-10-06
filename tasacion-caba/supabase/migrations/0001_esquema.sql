-- Esquema base. TODO (Sonnet): completar políticas RLS y probarlas (Fase 7).
-- Regla de oro: un desarrollador NUNCA puede leer `propietarios` ni otros `desarrolladores`.

create table barrios (
  nombre text primary key,
  incidencia_usd numeric,          -- USD por m² construible. null = PENDIENTE
  factor_edificabilidad numeric,   -- m² construibles por m² de terreno. null = PENDIENTE
  actualizado_en timestamptz default now()
);

create table propietarios (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz default now(),
  nombre text not null, whatsapp text not null, email text not null,
  consentimiento boolean not null check (consentimiento),
  direccion text not null, barrio text references barrios(nombre), smp text,
  tipo text, sup_terreno numeric, sup_construida numeric, protegido text,
  estado_inmueble text, mas_duenos text, sucesion text, plazo text,
  resultado jsonb,                 -- salida de calcularValuacion()
  informe text,                    -- caché del informe (IA o plantilla)
  estado text default 'nuevo' check (estado in ('nuevo','contactado','en_proceso','descartado')),
  notas text
);

create table desarrolladores (
  id uuid primary key references auth.users(id),
  nombre text, empresa text, email text, whatsapp text, cuit text,
  barrios text[], m2_terreno_min numeric, m2_terreno_max numeric,
  m2_construibles_buscados numeric, presupuesto_usd numeric, tipo_proyecto text,
  estado text default 'pendiente' check (estado in ('pendiente','aprobado','rechazado'))
);

-- Vista anónima: lo único que ve un desarrollador. Sin dirección ni datos del dueño.
create table oportunidades (
  id uuid primary key default gen_random_uuid(),
  propietario_id uuid references propietarios(id),
  barrio text, m2_terreno numeric, m2_construibles numeric,
  min_usd numeric, max_usd numeric,
  publicada boolean default false, ok_del_dueno boolean default false
);

create table intereses (
  oportunidad_id uuid references oportunidades(id),
  desarrollador_id uuid references desarrolladores(id),
  creado_en timestamptz default now(),
  primary key (oportunidad_id, desarrollador_id)
);

alter table barrios enable row level security;
alter table propietarios enable row level security;
alter table desarrolladores enable row level security;
alter table oportunidades enable row level security;
alter table intereses enable row level security;
-- TODO: políticas. Sugerido: catálogo vía vista/función que no expone propietario_id.
