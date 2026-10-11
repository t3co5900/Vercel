// Sesión mínima: cookie "expira.firma" con HMAC-SHA256. Funciona en Edge (middleware) y Node.
export const COOKIE = "caja_sesion";
const DURACION_MS = 1000 * 60 * 60 * 12;

function secreto(): string {
  const s = process.env.CAJA_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("Falta CAJA_SECRET");
  return "dev-secret-no-usar-en-produccion";
}

export function pinEsperado(): string | null {
  const p = process.env.CAJA_PIN;
  if (p) return p;
  return process.env.NODE_ENV === "production" ? null : "1234";
}

async function firmar(texto: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secreto()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(texto)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function crearToken(): Promise<string> {
  const exp = String(Date.now() + DURACION_MS);
  return `${exp}.${await firmar(exp)}`;
}

export async function tokenValido(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [exp, firma] = token.split(".");
  if (!exp || !firma || Number(exp) < Date.now()) return false;
  const esperada = await firmar(exp);
  if (esperada.length !== firma.length) return false;
  let diff = 0;
  for (let i = 0; i < esperada.length; i++) diff |= esperada.charCodeAt(i) ^ firma.charCodeAt(i);
  return diff === 0;
}

export const DURACION_SEGUNDOS = DURACION_MS / 1000;
