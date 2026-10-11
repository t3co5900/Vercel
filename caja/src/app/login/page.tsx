"use client";

import { useActionState } from "react";
import { login } from "../actions";

export default function Login() {
  const [estado, accion, pendiente] = useActionState(login, undefined);
  return (
    <form action={accion} className="card" style={{ maxWidth: 360, margin: "20vh auto 0" }}>
      <h1>Caja</h1>
      <label htmlFor="pin">PIN</label>
      <input id="pin" name="pin" type="password" inputMode="numeric" autoComplete="current-password" autoFocus required />
      {estado?.error && <p className="err">{estado.error}</p>}
      <p>
        <button className="pri" type="submit" disabled={pendiente} style={{ width: "100%" }}>
          Entrar
        </button>
      </p>
    </form>
  );
}
