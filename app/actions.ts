'use server';

import { neon } from '@neondatabase/serverless';
import { revalidatePath } from 'next/cache';

// 🌟 自動確保帳號存在的輔助函式
async function ensureAccountExists(accountId: number) {
  if (accountId === 0) return; // 總覽模式不需要開戶
  const sql = neon(process.env.DATABASE_URL!);
  
  try {
    await sql`INSERT INTO accounts (id) VALUES (${accountId}) ON CONFLICT (id) DO NOTHING`;
  } catch (e) {
    try {
      await sql`INSERT INTO accounts (id, name) VALUES (${accountId}, ${'帳號 ' + accountId}) ON CONFLICT (id) DO NOTHING`;
    } catch (err) {
      console.log('自動開戶略過，可能是表格結構不同：', err);
    }
  }
}

// 1. 手動新增單筆交易
export async function addTransaction(formData: FormData) {
  const account_id = Number(formData.get('account_id')) || 1;
  await ensureAccountExists(account_id);

  const symbol = formData.get('symbol')?.toString().toUpperCase().trim() || '';
  const action_type = formData.get('action_type')?.toString() || 'BUY';
  const trade_date = formData.get('trade_date')?.toString() || new Date().toISOString().split('T')[0];
  const shares = Number(formData.get('shares')) || 0;
  const price = Number(formData.get('price')) || 0;

  // 🌟 修正點 1：如果是現金股利，總金額直接等於填寫的 price
  let total_amount = 0;
  if (action_type === 'CASH_DIVIDEND') {
    total_amount = price;
  } else {
    total_amount = shares * price;
  }

  // 🌟 修正點 2：基本驗證放寬。如果不是現金股利，才強制檢查 shares > 0
  if (!symbol) return;
  if (action_type !== 'CASH_DIVIDEND' && shares <= 0) return;
  if (action_type === 'CASH_DIVIDEND' && total_amount <= 0) return;

  const sql = neon(process.env.DATABASE_URL!);
  await sql`
    INSERT INTO transactions (account_id, symbol, action_type, trade_date, shares, price, total_amount)
    VALUES (${account_id}, ${symbol}, ${action_type}, ${trade_date}, ${shares}, ${price}, ${total_amount})
  `;
  revalidatePath('/');
}

// 2. 刪除單筆交易
export async function deleteTransaction(formData: FormData) {
  const id = formData.get('id');
  if (!id) return;
  const sql = neon(process.env.DATABASE_URL!);
  await sql`DELETE FROM transactions WHERE id = ${id}`;
  revalidatePath('/');
}

// 3. 一鍵清空特定帳號資料
export async function clearAllTransactions(accountId: number) {
  const sql = neon(process.env.DATABASE_URL!);
  await sql`DELETE FROM transactions WHERE account_id = ${accountId}`;
  revalidatePath('/');
}

// 4. 記錄資產快照
export async function recordAssetSnapshot(accountId: number, totalValue: number, totalCost: number) {
  if (accountId !== 0) await ensureAccountExists(accountId);
  
  const sql = neon(process.env.DATABASE_URL!);
  await sql`
    CREATE TABLE IF NOT EXISTS asset_snapshots (
      id SERIAL PRIMARY KEY, account_id INT DEFAULT 1, record_date DATE NOT NULL,
      total_value NUMERIC NOT NULL, total_cost NUMERIC NOT NULL
    )
  `;
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
  await sql`DELETE FROM asset_snapshots WHERE account_id = ${accountId} AND record_date = ${today}`;
  await sql`
    INSERT INTO asset_snapshots (account_id, record_date, total_value, total_cost)
    VALUES (${accountId}, ${today}, ${totalValue}, ${totalCost})
  `;
  revalidatePath('/');
}

// 5. 批次匯入交易紀錄
export async function importTransactions(accountId: number, records: any[]) {
  await ensureAccountExists(accountId);
  
  const sql = neon(process.env.DATABASE_URL!);
  
  const existingRecords = await sql`
    SELECT symbol, action_type, trade_date, shares, price, total_amount 
    FROM transactions WHERE account_id = ${accountId} AND action_type IN ('BUY', 'CASH_DIVIDEND')
  `;
  
  const existingMap = new Map<string, number>();
  existingRecords.forEach(tx => {
    const dateStr = new Date(tx.trade_date).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
    const key = tx.action_type === 'BUY' 
      ? `BUY_${tx.symbol}_${dateStr}_${Number(tx.shares)}_${Number(tx.price)}`
      : `DIV_${tx.symbol}_${dateStr}_${Number(tx.total_amount)}`;
    existingMap.set(key, (existingMap.get(key) || 0) + 1);
  });

  const recordsToInsert = [];
  for (const record of records) {
    const rawSymbol = record['代號'];
    if (!rawSymbol) continue; 
    let symbol = String(rawSymbol).trim();
    const stockName = String(record['商品名稱'] || ''); 

    if (/^\d+$/.test(symbol)) {
      if (symbol.length === 2) symbol = '00' + symbol;
      else if (symbol.length === 3) symbol = '00' + symbol;
      else if (symbol.length === 4 && ['6203', '6204', '6208'].includes(symbol) && /富邦|元大|兆豐/.test(stockName)) {
        symbol = '00' + symbol; 
      }
    }
    
    let trade_date = record['成交日期'];
    let formatted_date = '';
    if (typeof trade_date === 'number') {
      formatted_date = new Date((trade_date - 25569) * 86400 * 1000).toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
    } else if (typeof trade_date === 'string') {
      const dateObj = new Date(trade_date.replace(/\//g, '-'));
      if (!isNaN(dateObj.getTime())) formatted_date = dateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
    }
    if (!formatted_date) continue;

    const rawShares = String(record['成交數量'] || '0').replace(/,/g, '').trim();
    const rawPrice = String(record['成交價'] || '0').replace(/,/g, '').trim();
    const rawTotal = String(record['持有成本'] || '0').replace(/,/g, '').trim();
    
    if (rawShares !== '-' && rawPrice !== '-' && rawTotal !== '-') {
      const shares = Number(rawShares); const price = Number(rawPrice); const total_amount = Number(rawTotal);
      if (!isNaN(shares) && !isNaN(price) && !isNaN(total_amount) && symbol && shares > 0) {
        const buyKey = `BUY_${symbol}_${formatted_date}_${shares}_${price}`;
        if (existingMap.has(buyKey) && existingMap.get(buyKey)! > 0) {
          existingMap.set(buyKey, existingMap.get(buyKey)! - 1);
        } else {
          recordsToInsert.push({ account_id: accountId, symbol, action_type: 'BUY', trade_date: formatted_date, shares, price, total_amount });
        }
      }
    }

    const rawDividend = String(record['配息總額'] || '0').replace(/,/g, '').trim();
    if (rawDividend !== '-' && rawDividend !== '') {
      const divAmount = Number(rawDividend);
      if (!isNaN(divAmount) && divAmount > 0 && symbol) {
        const divKey = `DIV_${symbol}_${formatted_date}_${divAmount}`;
        if (existingMap.has(divKey) && existingMap.get(divKey)! > 0) {
          existingMap.set(divKey, existingMap.get(divKey)! - 1); 
        } else {
          recordsToInsert.push({ account_id: accountId, symbol, action_type: 'CASH_DIVIDEND', trade_date: formatted_date, shares: 0, price: 0, total_amount: divAmount });
        }
      }
    }
  }

  if (recordsToInsert.length > 0) {
    await sql`
      INSERT INTO transactions (account_id, symbol, action_type, trade_date, shares, price, total_amount)
      SELECT * FROM jsonb_to_recordset(${JSON.stringify(recordsToInsert)}::jsonb) 
      AS x(account_id int, symbol text, action_type text, trade_date date, shares numeric, price numeric, total_amount numeric)
    `;
  }
  revalidatePath('/');
}