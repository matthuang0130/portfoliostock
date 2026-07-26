'use server';

import { neon } from '@neondatabase/serverless';
import { revalidatePath } from 'next/cache';

// 1. 新增單筆交易紀錄 (修復配息算成 0，且將配息來源隔離)
export async function addTransaction(formData: FormData) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    
    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS symbol_name VARCHAR(100);`;
    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS realized_pnl NUMERIC;`;
    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS record_source VARCHAR(20) DEFAULT 'INVENTORY';`;

    const account_id = Number(formData.get('account_id'));
    const symbol = String(formData.get('symbol')).trim();
    const symbol_name = formData.get('symbol_name') ? String(formData.get('symbol_name')).trim() : null;
    const action_type = String(formData.get('action_type')).toUpperCase();
    const trade_date = String(formData.get('trade_date'));
    const shares = Number(formData.get('shares') || 0);
    const price = Number(formData.get('price') || 0);
    
    let total_amount = Number(formData.get('total_amount') || 0);
    if (total_amount === 0 && (shares > 0 || price > 0)) {
      total_amount = shares * price;
    }

    if (!symbol || !trade_date || (action_type !== 'CASH_DIVIDEND' && total_amount === 0 && shares === 0)) {
      throw new Error('請填寫有效的標的代號、日期與金額！');
    }

    // 🌟 配息標記為 DIVIDEND，庫存標記為 INVENTORY
    const recordSource = action_type === 'CASH_DIVIDEND' ? 'DIVIDEND' : 'INVENTORY';

    await sql`
      INSERT INTO transactions (account_id, symbol, symbol_name, action_type, trade_date, shares, price, total_amount, record_source)
      VALUES (${account_id}, ${symbol}, ${symbol_name}, ${action_type}, ${trade_date}, ${shares}, ${price}, ${total_amount}, ${recordSource})
    `;

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 2. 刪除單筆交易紀錄
export async function deleteTransaction(formData: FormData) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const id = Number(formData.get('id'));

    if (!id) throw new Error('無效的紀錄 ID');

    await sql`DELETE FROM transactions WHERE id = ${id}`;

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 3. 批次匯入交易紀錄
export async function importTransactions(transactions: any[]) {
  try {
    if (!transactions || transactions.length === 0) return { success: true };

    const sql = neon(process.env.DATABASE_URL!);

    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS symbol_name VARCHAR(100);`;
    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS realized_pnl NUMERIC;`;
    await sql`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS record_source VARCHAR(20) DEFAULT 'INVENTORY';`;

    const queries = transactions.map((tx) => {
      let actionType = String(tx.action_type || '').toUpperCase().trim();
      let realizedPnl: number | null = null;
      if (tx.realized_pnl !== undefined && tx.realized_pnl !== null && tx.realized_pnl !== '' && !isNaN(Number(tx.realized_pnl))) {
        realizedPnl = Number(tx.realized_pnl);
      }

      return sql`
        INSERT INTO transactions (account_id, symbol, symbol_name, action_type, trade_date, shares, price, total_amount, realized_pnl, record_source)
        VALUES (
          ${Number(tx.account_id)}, 
          ${String(tx.symbol)}, 
          ${tx.symbol_name ? String(tx.symbol_name) : null},
          ${actionType || 'BUY'}, 
          ${tx.trade_date}, 
          ${Number(tx.shares || 0)}, 
          ${Number(tx.price || 0)}, 
          ${Number(tx.total_amount || 0)}, 
          ${realizedPnl}, 
          ${tx.record_source || 'INVENTORY'}
        )
      `;
    });

    await sql.transaction(queries);

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 4-1. 📊 僅清空「庫存紀錄 (INVENTORY)」
export async function clearInventoryData(accountId: number) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    if (accountId === 0) {
      await sql`DELETE FROM transactions WHERE record_source = 'INVENTORY' OR record_source IS NULL`;
    } else {
      await sql`DELETE FROM transactions WHERE account_id = ${accountId} AND (record_source = 'INVENTORY' OR record_source IS NULL)`;
    }
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 4-2. 📜 僅清空「歷史對帳單 (HISTORY_PNL)」
export async function clearHistoryPnlData(accountId: number) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    if (accountId === 0) {
      await sql`DELETE FROM transactions WHERE record_source = 'HISTORY_PNL'`;
    } else {
      await sql`DELETE FROM transactions WHERE account_id = ${accountId} AND record_source = 'HISTORY_PNL'`;
    }
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 4-3. 🗑️ 完全清空特定帳戶所有資料 (含快照)
export async function clearAccountData(accountId: number) {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    if (accountId === 0) {
      await sql`DELETE FROM transactions`;
      await sql`DELETE FROM asset_snapshots`;
    } else {
      await sql`DELETE FROM transactions WHERE account_id = ${accountId}`;
      await sql`DELETE FROM asset_snapshots WHERE account_id = ${accountId}`;
    }

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function clearAllTransactions(accountId: number) {
  return await clearAccountData(accountId);
}

// 5. 記錄總資產快照
export async function recordAssetSnapshot(accountId: number, totalValue: number, totalCost: number) {
  try {
    const sql = neon(process.env.DATABASE_URL!);

    await sql`
      CREATE TABLE IF NOT EXISTS asset_snapshots (
        id SERIAL PRIMARY KEY,
        account_id INT NOT NULL,
        record_date DATE NOT NULL DEFAULT CURRENT_DATE,
        total_value NUMERIC NOT NULL,
        total_cost NUMERIC NOT NULL
      )
    `;

    const today = new Date().toISOString().split('T')[0];

    await sql`
      INSERT INTO asset_snapshots (account_id, record_date, total_value, total_cost)
      VALUES (${accountId}, ${today}, ${totalValue}, ${totalCost})
      ON CONFLICT DO NOTHING
    `;

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 6. 🎁 匯出配息紀錄備份 (精準版：過濾 0 元垃圾資料，並格式化日期)
export async function exportDividends(accountId: number) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    
    // 🌟 只抓取 CASH_DIVIDEND 且 total_amount 嚴格大於 0 的真正配息
    const rows = accountId === 0
      ? await sql`
          SELECT account_id, symbol, symbol_name, trade_date, total_amount 
          FROM transactions 
          WHERE action_type = 'CASH_DIVIDEND' 
            AND total_amount > 0 
          ORDER BY trade_date DESC
        `
      : await sql`
          SELECT account_id, symbol, symbol_name, trade_date, total_amount 
          FROM transactions 
          WHERE account_id = ${accountId} 
            AND action_type = 'CASH_DIVIDEND' 
            AND total_amount > 0 
          ORDER BY trade_date DESC
        `;

    // 格式化日期與金額，並將 record_source 統一定義為 DIVIDEND
    const cleanData = rows.map((r: any) => ({
      account_id: Number(r.account_id),
      symbol: String(r.symbol),
      symbol_name: r.symbol_name || null,
      trade_date: new Date(r.trade_date).toISOString().split('T')[0],
      total_amount: Number(r.total_amount),
      record_source: 'DIVIDEND'
    }));

    return { success: true, data: cleanData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 7. 🎁 還原配息紀錄備份 (批次寫回)
export async function restoreDividends(dividends: any[]) {
  try {
    if (!dividends || dividends.length === 0) return { success: true };

    const sql = neon(process.env.DATABASE_URL!);

    const queries = dividends.map((div) => sql`
      INSERT INTO transactions (account_id, symbol, symbol_name, action_type, trade_date, shares, price, total_amount, record_source)
      VALUES (
        ${Number(div.account_id)}, 
        ${String(div.symbol)}, 
        ${div.symbol_name ? String(div.symbol_name) : null}, 
        'CASH_DIVIDEND', 
        ${div.trade_date}, 
        0, 
        0, 
        ${Number(div.total_amount)}, 
        ${div.record_source || 'DIVIDEND'}
      )
    `);

    await sql.transaction(queries);

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}