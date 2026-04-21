import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.CLIENT_JWT_SECRET || "fallback_secret_conext_white_label_sis_2025"
);

export async function createClientSession(projectId: string, clientId: string) {
  const expiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000); // 15 dias
  
  const token = await new SignJWT({ projectId, clientId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15d")
    .sign(SECRET);

  const cookieStore = await cookies();
  cookieStore.set("client_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });

  return token;
}

export async function verifyClientSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("client_token")?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as { projectId: string; clientId: string };
  } catch (error) {
    return null;
  }
}

export async function deleteClientSession() {
  const cookieStore = await cookies();
  cookieStore.delete("client_token");
}
