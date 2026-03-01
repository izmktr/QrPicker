import { NextRequest, NextResponse } from 'next/server';

const CHARSET_ALIASES: Record<string, string> = {
  'sjis': 'shift_jis',
  'shift-jis': 'shift_jis',
  'x-sjis': 'shift_jis',
  'cp932': 'shift_jis',
  'ms932': 'shift_jis',
  'windows-31j': 'shift_jis',
  'x-euc-jp': 'euc-jp',
};

function normalizeCharset(charset?: string | null): string | null {
  if (!charset) return null;
  const cleaned = charset.trim().toLowerCase().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  return CHARSET_ALIASES[cleaned] ?? cleaned;
}

function extractCharsetFromContentType(contentType: string | null): string | null {
  if (!contentType) return null;
  const match = contentType.match(/charset\s*=\s*([^;]+)/i);
  return normalizeCharset(match?.[1] ?? null);
}

function detectBomCharset(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return 'utf-8';
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return 'utf-16le';
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return 'utf-16be';
  }
  return null;
}

function extractCharsetFromMeta(bytes: Uint8Array): string | null {
  const headSample = bytes.slice(0, Math.min(bytes.length, 8192));
  const latin1Decoder = new TextDecoder('iso-8859-1');
  const sampleHtml = latin1Decoder.decode(headSample);

  const directMetaCharset = sampleHtml.match(/<meta[^>]*charset\s*=\s*["']?\s*([a-zA-Z0-9._-]+)\s*["']?/i);
  if (directMetaCharset?.[1]) {
    return normalizeCharset(directMetaCharset[1]);
  }

  const httpEquivMeta = sampleHtml.match(/<meta[^>]*http-equiv\s*=\s*["']?content-type["']?[^>]*content\s*=\s*["'][^"']*charset\s*=\s*([a-zA-Z0-9._-]+)/i)
    ?? sampleHtml.match(/<meta[^>]*content\s*=\s*["'][^"']*charset\s*=\s*([a-zA-Z0-9._-]+)[^"']*["'][^>]*http-equiv\s*=\s*["']?content-type["']?/i);
  if (httpEquivMeta?.[1]) {
    return normalizeCharset(httpEquivMeta[1]);
  }

  return null;
}

function decodeHtml(bytes: Uint8Array, charset: string): string {
  try {
    return new TextDecoder(charset, { fatal: false }).decode(bytes);
  } catch {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  }
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].replace(/\s+/g, ' ').trim() : '';
}

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
        'User-Agent': 'Mozilla/5.0 (compatible; QuickPick/1.0)',
        'Accept': 'text/html',
      },
      // リダイレクトも追従
      redirect: 'follow',
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
    }

    const bytes = new Uint8Array(await res.arrayBuffer());
    const charsetFromHeader = extractCharsetFromContentType(res.headers.get('content-type'));
    const charsetFromBom = detectBomCharset(bytes);
    const charsetFromMeta = extractCharsetFromMeta(bytes);
    const charset = charsetFromHeader ?? charsetFromBom ?? charsetFromMeta ?? 'utf-8';

    const html = decodeHtml(bytes, charset);
    const title = extractTitle(html);

    return NextResponse.json({ title });
  } catch (e) {
    return NextResponse.json({ error: 'Error fetching title' }, { status: 500 });
  }
}
