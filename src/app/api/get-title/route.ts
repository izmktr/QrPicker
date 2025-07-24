import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }
    // fetchでHTML取得
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; QrPicker/1.0)',
        'Accept': 'text/html',
      },
      // リダイレクトも追従
      redirect: 'follow',
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }
    const html = await res.text();
    // <title>タグ抽出
    const match = html.match(/<title>([^<]*)<\/title>/i);
    const title = match ? match[1].trim() : '';
    return NextResponse.json({ title });
  } catch (e) {
    return NextResponse.json({ error: 'Error fetching title' }, { status: 500 });
  }
}
