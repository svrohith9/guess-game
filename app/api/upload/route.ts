import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const file = data.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    const filename = `${Date.now()}-${file.name}`;
    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);
    return NextResponse.json({ path: `/uploads/${filename}` });
  } catch (error) {
    console.error("Upload route error", error, "Hint: check filesystem permissions.");
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
