// Montos en pesos enteros (sin decimales). Stock = suma de movimiento_stock.
export const SCHEMA = `
create table if not exists producto (
  id serial primary key,
  nombre text not null unique,
  categoria text not null default 'otros',
  precio int not null check (precio >= 0),
  activo boolean not null default true
);

create table if not exists turno (
  id serial primary key,
  abierto_en timestamptz not null default now(),
  cerrado_en timestamptz,
  efectivo_inicial int not null default 0 check (efectivo_inicial >= 0),
  efectivo_contado int,
  digital_declarado int,
  notas text
);

create table if not exists venta (
  id serial primary key,
  turno_id int not null references turno(id),
  creada_en timestamptz not null default now(),
  medio_pago text not null check (medio_pago in ('efectivo','transferencia','debito','credito')),
  total int not null check (total >= 0),
  anulada boolean not null default false
);

create table if not exists venta_item (
  id serial primary key,
  venta_id int not null references venta(id),
  producto_id int not null references producto(id),
  cantidad int not null check (cantidad > 0),
  precio_unit int not null check (precio_unit >= 0)
);

create table if not exists movimiento_stock (
  id serial primary key,
  producto_id int not null references producto(id),
  ubicacion text not null check (ubicacion in ('deposito','mostrador')),
  cantidad int not null,
  tipo text not null check (tipo in ('ingreso','traspaso','venta','anulacion','ajuste')),
  turno_id int references turno(id),
  venta_id int references venta(id),
  nota text,
  creado_en timestamptz not null default now()
);

create table if not exists conteo_cierre (
  id serial primary key,
  turno_id int not null references turno(id),
  producto_id int not null references producto(id),
  ubicacion text not null check (ubicacion in ('deposito','mostrador')),
  contado int not null,
  teorico int not null,
  unique (turno_id, producto_id, ubicacion)
);

create index if not exists venta_turno_idx on venta(turno_id);
create index if not exists mov_producto_idx on movimiento_stock(producto_id, ubicacion);
`;
