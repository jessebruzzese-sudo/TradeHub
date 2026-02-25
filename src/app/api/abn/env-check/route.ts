import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET() {
  const guid = process.env.ABR_GUID || "";
  return NextResponse.json({
    hasAbrGuid: Boolean(guid),
    abrGuidLength: guid.length,
  });
}
