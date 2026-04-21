import { NextResponse } from "next/server";
import { verifyOtp } from "@/app/actions/db-actions";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const projectId = String(body?.projectId || "");
    const code = String(body?.code || "");

    if (!projectId || !code) {
      return NextResponse.json({ success: false, error: "MISSING_FIELDS" }, { status: 400 });
    }

    const result = await verifyOtp(projectId, code);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || "INTERNAL_ERROR" }, { status: 500 });
  }
}

