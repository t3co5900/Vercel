import Link from "next/link";
import { stockActual, turnoAbierto, listarProductos } from "@/lib/servicio";
import { VentaRapida } from "./VentaRapida";

export const dynamic = "force-dynamic";

export default async function Vender() {
  const turno = await turnoAbierto();
  if (!turno)
    return (
      <>
        <h1>Vender</h1>
        <div className="card">
          <p>No hay un turno abierto. Abrí la caja para empezar a registrar ventas.</p>
          <Link className="btn" href="/turno">Ir a Turno y cierre</Link>
        </div>
      </>
    );
  const [productos, stock] = await Promise.all([listarProductos(true), stockActual()]);
  const enMostrador = new Map(stock.map((s) => [s.producto_id, s.mostrador]));
  return (
    <>
      <h1>Vender</h1>
      <VentaRapida productos={productos.map((p) => ({ ...p, mostrador: enMostrador.get(p.id) ?? 0 }))} />
    </>
  );
}
