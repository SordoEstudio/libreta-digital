-- dimension_plantillas
create table dimension_plantillas (
  id             uuid primary key default gen_random_uuid(),
  institucion_id uuid not null references instituciones(id),
  nombre         text not null check (char_length(nombre) between 1 and 100),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create index on dimension_plantillas (institucion_id);

-- dimension_plantilla_items
create table dimension_plantilla_items (
  id           uuid primary key default gen_random_uuid(),
  plantilla_id uuid not null references dimension_plantillas(id) on delete cascade,
  nombre       text not null check (char_length(nombre) between 1 and 100),
  peso         numeric(5,2) check (peso is null or peso > 0),
  orden        integer not null default 0
);
create index on dimension_plantilla_items (plantilla_id);

-- RLS: dimension_plantillas
alter table dimension_plantillas enable row level security;

create policy "plantillas_select"
  on dimension_plantillas for select
  using (has_any_role(institucion_id, '{admin,docente}') or is_superadmin());

create policy "plantillas_insert"
  on dimension_plantillas for insert
  with check (has_any_role(institucion_id, '{admin}') or is_superadmin());

create policy "plantillas_update"
  on dimension_plantillas for update
  using (has_any_role(institucion_id, '{admin}') or is_superadmin());

create policy "plantillas_delete"
  on dimension_plantillas for delete
  using (has_any_role(institucion_id, '{admin}') or is_superadmin());

-- RLS: dimension_plantilla_items (via join to plantillas)
alter table dimension_plantilla_items enable row level security;

create policy "plantilla_items_select"
  on dimension_plantilla_items for select
  using (
    exists (
      select 1 from dimension_plantillas p
      where p.id = plantilla_id
        and (has_any_role(p.institucion_id, '{admin,docente}') or is_superadmin())
    )
  );

create policy "plantilla_items_insert"
  on dimension_plantilla_items for insert
  with check (
    exists (
      select 1 from dimension_plantillas p
      where p.id = plantilla_id
        and (has_any_role(p.institucion_id, '{admin}') or is_superadmin())
    )
  );

create policy "plantilla_items_delete"
  on dimension_plantilla_items for delete
  using (
    exists (
      select 1 from dimension_plantillas p
      where p.id = plantilla_id
        and (has_any_role(p.institucion_id, '{admin}') or is_superadmin())
    )
  );

-- RPC: bulk apply (security definer — app verifies auth before calling)
create or replace function aplicar_plantilla_a_curso(
  p_curso_id     uuid,
  p_plantilla_id uuid,
  p_institucion_id uuid
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_materia_id uuid;
  v_count      integer := 0;
begin
  -- verify plantilla belongs to the stated institution and is not deleted
  if not exists (
    select 1 from dimension_plantillas
    where id = p_plantilla_id
      and institucion_id = p_institucion_id
      and deleted_at is null
  ) then
    raise exception 'plantilla_not_found';
  end if;

  for v_materia_id in
    select id from materias
    where curso_id = p_curso_id and deleted_at is null
  loop
    delete from materias_dimensiones where materia_id = v_materia_id;
    insert into materias_dimensiones (materia_id, nombre, peso, orden)
    select v_materia_id, nombre, peso, orden
    from dimension_plantilla_items
    where plantilla_id = p_plantilla_id
    order by orden;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;
