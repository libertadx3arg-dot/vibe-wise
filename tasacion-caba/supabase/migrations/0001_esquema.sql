-- Esquema de Plano Base.
--
-- MODELO DE SEGURIDAD (importante):
--  * Todas las tablas tienen RLS activado y NINGUNA política. Eso significa que la clave pública (anon)
--    y cualquier usuario logueado NO pueden leer ni escribir nada directamente.
--  * Solo el servidor de la web (con la clave de servicio, que nunca llega al navegador) toca la base,
--    y filtra qué columnas devuelve a cada tipo de usuario.
--  * El catálogo de desarrolladores se arma en el servidor con columnas anónimas fijas
--    (barrio, m², rango). Nunca incluye propietario_id, dirección ni datos del dueño.

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
  informe text,                    -- informe mostrado al usuario (IA o plantilla)
  estado text default 'nuevo' check (estado in ('nuevo','contactado','en_proceso','descartado')),
  notas text
);
create index propietarios_email_idx on propietarios (lower(email));

create table desarrolladores (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz default now(),
  -- Se vincula con el login por el email verificado (link mágico).
  email text not null unique,
  nombre text not null, empresa text not null, whatsapp text not null, cuit text,
  barrios text[] default '{}', m2_terreno_min numeric, m2_terreno_max numeric,
  m2_construibles_buscados numeric, presupuesto_usd numeric, tipo_proyecto text,
  estado text default 'pendiente' check (estado in ('pendiente','aprobado','rechazado'))
);

-- Lo único que ve un desarrollador aprobado. Se publica a mano desde el panel.
create table oportunidades (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz default now(),
  propietario_id uuid not null references propietarios(id),
  barrio text not null, m2_terreno numeric, m2_construibles numeric,
  min_usd numeric, max_usd numeric,
  ok_del_dueno boolean default false,   -- el dueño dio su OK a publicar
  publicada boolean default false check (not publicada or ok_del_dueno)
);

create table intereses (
  oportunidad_id uuid references oportunidades(id) on delete cascade,
  desarrollador_id uuid references desarrolladores(id) on delete cascade,
  creado_en timestamptz default now(),
  primary key (oportunidad_id, desarrollador_id)
);

-- Caché de informes generados por IA (clave = hash de los datos del inmueble; sin datos personales).
create table informes_cache (
  hash text primary key,
  informe text not null,
  creado_en timestamptz default now()
);

-- RLS activado y sin políticas = acceso directo denegado a anon y authenticated.
alter table barrios enable row level security;
alter table propietarios enable row level security;
alter table desarrolladores enable row level security;
alter table oportunidades enable row level security;
alter table intereses enable row level security;
alter table informes_cache enable row level security;

-- Cinturón y tirantes: sacar permisos de tabla a los roles públicos.
revoke all on all tables in schema public from anon, authenticated;

-- Semilla de barrios (todos en PENDIENTE).
insert into barrios (nombre) values
 ('Agronomía'),('Almagro'),('Balvanera'),('Barracas'),('Belgrano'),('Boedo'),('Caballito'),('Chacarita'),
 ('Coghlan'),('Colegiales'),('Constitución'),('Flores'),('Floresta'),('La Boca'),('La Paternal'),('Liniers'),
 ('Mataderos'),('Monte Castro'),('Montserrat'),('Nueva Pompeya'),('Núñez'),('Palermo'),('Parque Avellaneda'),
 ('Parque Chacabuco'),('Parque Chas'),('Parque Patricios'),('Puerto Madero'),('Recoleta'),('Retiro'),
 ('Saavedra'),('San Cristóbal'),('San Nicolás'),('San Telmo'),('Vélez Sarsfield'),('Versalles'),
 ('Villa Crespo'),('Villa del Parque'),('Villa Devoto'),('Villa General Mitre'),('Villa Lugano'),
 ('Villa Luro'),('Villa Ortúzar'),('Villa Pueyrredón'),('Villa Real'),('Villa Riachuelo'),
 ('Villa Santa Rita'),('Villa Soldati'),('Villa Urquiza')
on conflict do nothing;
