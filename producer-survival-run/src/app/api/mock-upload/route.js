import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function PUT(request) {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    
    if (key) {
      const buffer = await request.arrayBuffer();
      const filePath = path.join(process.cwd(), 'public', 'audio', 'simulated-uploads', key);
      const dir = path.dirname(filePath);
      
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, Buffer.from(buffer));
    }
    
    return NextResponse.json({ success: true, message: 'Simulated file block uploaded successfully to public folder.' });
  } catch (err) {
    console.error('Mock upload error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
