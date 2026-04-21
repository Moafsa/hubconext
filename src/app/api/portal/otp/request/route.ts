import { NextResponse } from "next/server";
import { requestOtp } from "@/app/actions/db-actions";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const projectId = String(body?.projectId || "");
    const channel = body?.channel === "email" ? "email" : "whatsapp";

    if (!projectId) {
      return NextResponse.json({ success: false, error: "MISSING_PROJECT_ID" }, { status: 400 });
    }

    const result = await requestOtp(projectId, channel);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "INTERNAL_ERROR" }, { status: 500 });
  }
}

