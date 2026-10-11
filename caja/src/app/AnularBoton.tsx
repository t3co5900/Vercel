"use client";

import { useState, useTransition } from "react";
import { anularVenta } from "./actions";

export function AnularBoton({ id }: { id: number }) {
  const [pendiente, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        className="mal"
        disabled={pendiente}
        onClick={() => {
          if (!window.confirm(`¿Anular la venta #${id}?`)) return;
          start(async () => {
            const r = await anularVenta(id);
            setError(r.ok ? null : r.error);
          });
        }}
      >
        Anular
      </button>
      {error && <span className="err"> {error}</span>}
    </>
  );
}
