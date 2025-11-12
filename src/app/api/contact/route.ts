import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body?.email || !body?.name) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // In a production app you would forward this payload to Formspree, Slack, or your CRM here.
    console.log("Contact request received", body);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
