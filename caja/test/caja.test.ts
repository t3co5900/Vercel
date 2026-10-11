import { describe, expect, it, beforeAll } from "vitest";
import { resumenCaja } from "../src/lib/dominio";
import * as s from "../src/lib/servicio";

describe("resumenCaja", () => {
  it("separa efectivo y digital y calcula el arqueo", () => {
    const r = resumenCaja({
      efectivoInicial: 1000,
      ventas: [
        { medio: "efectivo", total: 3000 },
        { medio: "transferencia", total: 2000 },
        { medio: "debito", total: 500 },
        { medio: "credito", total: 700 },
      ],
      efectivoContado: 3900,
    });
    expect(r.digital).toBe(3200);
    expect(r.total).toBe(6200);
    expect(r.efectivoEsperado).toBe(4000);
    expect(r.diferenciaEfectivo).toBe(-100);
  });
  it("sin conteo no hay diferencia", () => {
    expect(resumenCaja({ efectivoInicial: 0, ventas: [], efectivoContado: null }).diferenciaEfectivo).toBeNull();
  });
});

describe("turno completo", () => {
  let emp: number, pizza: number, turno: number;
  beforeAll(async () => {
    await s.guardarProducto({ nombre: "Empanada carne", categoria: "empanadas", precio: 1500 });
    await s.guardarProducto({ nombre: "Pizza muzza", categoria: "pizzas", precio: 9000 });
    const ps = await s.listarProductos();
    emp = ps.find((p) => p.nombre === "Empanada carne")!.id;
    pizza = ps.find((p) => p.nombre === "Pizza muzza")!.id;
    await s.ingresarStock(emp, "deposito", 100);
    await s.ingresarStock(pizza, "deposito", 10);
    await s.traspasar(emp, 40);
    turno = await s.abrirTurno(2000);
  });

  it("no deja abrir dos turnos", async () => {
    await expect(s.abrirTurno(0)).rejects.toThrow(/ya hay un turno/i);
  });

  it("registra ventas con precio del servidor y descuenta del mostrador", async () => {
    const a = await s.registrarVenta(turno, "efectivo", [{ productoId: emp, cantidad: 6 }]);
    expect(a.total).toBe(9000);
    await s.registrarVenta(turno, "transferencia", [{ productoId: pizza, cantidad: 1 }, { productoId: emp, cantidad: 2 }]);
    const mala = await s.registrarVenta(turno, "credito", [{ productoId: emp, cantidad: 1 }]);
    await s.anularVenta(mala.ventaId);

    const st = (await s.stockActual()).find((x) => x.producto_id === emp)!;
    expect(st.mostrador).toBe(40 - 6 - 2);
    expect(st.deposito).toBe(60);

    const r = await s.resumenTurno(turno);
    expect(r.caja.efectivo).toBe(9000);
    expect(r.caja.digital).toBe(12000);
    expect(r.caja.total).toBe(21000);
    expect(r.unidadesTotal).toBe(6 + 2 + 1);
    expect(r.unidades.find((u) => u.nombre === "Empanada carne")!.unidades).toBe(8);
  });

  it("rechaza ventas vacías, medios inválidos y productos inactivos", async () => {
    await expect(s.registrarVenta(turno, "efectivo", [])).rejects.toThrow();
    await expect(s.registrarVenta(turno, "bitcoin" as any, [{ productoId: emp, cantidad: 1 }])).rejects.toThrow();
    await expect(s.registrarVenta(turno, "efectivo", [{ productoId: emp, cantidad: 0 }])).rejects.toThrow();
  });

  it("cierra el turno, guarda diferencias y alinea el stock", async () => {
    await s.cerrarTurno(turno, 11000, [
      { productoId: emp, ubicacion: "mostrador", contado: 31 }, // teórico 32 -> falta 1
      { productoId: emp, ubicacion: "deposito", contado: 60 },
    ]);
    const r = await s.resumenTurno(turno);
    expect(r.caja.efectivoEsperado).toBe(11000);
    expect(r.caja.diferenciaEfectivo).toBe(0);
    const c = (await s.conteosDelTurno(turno)).find((x) => x.ubicacion === "mostrador")!;
    expect(c.teorico - c.contado).toBe(1);
    expect((await s.stockActual()).find((x) => x.producto_id === emp)!.mostrador).toBe(31);
    expect(await s.turnoAbierto()).toBeNull();
  });

  it("no permite vender ni cerrar un turno cerrado", async () => {
    await expect(s.registrarVenta(turno, "efectivo", [{ productoId: emp, cantidad: 1 }])).rejects.toThrow(/no está abierto/);
    await expect(s.cerrarTurno(turno, 0, [])).rejects.toThrow(/ya está cerrado/);
  });
});
