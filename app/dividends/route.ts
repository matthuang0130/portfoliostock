import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  const sql = neon(process.env.DATABASE_URL!);
  
  try {
    const formData = await request.formData();
    const actionType = String(formData.get('action_type') || '');

    if (actionType === 'DELETE_SYMBOL') {
      const symbol = String(formData.get('symbol') || '').trim();
      
      // 直接強行清除該股票所有的配息紀錄
      await sql`DELETE FROM transactions WHERE symbol = ${symbol} AND action_type = 'CASH_DIVIDEND'`;
    } 
    else if (actionType === 'ADD') {
      const accountId = Number(formData.get('account_id') || 1);
      const symbol = String(formData.get('symbol') || '').trim();
      const symbolName = String(formData.get('symbol_name') || '').trim();
      const tradeDate = String(formData.get('trade_date') || '');
      const totalAmount = Number(formData.get('total_amount') || 0);

      if (!symbol || !tradeDate || totalAmount <= 0) {
        return NextResponse.json({ error: '請填寫完整資訊' }, { status: 400 });
      }

      await sql`
        INSERT INTO transactions (account_id, symbol, symbol_name, action_type, trade_date, shares, price, total_amount, record_source)
        VALUES (${accountId === 0 ? 1 : accountId}, ${symbol}, ${symbolName}, 'CASH_DIVIDEND', ${tradeDate}, 0, 0, ${totalAmount}, 'MANUAL')
      `;
    }

    // 🌟 強制清空 Next.js 的全站靜態快取
    revalidatePath('/', 'layout');
    
    return NextResponse.redirect(new URL('/', request.url), 303);
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: '資料庫操作失敗', message: error.message }, { status: 500 });
  }
}