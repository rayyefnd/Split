import { NextResponse } from "next/server";

const OCR_URL = process.env.OCR_SERVICE_URL ?? "http://localhost:8000";

async function scanWithTesseract(file: File) {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch(`${OCR_URL}/ocr`, {
    method: "POST",
    body,
    signal: AbortSignal.timeout(60_000), // OCR can take up to ~30s
  });
  if (!res.ok) throw new Error(`OCR service returned ${res.status}`);
  return res.json();
}

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  try {
    const data = await scanWithTesseract(file);
    return NextResponse.json({ source: "tesseract", ...data });
  } catch {
    return NextResponse.json({ error: "OCR service unavailable" }, { status: 502 });
  }
}