import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, tokenValido } from "@/lib/sesion";

export async function middleware(req: NextRequest) {
  if (await tokenValido(req.cookies.get(COOKIE)?.value)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!login|_next|favicon.ico).*)"] };
