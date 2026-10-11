export const MEDIOS = ["efectivo", "transferencia", "debito", "credito"] as const;
export type Medio = (typeof MEDIOS)[number];
export const UBICACIONES = ["deposito", "mostrador"] as const;
export type Ubicacion = (typeof UBICACIONES)[number];

export const ETIQUETA_MEDIO: Record<Medio, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  debito: "Débito",
  credito: "Crédito",
};

export interface ItemVenta {
  productoId: number;
  cantidad: number;
  precioUnit: number;
}

export function totalVenta(items: ItemVenta[]): number {
  return items.reduce((s, i) => s + i.cantidad * i.precioUnit, 0);
}

export interface ResumenCaja {
  efectivo: number;
  transferencia: number;
  debito: number;
  credito: number;
  /** transferencia + débito + crédito */
  digital: number;
  /** efectivo + digital (ventas, sin contar el fondo inicial) */
  total: number;
  /** fondo inicial + ventas en efectivo */
  efectivoEsperado: number;
  /** contado - esperado; null si todavía no se contó */
  diferenciaEfectivo: number | null;
}

export function resumenCaja(input: {
  efectivoInicial: number;
  ventas: { medio: Medio; total: number }[];
  efectivoContado: number | null;
}): ResumenCaja {
  const por = { efectivo: 0, transferencia: 0, debito: 0, credito: 0 };
  for (const v of input.ventas) por[v.medio] += v.total;
  const digital = por.transferencia + por.debito + por.credito;
  const efectivoEsperado = input.efectivoInicial + por.efectivo;
  return {
    ...por,
    digital,
    total: por.efectivo + digital,
    efectivoEsperado,
    diferenciaEfectivo: input.efectivoContado === null ? null : input.efectivoContado - efectivoEsperado,
  };
}

export function esMedio(x: unknown): x is Medio {
  return typeof x === "string" && (MEDIOS as readonly string[]).includes(x);
}

export function pesos(n: number): string {
  return "$ " + n.toLocaleString("es-AR");
}
