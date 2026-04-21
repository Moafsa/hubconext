import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(
  process.env.CLIENT_JWT_SECRET || "fallback_secret_conext_white_label_sis_2025"
);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Proteger o Dashboard (NextAuth)
  if (pathname.startsWith("/dashboard")) {
    const token = await getToken({ req });
    if (!token) {
      const url = new URL("/login", req.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
  }

  // 2. Proteger o Portal do Cliente (/p/[id])
  // Permitir acesso à página de verificação e APIs de auth
  if (pathname.startsWith("/p/") && !pathname.endsWith("/verify") && !pathname.includes("/api/")) {
    const projectId = pathname.split("/")[2];
    
    // Ignorar se for um arquivo estático ou api
    if (projectId && !projectId.includes(".")) {
      const clientToken = req.cookies.get("client_token")?.value;

      if (!clientToken) {
        return NextResponse.redirect(new URL(`/p/${projectId}/verify`, req.url));
      }

      try {
        const { payload } = await jwtVerify(clientToken, SECRET);
        // Verificar se o token pertence a este projeto específico
        if (payload.projectId !== projectId) {
          return NextResponse.redirect(new URL(`/p/${projectId}/verify`, req.url));
        }
      } catch (err) {
        return NextResponse.redirect(new URL(`/p/${projectId}/verify`, req.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/p/:path*",
  ],
};
