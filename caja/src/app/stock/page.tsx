import { listarProductos, stockActual } from "@/lib/servicio";
import { ingresarStock, traspasar } from "../actions";
import { Formulario } from "../Formulario";

export const dynamic = "force-dynamic";

export default async function Stock() {
  const [stock, productos] = await Promise.all([stockActual(), listarProductos(true)]);
  const opciones = productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>);
  return (
    <>
      <h1>Stock</h1>
      <div className="card">
        <table>
          <thead><tr><th>Producto</th><th className="n">Depósito</th><th className="n">Mostrador</th><th className="n">Total</th></tr></thead>
          <tbody>
            {stock.map((s) => (
              <tr key={s.producto_id}>
                <td>{s.nombre}</td>
                <td className="n">{s.deposito}</td>
                <td className={"n " + (s.mostrador < 0 ? "mal" : "")}>{s.mostrador}</td>
                <td className="n"><strong>{s.deposito + s.mostrador}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Ingreso de mercadería</h2>
      <div className="card">
        <Formulario action={ingresarStock}>
          <div className="row">
            <div><label htmlFor="i-prod">Producto</label><select id="i-prod" name="productoId" required>{opciones}</select></div>
            <div><label htmlFor="i-ub">Ubicación</label>
              <select id="i-ub" name="ubicacion"><option value="deposito">Depósito</option><option value="mostrador">Mostrador</option></select></div>
            <div><label htmlFor="i-cant">Cantidad</label><input id="i-cant" name="cantidad" type="number" min="1" step="1" inputMode="numeric" required /></div>
          </div>
          <label htmlFor="i-nota">Nota (opcional)</label>
          <input id="i-nota" name="nota" />
          <p><button className="pri" type="submit">Registrar ingreso</button></p>
        </Formulario>
      </div>

      <h2>Pasar del depósito al mostrador</h2>
      <div className="card">
        <Formulario action={traspasar}>
          <div className="row">
            <div><label htmlFor="t-prod">Producto</label><select id="t-prod" name="productoId" required>{opciones}</select></div>
            <div><label htmlFor="t-cant">Cantidad</label><input id="t-cant" name="cantidad" type="number" min="1" step="1" inputMode="numeric" required /></div>
          </div>
          <p><button className="pri" type="submit">Pasar</button></p>
        </Formulario>
      </div>
    </>
  );
}
