import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  try {
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
    
    if (type === 'gold') {
      const res = await fetch('https://vang.today/api/prices', {
        next: { revalidate: 300 },
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      const data = await res.json();

      if (data.success && data.prices) {
        // Chuyển object prices thành mảng
        const goldPrices = Object.entries(data.prices)
          // Lọc các loại vàng phổ biến
          .filter(([code]) => ['SJL1L10', 'DOHNL', 'PQHNVM'].includes(code))
          .map(([code, item]: [string, any], index: number) => {
            let brand = 'Vàng';
            let typeName = item.name;

            if (code === 'SJL1L10') { brand = 'SJC'; typeName = 'Vàng miếng 1L'; }
            if (code === 'DOHNL') { brand = 'DOJI'; typeName = 'Nhẫn tròn Hà Nội'; }
            if (code === 'PQHNVM') { brand = 'PNJ'; typeName = 'Vàng miếng Hà Nội'; }

            return {
              id: index + 1,
              brand: brand,
              type: typeName,
              buy: item.buy,
              sell: item.sell,
            };
          });

        // API mới trả về timestamp và time, không còn current_time
        const updatedAt = data.time 
          ? `${data.time} - ${data.date}` 
          : new Date().toLocaleTimeString('vi-VN');

        return NextResponse.json({ 
          success: true, 
          prices: goldPrices, 
          updatedAt: updatedAt
        });
      }
      
      return NextResponse.json({ error: 'Không lấy được giá vàng' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Yêu cầu không hợp lệ' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
