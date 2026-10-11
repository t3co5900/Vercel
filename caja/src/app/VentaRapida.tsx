"use client";

import { useState, useTransition } from "react";
import { MEDIOS, ETIQUETA_MEDIO, pesos, type Medio } from "@/lib/dominio";
import { registrarVenta } from "./actions";

interface P { id: number; nombre: string; categoria: string; precio: number; mostrador: number }

export function VentaRapida({ productos }: { productos: P[] }) {
  const [carrito, setCarrito] = useState<Record<number, number>>({});
  const [medio, setMedio] = useState<Medio | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pendiente, start] = useTransition();

  const lineas = productos.filter((p) => carrito[p.id]).map((p) => ({ p, c: carrito[p.id] }));
  const total = lineas.reduce((s, { p, c }) => s + p.precio * c, 0);
  const cambiar = (id: number, d: number) =>
    setCarrito((x) => {
      const n = { ...x, [id]: Math.max(0, (x[id] ?? 0) + d) };
      if (!n[id]) delete n[id];
      return n;
    });

  const cobrar = () =>
    start(async () => {
      if (!medio) return setError("Elegí el medio de pago");
      const r = await registrarVenta(medio, lineas.map(({ p, c }) => ({ productoId: p.id, cantidad: c })));
      if (r.ok) {
        setAviso(`Venta registrada: ${pesos(total)} (${ETIQUETA_MEDIO[medio]})`);
        setCarrito({});
        setMedio(null);
        setError(null);
      } else setError(r.error);
    });

  const categorias = [...new Set(productos.map((p) => p.categoria))];
  return (
    <>
      {categorias.map((cat) => (
        <section key={cat}>
          <h2>{cat}</h2>
          <div className="grid">
            {productos.filter((p) => p.categoria === cat).map((p) => (
              <button key={p.id} className="prod" onClick={() => cambiar(p.id, 1)}>
                <span>{p.nombre}</span>
                <small>
                  {pesos(p.precio)} · mostrador: <span className={p.mostrador <= 0 ? "mal" : ""}>{p.mostrador}</span>
                </small>
                {carrito[p.id] ? <strong>× {carrito[p.id]}</strong> : null}
              </button>
            ))}
          </div>
        </section>
      ))}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Venta actual</h2>
        {lineas.length === 0 ? (
          <p className="mut">Tocá un producto para agregarlo.</p>
        ) : (
          <table>
            <tbody>
              {lineas.map(({ p, c }) => (
                <tr key={p.id}>
                  <td>{p.nombre}</td>
                  <td className="n">
                    <button onClick={() => cambiar(p.id, -1)} aria-label={`Quitar ${p.nombre}`}>−</button>{" "}
                    {c}{" "}
                    <button onClick={() => cambiar(p.id, 1)} aria-label={`Agregar ${p.nombre}`}>+</button>
                  </td>
                  <td className="n">{pesos(p.precio * c)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="tot">{pesos(total)}</p>
        <div className="medios">
          {MEDIOS.map((m) => (
            <button key={m} className={medio === m ? "sel" : ""} onClick={() => setMedio(m)}>
              {ETIQUETA_MEDIO[m]}
            </button>
          ))}
        </div>
        {error && <p className="err">{error}</p>}
        {aviso && !error && <p className="ok">{aviso}</p>}
        <p>
          <button className="pri" disabled={pendiente || lineas.length === 0 || !medio} onClick={cobrar} style={{ width: "100%" }}>
            {pendiente ? "Registrando…" : "Cobrar"}
          </button>
        </p>
      </div>
    </>
  );
}
