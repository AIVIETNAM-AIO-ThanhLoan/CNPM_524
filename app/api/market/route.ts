import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  try {
    if (type === 'currency') {
      const from = searchParams.get('from') || 'USD';
      const to = searchParams.get('to') || 'VND';
      const res = await fetch(`https://open.er-api.com/v6/latest/${from}`, { next: { revalidate: 3600 } });
      const data = await res.json();
      
      if (data.result === 'success') {
        return NextResponse.json({ success: true, rate: data.rates[to], updatedAt: data.time_last_update_utc });
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
  } catch (error) {
    console.error("Lỗi API:", error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}