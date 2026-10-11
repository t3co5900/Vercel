"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { COOKIE, DURACION_SEGUNDOS, crearToken, pinEsperado } from "@/lib/sesion";
import { esMedio, UBICACIONES, type Ubicacion } from "@/lib/dominio";
import * as s from "@/lib/servicio";

export type Resultado = { ok: true } | { ok: false; error: string };

async function seguro(fn: () => Promise<void>): Promise<Resultado> {
  try {
    await fn();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error inesperado" };
  }
}

export async function login(_: unknown, fd: FormData): Promise<{ error: string } | undefined> {
  const pin = pinEsperado();
  if (!pin) return { error: "El acceso no está configurado (falta CAJA_PIN)" };
  if (String(fd.get("pin") ?? "") !== pin) return { error: "PIN incorrecto" };
  (await cookies()).set(COOKIE, await crearToken(), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: DURACION_SEGUNDOS });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(COOKIE);
  redirect("/login");
}

export async function abrirTurno(fd: FormData): Promise<Resultado> {
  return seguro(async () => {
    await s.abrirTurno(Number(fd.get("efectivoInicial") || 0));
    revalidatePath("/", "layout");
  });
}

export async function registrarVenta(medio: string, lineas: { productoId: number; cantidad: number }[]): Promise<Resultado> {
  return seguro(async () => {
    const t = await s.turnoAbierto();
    if (!t) throw new Error("No hay turno abierto");
    if (!esMedio(medio)) throw new Error("Medio de pago inválido");
    await s.registrarVenta(t.id, medio, lineas);
    revalidatePath("/", "layout");
  });
}

export async function anularVenta(id: number): Promise<Resultado> {
  return seguro(async () => {
    await s.anularVenta(id);
    revalidatePath("/", "layout");
  });
}

export async function cerrarTurno(fd: FormData): Promise<Resultado> {
  return seguro(async () => {
    const t = await s.turnoAbierto();
    if (!t) throw new Error("No hay turno abierto");
    const conteos: s.ConteoFinal[] = [];
    for (const [k, v] of fd.entries()) {
      const m = /^conteo_(deposito|mostrador)_(\d+)$/.exec(k);
      if (!m || String(v).trim() === "") continue;
      conteos.push({ productoId: Number(m[2]), ubicacion: m[1] as Ubicacion, contado: Number(v) });
    }
    const dig = String(fd.get("digitalDeclarado") ?? "").trim();
    await s.cerrarTurno(t.id, Number(fd.get("efectivoContado")), conteos, String(fd.get("notas") ?? ""), dig === "" ? null : Number(dig));
    revalidatePath("/", "layout");
  });
}

export async function ingresarStock(fd: FormData): Promise<Resultado> {
  return seguro(async () => {
    const ub = String(fd.get("ubicacion"));
    if (!(UBICACIONES as readonly string[]).includes(ub)) throw new Error("Ubicación inválida");
    await s.ingresarStock(Number(fd.get("productoId")), ub as Ubicacion, Number(fd.get("cantidad")), String(fd.get("nota") ?? "") || undefined);
    revalidatePath("/stock");
  });
}

export async function traspasar(fd: FormData): Promise<Resultado> {
  return seguro(async () => {
    await s.traspasar(Number(fd.get("productoId")), Number(fd.get("cantidad")));
    revalidatePath("/stock");
  });
}

export async function guardarProducto(fd: FormData): Promise<Resultado> {
  return seguro(async () => {
    await s.guardarProducto({
      id: fd.get("id") ? Number(fd.get("id")) : undefined,
      nombre: String(fd.get("nombre") ?? ""),
      categoria: String(fd.get("categoria") ?? ""),
      precio: Number(fd.get("precio")),
      activo: fd.get("activo") === "on" || !fd.get("id"),
    });
    revalidatePath("/", "layout");
  });
}
