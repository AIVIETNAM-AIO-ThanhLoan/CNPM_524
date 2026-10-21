import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

// Hàm tạo kết nối trực tiếp đến MySQL
async function getDbConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cnpm_524',
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    if (action === 'rate') {
      const from = searchParams.get('from') || 'USD';
      const to = searchParams.get('to') || 'VND';
      const res = await fetch(`https://open.er-api.com/v6/latest/${from}`, { next: { revalidate: 3600 } });
      const data = await res.json();
      
      if (data.result === 'success') {
        return NextResponse.json({ success: true, rate: data.rates[to] });
      }
      return NextResponse.json({ error: 'Lỗi lấy tỷ giá' }, { status: 400 });
    } 
    
    if (action === 'history') {
      const db = await getDbConnection();
      const [rows] = await db.query('SELECT * FROM exchange_history ORDER BY created_at DESC LIMIT 5');
      await db.end(); // Đóng kết nối
      return NextResponse.json({ success: true, history: rows });
    }

    return NextResponse.json({ error: 'Yêu cầu không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    console.error("LỖI BACKEND:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { from, to, amount, result, rate } = body;

    const db = await getDbConnection();
    await db.query(
      'INSERT INTO exchange_history (from_currency, to_currency, amount, result, rate_used) VALUES (?, ?, ?, ?, ?)',
      [from, to, amount, result, rate]
    );
    await db.end(); // Đóng kết nối

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("LỖI LƯU DB:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}