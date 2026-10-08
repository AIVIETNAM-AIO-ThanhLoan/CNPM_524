import { ReceiptText, Search, SlidersHorizontal } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import '../styles/history.css';

type Transaction = {
  id: string;
  title: string;
  time: string; // ví dụ: "19:36 - 07/10"
  amount: number; // dương là thu, âm là chi
  Icon: typeof ReceiptText;
};

// TODO: thay bằng dữ liệu từ database. Mảng rỗng nên trang hiện trạng thái trống.
const transactions: Transaction[] = [];
const monthLabel = 'Tháng 10/2026';

const formatMoney = (amount: number) => amount.toLocaleString('vi-VN') + 'đ';

export default function History() {
  const totalIncome = transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <div className="app-page">
      <header className="page-header history-header">
        <h1 className="page-title">Lịch sử</h1>
        <button type="button" className="icon-btn" aria-label="Lọc giao dịch">
          <SlidersHorizontal size={22} strokeWidth={1.8} />
        </button>
      </header>

      <label className="search-bar">
        <Search size={20} strokeWidth={1.8} />
        <input
          className="search-input"
          type="text"
          placeholder="Tìm kiếm giao dịch"
        />
      </label>

      <section className="card history-summary">
        <h2 className="history-summary-title">Tổng quan {monthLabel.toLowerCase()}</h2>
        <div className="summary-pair">
          <div className="stat-box">
            <span className="stat-label">Tổng thu</span>
            <p className="stat-amount text-income">{formatMoney(totalIncome)}</p>
          </div>
          <div className="stat-box">
            <span className="stat-label">Tổng chi</span>
            <p className="stat-amount text-expense">{formatMoney(totalExpense)}</p>
          </div>
        </div>
      </section>

      {transactions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <ReceiptText size={36} strokeWidth={1.6} />
          </div>
          <p className="empty-title">Chưa có giao dịch nào</p>
          <p className="empty-text">Các giao dịch bạn ghi sẽ hiển thị tại đây.</p>
        </div>
      ) : (
        <section className="history-group">
          <h3 className="history-group-title">{monthLabel}</h3>
          <div className="tx-list">
            {transactions.map(({ id, title, time, amount, Icon }) => (
              <div key={id} className="tx-item">
                <div className="tx-info">
                  <span className="tx-icon">
                    <Icon size={20} strokeWidth={1.8} />
                  </span>
                  <div>
                    <p className="tx-title">{title}</p>
                    <p className="tx-time">{time}</p>
                  </div>
                </div>
                <span
                  className={`tx-amount ${amount > 0 ? 'text-income' : 'text-expense'}`}
                >
                  {amount > 0 ? '+' : ''}
                  {formatMoney(amount)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <BottomNav />
    </div>
  );
}
