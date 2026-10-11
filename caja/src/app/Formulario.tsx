"use client";

import { useRef, useState, useTransition } from "react";
import type { Resultado } from "./actions";

/** Form que ejecuta una server action, muestra el error y se limpia si salió bien. */
export function Formulario({
  action,
  children,
  limpiar = true,
  confirmar,
}: {
  action: (fd: FormData) => Promise<Resultado>;
  children: React.ReactNode;
  limpiar?: boolean;
  confirmar?: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, start] = useTransition();
  return (
    <form
      ref={ref}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirmar && !window.confirm(confirmar)) return;
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const r = await action(fd);
          if (r.ok) {
            setError(null);
            if (limpiar) ref.current?.reset();
          } else setError(r.error);
        });
      }}
    >
      <fieldset disabled={pendiente} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        {children}
      </fieldset>
      {error && <p className="err">{error}</p>}
    </form>
  );
}
