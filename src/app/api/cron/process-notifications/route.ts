import { NextResponse } from "next/server";
import { NotificationService } from "@/services/notification-service";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    // Segurança simples via secret na URL
    if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron] Iniciando processamento de notificações...");
    await NotificationService.processQueue();
    
    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error: any) {
    console.error("[Cron] Erro ao processar notificações:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
