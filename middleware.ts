import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // 抓取瀏覽器傳來的驗證標頭
  const basicAuth = req.headers.get('authorization');

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    // 將 Base64 解碼成 帳號:密碼 格式
    const [user, pwd] = atob(authValue).split(':');

    // 帳號固定為 admin，密碼讀取環境變數 (若未設定則預設為 888888)
    const validPassword = process.env.SITE_PASSWORD || '888888';

    if (user === 'admin' && pwd === validPassword) {
      return NextResponse.next(); // 密碼正確，放行！
    }
  }

  // 若沒有驗證紀錄或密碼錯誤，則彈出瀏覽器原生的密碼輸入框
  return new NextResponse('請輸入帳號密碼', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}

// 設定哪些路徑需要被保護 (保護全部，但排除靜態檔案)
export const config = {
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',
};