import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function parseAbrJsonOrJsonp(text: string) {
  const trimmed = text.trim();

  // JSONP format usually looks like: callbackName({...});
  const jsonpMatch = trimmed.match(/^[a-zA-Z_$][\w$]*\((.*)\)\s*;?\s*$/s);
  if (jsonpMatch?.[1]) {
    return JSON.parse(jsonpMatch[1]);
  }

  // Plain JSON
  return JSON.parse(trimmed);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const abn = String(body?.abn ?? "").replace(/\s/g, "");

    if (!/^\d{11}$/.test(abn)) {
      return NextResponse.json({ error: "Invalid ABN format" }, { status: 400 });
    }

    const guid = process.env.ABR_GUID;
    if (!guid) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Add a callback so ABR consistently returns JSONP (then we parse it safely)
    const abrUrl = `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${abn}&guid=${guid}&callback=cb`;

    const res = await fetch(abrUrl, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json,text/plain,*/*",
        // User-Agent sometimes helps with government endpoints when running on Node
        "User-Agent": "TradeHub/1.0 (localhost)",
      },
    });

    const text = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        { error: "ABR request failed", status: res.status, abrSnippet: text.slice(0, 300) },
        { status: 502 }
      );
    }

    let data: any;
    try {
      data = parseAbrJsonOrJsonp(text);
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid ABR response format", abrSnippet: text.slice(0, 300) },
        { status: 500 }
      );
    }

    // ABR can return messages even for valid JSONP/JSON
    if (!data || data.AbnStatus !== "Active") {
      return NextResponse.json(
        {
          error: "ABN not active or not found",
          abnStatus: data?.AbnStatus ?? null,
          abrMessage: data?.Message ?? null,
          entityName: data?.EntityName ?? null,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      abn: data.Abn,
      entityName: data.EntityName,
      entityType: data.EntityTypeName,
      gst: data.Gst ?? null,
    });
  } catch (err) {
    console.error("ABN verify route error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
