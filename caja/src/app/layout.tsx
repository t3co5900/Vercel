import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { COOKIE, tokenValido } from "@/lib/sesion";
import { logout } from "./actions";
import "./globals.css";

export const metadata: Metadata = { title: "Caja", description: "Caja e inventario del local" };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function Layout({ children }: { children: React.ReactNode }) {
  const dentro = await tokenValido((await cookies()).get(COOKIE)?.value);
  return (
    <html lang="es">
      <body>
        {dentro && (
          <nav>
            <Link href="/">Vender</Link>
            <Link href="/turno">Turno y cierre</Link>
            <Link href="/stock">Stock</Link>
            <Link href="/productos">Productos</Link>
            <span className="sp" />
            <form action={logout}>
              <button type="submit">Salir</button>
            </form>
          </nav>
        )}
        <main>{children}</main>
      </body>
    </html>
  );
}
