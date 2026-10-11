import { ETIQUETA_MEDIO, pesos } from "@/lib/dominio";
import {
  conteosDelTurno,
  resumenTurno,
  stockActual,
  turnoAbierto,
  turnosCerrados,
  ventasDelTurno,
} from "@/lib/servicio";
import { abrirTurno, cerrarTurno } from "../actions";
import { AnularBoton } from "../AnularBoton";
import { Formulario } from "../Formulario";

export const dynamic = "force-dynamic";

const hora = (d: string) => new Date(d).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });

export default async function Turno() {
  const turno = await turnoAbierto();
  if (!turno) return <SinTurno />;

  const [r, ventas, stock] = await Promise.all([resumenTurno(turno.id), ventasDelTurno(turno.id), stockActual()]);
  const { caja } = r;
  return (
    <>
      <h1>Turno abierto <span className="mut">desde {hora(turno.abierto_en)}</span></h1>

      <div className="card">
        <table>
          <tbody>
            <tr><td>Efectivo</td><td className="n">{pesos(caja.efectivo)}</td></tr>
            <tr><td>Transferencia</td><td className="n">{pesos(caja.transferencia)}</td></tr>
            <tr><td>Débito</td><td className="n">{pesos(caja.debito)}</td></tr>
            <tr><td>Crédito</td><td className="n">{pesos(caja.credito)}</td></tr>
            <tr><td><strong>Total digital</strong></td><td className="n"><strong>{pesos(caja.digital)}</strong></td></tr>
            <tr><td><strong>Total vendido</strong></td><td className="n tot">{pesos(caja.total)}</td></tr>
          </tbody>
        </table>
        <p className="mut">
          Fondo inicial {pesos(turno.efectivo_inicial)} · efectivo que debería haber en caja:{" "}
          <strong>{pesos(caja.efectivoEsperado)}</strong>
        </p>
      </div>

      <h2>Unidades vendidas: {r.unidadesTotal}</h2>
      <div className="card">
        {r.unidades.length === 0 ? <p className="mut">Todavía no hay ventas.</p> : (
          <table>
            <thead><tr><th>Producto</th><th className="n">Unidades</th><th className="n">Importe</th></tr></thead>
            <tbody>
              {r.unidades.map((u) => (
                <tr key={u.producto_id}><td>{u.nombre}</td><td className="n">{u.unidades}</td><td className="n">{pesos(u.importe)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2>Ventas del turno</h2>
      <div className="card">
        {ventas.length === 0 ? <p className="mut">Sin ventas.</p> : (
          <table>
            <tbody>
              {ventas.map((v) => (
                <tr key={v.id} className={v.anulada ? "anul" : ""}>
                  <td>#{v.id}</td>
                  <td>{v.detalle}<br /><small className="mut">{ETIQUETA_MEDIO[v.medio_pago]}</small></td>
                  <td className="n">{pesos(v.total)}</td>
                  <td>{!v.anulada && <AnularBoton id={v.id} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h2>Cerrar caja</h2>
      <div className="card">
        <Formulario action={cerrarTurno} limpiar={false} confirmar="¿Cerrar el turno? Después no se pueden anular ventas.">
          <label htmlFor="efectivoContado">Efectivo contado en caja (incluye el fondo inicial)</label>
          <input id="efectivoContado" name="efectivoContado" type="number" min="0" step="1" inputMode="numeric" required />
          <label htmlFor="digitalDeclarado">Digital según el banco / posnet (opcional, para comparar)</label>
          <input id="digitalDeclarado" name="digitalDeclarado" type="number" min="0" step="1" inputMode="numeric" />

          <h2>Lo que sobró</h2>
          <p className="mut">Contá y completá. Lo que dejes vacío se considera sin cambios.</p>
          <table>
            <thead><tr><th>Producto</th><th className="n">Depósito (esperado)</th><th className="n">Mostrador (esperado)</th></tr></thead>
            <tbody>
              {stock.map((s) => (
                <tr key={s.producto_id}>
                  <td>{s.nombre}</td>
                  <td><input name={`conteo_deposito_${s.producto_id}`} type="number" min="0" step="1" inputMode="numeric" placeholder={String(s.deposito)} /></td>
                  <td><input name={`conteo_mostrador_${s.producto_id}`} type="number" min="0" step="1" inputMode="numeric" placeholder={String(s.mostrador)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <label htmlFor="notas">Notas</label>
          <input id="notas" name="notas" />
          <p><button className="pri" type="submit">Cerrar turno</button></p>
        </Formulario>
      </div>
    </>
  );
}

async function SinTurno() {
  const cerrados = await turnosCerrados(10);
  const detalle = await Promise.all(
    cerrados.map(async (t) => ({ t, r: await resumenTurno(t.id), c: await conteosDelTurno(t.id) })),
  );
  return (
    <>
      <h1>Abrir caja</h1>
      <div className="card">
        <Formulario action={abrirTurno}>
          <label htmlFor="efectivoInicial">Efectivo inicial (fondo de cambio)</label>
          <input id="efectivoInicial" name="efectivoInicial" type="number" min="0" step="1" inputMode="numeric" defaultValue={0} required />
          <p><button className="pri" type="submit">Abrir turno</button></p>
        </Formulario>
      </div>

      <h2>Últimos cierres</h2>
      {detalle.length === 0 && <p className="mut">Todavía no hay cierres.</p>}
      {detalle.map(({ t, r, c }) => {
        const dif = r.caja.diferenciaEfectivo ?? 0;
        const faltantes = c.filter((x) => x.contado !== x.teorico);
        return (
          <div className="card" key={t.id}>
            <strong>{hora(t.abierto_en)}</strong> → {t.cerrado_en && hora(t.cerrado_en)}
            <table>
              <tbody>
                <tr><td>Efectivo</td><td className="n">{pesos(r.caja.efectivo)}</td></tr>
                <tr><td>Digital</td><td className="n">{pesos(r.caja.digital)}</td></tr>
                <tr><td><strong>Total</strong></td><td className="n"><strong>{pesos(r.caja.total)}</strong></td></tr>
                <tr><td>Unidades vendidas</td><td className="n">{r.unidadesTotal}</td></tr>
                <tr>
                  <td>Diferencia de efectivo</td>
                  <td className={"n " + (dif === 0 ? "ok" : "mal")}>{dif === 0 ? "sin diferencia" : pesos(dif)}</td>
                </tr>
                {t.digital_declarado != null && (
                  <tr>
                    <td>Diferencia digital</td>
                    <td className={"n " + (t.digital_declarado === r.caja.digital ? "ok" : "mal")}>
                      {t.digital_declarado === r.caja.digital ? "sin diferencia" : pesos(t.digital_declarado - r.caja.digital)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {faltantes.length > 0 && (
              <p className="mal">
                Diferencias de stock:{" "}
                {faltantes.map((x) => `${x.nombre} (${x.ubicacion}) ${x.contado - x.teorico > 0 ? "+" : ""}${x.contado - x.teorico}`).join(", ")}
              </p>
            )}
            {t.notas && <p className="mut">{t.notas}</p>}
          </div>
        );
      })}
    </>
  );
}
