import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // 'currency' hoặc 'gold'

  try {
    // ==========================================
    // 1. API TỶ GIÁ TIỀN TỆ (Dùng open.er-api.com)
    // ==========================================
    if (type === 'currency') {
      const from = searchParams.get('from') || 'USD';
      const to = searchParams.get('to') || 'VND';
      if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to)) return NextResponse.json({ error: 'Mã tiền tệ không hợp lệ.' }, { status: 400 });
      
      const res = await fetch(`https://open.er-api.com/v6/latest/${from}`, { 
        next: { revalidate: 3600 }, signal: AbortSignal.timeout(10000)
      });
      const data = await res.json();
      
      if (res.ok && data.result === 'success' && typeof data.rates?.[to] === 'number' && Number.isFinite(data.rates[to]) && data.rates[to] > 0) {
        const rate = data.rates[to];
        return NextResponse.json({ success: true, rate, updatedAt: data.time_last_update_utc });
      }
      return NextResponse.json({ error: 'Không lấy được tỷ giá' }, { status: 400 });
    } 
    
    // ==========================================
    // 2. API GIÁ VÀNG (Giả lập dữ liệu thời gian thực)
    // ==========================================
    if (type === 'gold') {
      // Vì API giá vàng thật thường mất phí, mình giả lập dữ liệu chuẩn xác
      const goldPrices = [
        { id: 1, brand: 'SJC', type: 'Vàng miếng 1L', buy: 79900000, sell: 82500000 },
        { id: 2, brand: 'DOJI', type: 'Nhẫn tròn 9999', buy: 74800000, sell: 76500000 },
        { id: 3, brand: 'PNJ', type: 'Vàng 24K (1 chỉ)', buy: 7500000, sell: 7680000 },
        { id: 4, brand: 'Bảo Tín Minh Châu', type: 'Nhẫn tròn trơn', buy: 74900000, sell: 76400000 },
      ];
      
      return NextResponse.json({ 
        success: true, 
        prices: goldPrices,
        simulated: true,
        updatedAt: null
      });
    }

    return NextResponse.json({ error: 'Yêu cầu không hợp lệ' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
