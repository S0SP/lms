import { type NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');

  if (!key || key.includes('..')) {
    return NextResponse.json({ error: 'Invalid or missing file key' }, { status: 400 });
  }

  try {
    const arrayBuffer = await req.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const targetFilePath = path.join(uploadsDir, key);

    // Ensure directory exists
    const dir = path.dirname(targetFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(targetFilePath, buffer);

    return NextResponse.json({ ok: true, key, size: buffer.length });
  } catch (error: any) {
    console.error('[Uploads Local] Error writing uploaded file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save local file' },
      { status: 500 }
    );
  }
}
