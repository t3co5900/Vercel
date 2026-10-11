import { query, transaction, type Query } from "./db";
import {
  esMedio,
  resumenCaja,
  totalVenta,
  type ItemVenta,
  type Medio,
  type ResumenCaja,
  type Ubicacion,
} from "./dominio";

export interface Producto {
  id: number;
  nombre: string;
  categoria: string;
  precio: number;
  activo: boolean;
}

export interface Turno {
  id: number;
  abierto_en: string;
  cerrado_en: string | null;
  efectivo_inicial: number;
  efectivo_contado: number | null;
  digital_declarado: number | null;
  notas: string | null;
}

const entero = (n: unknown, campo: string, min = 0): number => {
  const v = Number(n);
  if (!Number.isInteger(v) || v < min) throw new Error(`${campo} inválido`);
  return v;
};

// ---------- productos ----------

export const listarProductos = (soloActivos = false) =>
  query<Producto>(
    `select id, nombre, categoria, precio, activo from producto
     ${soloActivos ? "where activo" : ""} order by categoria, nombre`,
  );

export async function guardarProducto(p: {
  id?: number;
  nombre: string;
  categoria: string;
  precio: number;
  activo?: boolean;
}) {
  const nombre = p.nombre.trim();
  if (!nombre) throw new Error("Falta el nombre");
  const categoria = p.categoria.trim() || "otros";
  const precio = entero(p.precio, "Precio");
  if (p.id) {
    await query(`update producto set nombre=$1, categoria=$2, precio=$3, activo=$4 where id=$5`, [
      nombre,
      categoria,
      precio,
      p.activo ?? true,
      p.id,
    ]);
  } else {
    await query(`insert into producto (nombre, categoria, precio) values ($1,$2,$3)`, [
      nombre,
      categoria,
      precio,
    ]);
  }
}

// ---------- turnos ----------

export async function turnoAbierto(): Promise<Turno | null> {
  const r = await query<Turno>(`select * from turno where cerrado_en is null order by id desc limit 1`);
  return r[0] ?? null;
}

export async function abrirTurno(efectivoInicial: number): Promise<number> {
  const inicial = entero(efectivoInicial, "Efectivo inicial");
  return transaction(async (q) => {
    // lock para que dos dispositivos no abran turnos a la vez
    await q(`lock table turno in share row exclusive mode`);
    const abierto = await q(`select id from turno where cerrado_en is null limit 1`);
    if (abierto.length) throw new Error("Ya hay un turno abierto");
    const r = await q<{ id: number }>(`insert into turno (efectivo_inicial) values ($1) returning id`, [inicial]);
    return r[0].id;
  });
}

// ---------- stock ----------

export interface FilaStock {
  producto_id: number;
  nombre: string;
  categoria: string;
  deposito: number;
  mostrador: number;
}

export const stockActual = (q: Query = query) =>
  q<FilaStock>(
    `select p.id as producto_id, p.nombre, p.categoria,
            coalesce(sum(m.cantidad) filter (where m.ubicacion='deposito'),0)::int as deposito,
            coalesce(sum(m.cantidad) filter (where m.ubicacion='mostrador'),0)::int as mostrador
       from producto p left join movimiento_stock m on m.producto_id = p.id
      where p.activo
      group by p.id order by p.categoria, p.nombre`,
  );

async function mover(
  q: Query,
  m: { productoId: number; ubicacion: Ubicacion; cantidad: number; tipo: string; turnoId?: number | null; ventaId?: number | null; nota?: string | null },
) {
  await q(
    `insert into movimiento_stock (producto_id, ubicacion, cantidad, tipo, turno_id, venta_id, nota)
     values ($1,$2,$3,$4,$5,$6,$7)`,
    [m.productoId, m.ubicacion, m.cantidad, m.tipo, m.turnoId ?? null, m.ventaId ?? null, m.nota ?? null],
  );
}

/** Mercadería que entra (producción/compra) a una ubicación. */
export async function ingresarStock(productoId: number, ubicacion: Ubicacion, cantidad: number, nota?: string) {
  const c = entero(cantidad, "Cantidad", 1);
  await transaction((q) => mover(q, { productoId, ubicacion, cantidad: c, tipo: "ingreso", nota }));
}

/** Pasa del depósito al mostrador. */
export async function traspasar(productoId: number, cantidad: number) {
  const c = entero(cantidad, "Cantidad", 1);
  await transaction(async (q) => {
    await mover(q, { productoId, ubicacion: "deposito", cantidad: -c, tipo: "traspaso" });
    await mover(q, { productoId, ubicacion: "mostrador", cantidad: c, tipo: "traspaso" });
  });
}

// ---------- ventas ----------

export async function registrarVenta(
  turnoId: number,
  medio: Medio,
  lineas: { productoId: number; cantidad: number }[],
): Promise<{ ventaId: number; total: number }> {
  if (!esMedio(medio)) throw new Error("Medio de pago inválido");
  if (!lineas.length) throw new Error("La venta está vacía");
  return transaction(async (q) => {
    const turno = await q<{ cerrado_en: string | null }>(`select cerrado_en from turno where id=$1`, [turnoId]);
    if (!turno.length || turno[0].cerrado_en) throw new Error("El turno no está abierto");

    // el precio se toma del servidor, nunca del cliente
    const items: ItemVenta[] = [];
    for (const l of lineas) {
      const cantidad = entero(l.cantidad, "Cantidad", 1);
      const p = await q<{ precio: number; activo: boolean }>(`select precio, activo from producto where id=$1`, [l.productoId]);
      if (!p.length || !p[0].activo) throw new Error("Producto inexistente o inactivo");
      items.push({ productoId: l.productoId, cantidad, precioUnit: p[0].precio });
    }
    const total = totalVenta(items);
    const v = await q<{ id: number }>(
      `insert into venta (turno_id, medio_pago, total) values ($1,$2,$3) returning id`,
      [turnoId, medio, total],
    );
    const ventaId = v[0].id;
    for (const i of items) {
      await q(`insert into venta_item (venta_id, producto_id, cantidad, precio_unit) values ($1,$2,$3,$4)`, [
        ventaId,
        i.productoId,
        i.cantidad,
        i.precioUnit,
      ]);
      await mover(q, { productoId: i.productoId, ubicacion: "mostrador", cantidad: -i.cantidad, tipo: "venta", turnoId, ventaId });
    }
    return { ventaId, total };
  });
}

export async function anularVenta(ventaId: number) {
  await transaction(async (q) => {
    const v = await q<{ turno_id: number; anulada: boolean; cerrado_en: string | null }>(
      `select v.turno_id, v.anulada, t.cerrado_en from venta v join turno t on t.id=v.turno_id where v.id=$1 for update of v`,
      [ventaId],
    );
    if (!v.length) throw new Error("Venta inexistente");
    if (v[0].anulada) return;
    if (v[0].cerrado_en) throw new Error("No se puede anular una venta de un turno cerrado");
    await q(`update venta set anulada = true where id=$1`, [ventaId]);
    const items = await q<{ producto_id: number; cantidad: number }>(
      `select producto_id, cantidad from venta_item where venta_id=$1`,
      [ventaId],
    );
    for (const i of items)
      await mover(q, { productoId: i.producto_id, ubicacion: "mostrador", cantidad: i.cantidad, tipo: "anulacion", turnoId: v[0].turno_id, ventaId });
  });
}

export interface VentaListada {
  id: number;
  creada_en: string;
  medio_pago: Medio;
  total: number;
  anulada: boolean;
  detalle: string;
}

export const ventasDelTurno = (turnoId: number) =>
  query<VentaListada>(
    `select v.id, v.creada_en, v.medio_pago, v.total, v.anulada,
            string_agg(i.cantidad || ' x ' || p.nombre, ', ' order by p.nombre) as detalle
       from venta v join venta_item i on i.venta_id=v.id join producto p on p.id=i.producto_id
      where v.turno_id=$1 group by v.id order by v.id desc`,
    [turnoId],
  );

// ---------- resumen y cierre ----------

export interface UnidadesVendidas {
  producto_id: number;
  nombre: string;
  unidades: number;
  importe: number;
}

export async function resumenTurno(turnoId: number): Promise<{
  turno: Turno;
  caja: ResumenCaja;
  unidades: UnidadesVendidas[];
  unidadesTotal: number;
}> {
  const t = await query<Turno>(`select * from turno where id=$1`, [turnoId]);
  if (!t.length) throw new Error("Turno inexistente");
  const ventas = await query<{ medio: Medio; total: number }>(
    `select medio_pago as medio, total from venta where turno_id=$1 and not anulada`,
    [turnoId],
  );
  const unidades = await query<UnidadesVendidas>(
    `select p.id as producto_id, p.nombre, sum(i.cantidad)::int as unidades, sum(i.cantidad*i.precio_unit)::int as importe
       from venta_item i join venta v on v.id=i.venta_id join producto p on p.id=i.producto_id
      where v.turno_id=$1 and not v.anulada group by p.id order by p.nombre`,
    [turnoId],
  );
  return {
    turno: t[0],
    caja: resumenCaja({
      efectivoInicial: t[0].efectivo_inicial,
      ventas,
      efectivoContado: t[0].efectivo_contado,
    }),
    unidades,
    unidadesTotal: unidades.reduce((s, u) => s + u.unidades, 0),
  };
}

export interface ConteoFinal {
  productoId: number;
  ubicacion: Ubicacion;
  contado: number;
}

/**
 * Cierra el turno: guarda el efectivo contado, el conteo de lo que sobró y
 * alinea el stock a lo contado con movimientos de ajuste (queda la huella
 * de cada diferencia en conteo_cierre).
 */
export async function cerrarTurno(
  turnoId: number,
  efectivoContado: number,
  conteos: ConteoFinal[],
  notas?: string,
  digitalDeclarado?: number | null,
) {
  const contado = entero(efectivoContado, "Efectivo contado");
  const digital = digitalDeclarado == null ? null : entero(digitalDeclarado, "Digital declarado");
  await transaction(async (q) => {
    const t = await q<{ cerrado_en: string | null }>(`select cerrado_en from turno where id=$1 for update`, [turnoId]);
    if (!t.length) throw new Error("Turno inexistente");
    if (t[0].cerrado_en) throw new Error("El turno ya está cerrado");

    const stock = await stockActual(q);
    const teorico = new Map<string, number>();
    for (const s of stock) {
      teorico.set(`${s.producto_id}:deposito`, s.deposito);
      teorico.set(`${s.producto_id}:mostrador`, s.mostrador);
    }
    for (const c of conteos) {
      const cont = entero(c.contado, "Conteo");
      const clave = `${c.productoId}:${c.ubicacion}`;
      if (!teorico.has(clave)) throw new Error("Conteo de un producto inexistente");
      const esperado = teorico.get(clave)!;
      await q(
        `insert into conteo_cierre (turno_id, producto_id, ubicacion, contado, teorico) values ($1,$2,$3,$4,$5)`,
        [turnoId, c.productoId, c.ubicacion, cont, esperado],
      );
      if (cont !== esperado)
        await mover(q, { productoId: c.productoId, ubicacion: c.ubicacion, cantidad: cont - esperado, tipo: "ajuste", turnoId, nota: "ajuste por conteo de cierre" });
    }
    await q(
      `update turno set cerrado_en=now(), efectivo_contado=$2, digital_declarado=$3, notas=$4 where id=$1`,
      [turnoId, contado, digital, notas?.trim() || null],
    );
  });
}

export interface DiferenciaConteo {
  nombre: string;
  ubicacion: Ubicacion;
  contado: number;
  teorico: number;
}

export const conteosDelTurno = (turnoId: number) =>
  query<DiferenciaConteo>(
    `select p.nombre, c.ubicacion, c.contado, c.teorico
       from conteo_cierre c join producto p on p.id=c.producto_id
      where c.turno_id=$1 order by p.nombre, c.ubicacion`,
    [turnoId],
  );

export const turnosCerrados = (limite = 30) =>
  query<Turno>(`select * from turno where cerrado_en is not null order by id desc limit $1`, [limite]);
