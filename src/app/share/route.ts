import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const url = formData.get('url')?.toString();
    const title = formData.get('title')?.toString();

    // URLパラメータとして渡して、メインページで処理
    const redirectUrl = new URL('/', request.url);
    
    if (url) {
      redirectUrl.searchParams.set('shared_url', url);
    }
    
    if (title) {
      redirectUrl.searchParams.set('shared_title', title);
    }

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Share error:', error);
    // エラーの場合もメインページにリダイレクト
    return NextResponse.redirect(new URL('/', request.url));
  }
}
