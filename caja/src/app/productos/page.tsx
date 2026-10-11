import { pesos } from "@/lib/dominio";
import { listarProductos } from "@/lib/servicio";
import { guardarProducto } from "../actions";
import { Formulario } from "../Formulario";

export const dynamic = "force-dynamic";

export default async function Productos() {
  const productos = await listarProductos();
  return (
    <>
      <h1>Productos</h1>
      <div className="card">
        <Formulario action={guardarProducto}>
          <div className="row">
            <div><label htmlFor="n-nombre">Nombre</label><input id="n-nombre" name="nombre" required /></div>
            <div><label htmlFor="n-cat">Categoría</label><input id="n-cat" name="categoria" placeholder="empanadas, pizzas, bebidas…" /></div>
            <div><label htmlFor="n-precio">Precio ($)</label><input id="n-precio" name="precio" type="number" min="0" step="1" inputMode="numeric" required /></div>
          </div>
          <p><button className="pri" type="submit">Agregar producto</button></p>
        </Formulario>
      </div>

      <div className="card">
        {productos.length === 0 && <p className="mut">Todavía no cargaste productos.</p>}
        {productos.map((p) => (
          <Formulario key={p.id} action={guardarProducto} limpiar={false}>
            <input type="hidden" name="id" value={p.id} />
            <div className="row">
              <div><input name="nombre" defaultValue={p.nombre} aria-label="Nombre" required /></div>
              <div><input name="categoria" defaultValue={p.categoria} aria-label="Categoría" /></div>
              <div><input name="precio" type="number" min="0" step="1" defaultValue={p.precio} aria-label={`Precio (actual ${pesos(p.precio)})`} required /></div>
              <div style={{ flex: "0 0 auto" }}><label style={{ display: "flex", gap: 6, alignItems: "center", margin: 0 }}>
                <input type="checkbox" name="activo" defaultChecked={p.activo} style={{ width: 20, minHeight: 20 }} /> activo</label></div>
              <div style={{ flex: "0 0 auto" }}><button type="submit">Guardar</button></div>
            </div>
          </Formulario>
        ))}
      </div>
    </>
  );
}
