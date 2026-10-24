-- boletin_acuses: immutable receipt of boletín for a responsable per period
create table if not exists boletin_acuses (
  id             uuid primary key default gen_random_uuid(),
  alumno_id      uuid not null references alumnos(id) on delete cascade,
  periodo_id     uuid not null references periodos(id) on delete cascade,
  persona_id     uuid not null references personas(id) on delete cascade,
  confirmado_por uuid references personas(id),
  confirmed_at   timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  unique (alumno_id, periodo_id, persona_id)
);

create index if not exists boletin_acuses_alumno_idx  on boletin_acuses(alumno_id);
create index if not exists boletin_acuses_periodo_idx on boletin_acuses(periodo_id);
create index if not exists boletin_acuses_persona_idx on boletin_acuses(persona_id);

alter table boletin_acuses enable row level security;

-- Responsables: insert own acuse only for their linked alumnos
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'boletin_acuses' and policyname = 'responsable inserta acuse de su alumno'
  ) then
    create policy "responsable inserta acuse de su alumno"
    on boletin_acuses for insert
    to authenticated
    with check (
      persona_id = get_persona_id()
      and exists (
        select 1 from alumno_responsables ar
        where ar.alumno_id = boletin_acuses.alumno_id
          and ar.persona_id = boletin_acuses.persona_id
      )
    );
  end if;
end $$;

-- Responsables: read their own acuses
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'boletin_acuses' and policyname = 'responsable lee sus acuses'
  ) then
    create policy "responsable lee sus acuses"
    on boletin_acuses for select
    to authenticated
    using (
      persona_id = get_persona_id()
    );
  end if;
end $$;

-- Admin: read all acuses of their institution
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'boletin_acuses' and policyname = 'admin lee acuses de su institucion'
  ) then
    create policy "admin lee acuses de su institucion"
    on boletin_acuses for select
    to authenticated
    using (
      exists (
        select 1 from periodos p
        join años_lectivos al on al.id = p.año_lectivo_id
        join memberships m on m.institucion_id = al.institucion_id
        where p.id = boletin_acuses.periodo_id
          and m.persona_id = get_persona_id()
          and m.rol in ('admin', 'superadmin')
      )
    );
  end if;
end $$;
