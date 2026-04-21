import { NextResponse } from "next/server";
import { createAgency } from "@/app/actions/db-actions";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, cnpj, responsibleName, responsibleEmail, responsiblePhone } = body;

    if (!name || !cnpj || !responsibleName || !responsibleEmail) {
      return NextResponse.json(
        { success: false, error: "MISSING_FIELDS" },
        { status: 400 }
      );
    }

    const result = await createAgency({
      name,
      cnpj,
      responsibleName,
      responsibleEmail,
      responsiblePhone
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, agency: result.agency }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR", details: error.message },
      { status: 500 }
    );
  }
}
