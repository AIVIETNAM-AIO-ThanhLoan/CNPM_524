'use client';

import '../styles/admin.css';

import { useState } from 'react';
import {
  Users,
  CreditCard,
  RefreshCw,
  ShieldCheck,
  Activity,
  Database,
  Bell,
  Search,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Server
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [syncingRate, setSyncingRate] = useState(false);
  const [backupRunning, setBackupRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'currencies' | 'users' | 'backups'>('overview');

  // Giả lập kích hoạt đồng bộ tỷ giá
  const handleSyncExchangeRates = () => {
    setSyncingRate(true);
    setTimeout(() => {
      setSyncingRate(false);
      alert('Đồng bộ tỷ giá mới nhất từ ExchangeRate-API thành công!');
    }, 1500);
  };

  // Giả lập tạo bản sao lưu dữ liệu
  const handleTriggerBackup = () => {
    setBackupRunning(true);
    setTimeout(() => {
      setBackupRunning(false);
      alert('Đã tạo thành công bản sao lưu cơ sở dữ liệu PostgreSQL!');
    }, 2000);
  };

  return (
    <div className="admin-page min-h-screen bg-white flex flex-col font-sans">
      {/* Header Quản trị */}
      <header className="bg-wine text-white border-b border-wine sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-burgundy rounded-lg text-wine">
              <ShieldCheck className="w-5 h-5 font-bold" />
            </div>
            <div>
              <span className="font-bold text-base tracking-wide">Admin Portal</span>
              <span className="ml-2 text-xs bg-rose/20 text-rose px-2 py-0.5 rounded-full font-medium border border-rose/30">
                Microfinance
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm kiếm người dùng, giao dịch..."
                className="bg-wine text-xs text-line pl-9 pr-4 py-2 rounded-lg border border-wine focus:outline-none focus:border-burgundy w-64"
              />
            </div>
            <button className="p-2 text-muted hover:text-white rounded-lg hover:bg-wine relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-burgundy rounded-full"></span>
            </button>
            <div className="h-6 w-px bg-wine"></div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-burgundy rounded-full flex items-center justify-center font-bold text-xs">
                AD
              </div>
              <span className="text-xs font-medium text-line hidden sm:inline">System Admin</span>
            </div>
          </div>
        </div>
      </header>

      {/* Điều hướng Tab */}
      <div className="admin-tabs bg-white border-b border-line shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-8 text-sm font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 border-b-2 transition-all ${
              activeTab === 'overview'
                ? 'border-burgundy text-burgundy'
                : 'border-transparent text-muted hover:text-wine'
            }`}
          >
            Tổng quan hệ thống
          </button>
          <button
            onClick={() => setActiveTab('currencies')}
            className={`py-4 border-b-2 transition-all ${
              activeTab === 'currencies'
                ? 'border-burgundy text-burgundy'
                : 'border-transparent text-muted hover:text-wine'
            }`}
          >
            Quản lý Tỷ giá
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-4 border-b-2 transition-all ${
              activeTab === 'users'
                ? 'border-burgundy text-burgundy'
                : 'border-transparent text-muted hover:text-wine'
            }`}
          >
            Quản lý Người dùng
          </button>
          <button
            onClick={() => setActiveTab('backups')}
            className={`py-4 border-b-2 transition-all ${
              activeTab === 'backups'
                ? 'border-burgundy text-burgundy'
                : 'border-transparent text-muted hover:text-wine'
            }`}
          >
            Sao lưu & Khôi phục
          </button>
        </div>
      </div>

      {/* Nội dung chính */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* TAB 1: TỔNG QUAN HỆ THỐNG */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Thẻ chỉ số tổng quan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white p-5 rounded-xl border border-line shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted uppercase tracking-wider">Tổng người dùng</p>
                  <h3 className="text-2xl font-bold text-wine mt-1">1,248</h3>
                  <span className="text-xs text-burgundy font-medium inline-flex items-center mt-1">
                    <TrendingUp className="w-3 h-3 mr-1" /> +12% tháng này
                  </span>
                </div>
                <div className="p-3 bg-petal rounded-xl text-burgundy">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-line shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted uppercase tracking-wider">Tổng Giao dịch Sổ cái</p>
                  <h3 className="text-2xl font-bold text-wine mt-1">45,890</h3>
                  <span className="text-xs text-burgundy font-medium inline-flex items-center mt-1">
                    <TrendingUp className="w-3 h-3 mr-1" /> +8.4% tuần này
                  </span>
                </div>
                <div className="p-3 bg-petal rounded-xl text-rose">
                  <CreditCard className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-line shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted uppercase tracking-wider">Độ sẵn sàng (Uptime)</p>
                  <h3 className="text-2xl font-bold text-wine mt-1">99.98%</h3>
                  <span className="text-xs text-burgundy font-medium inline-flex items-center mt-1">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Đạt SLA 99.9%
                  </span>
                </div>
                <div className="p-3 bg-petal rounded-xl text-burgundy">
                  <Activity className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-line shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted uppercase tracking-wider">Cảnh báo Ngân sách</p>
                  <h3 className="text-2xl font-bold text-wine mt-1">182</h3>
                  <span className="text-xs text-amber-600 font-medium inline-flex items-center mt-1">
                    <AlertTriangle className="w-3 h-3 mr-1" /> 14 chạm ngưỡng 100%
                  </span>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                  <Bell className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Trạng thái Services & Worker */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border border-line shadow-sm lg:col-span-2">
                <h3 className="text-sm font-bold text-wine uppercase tracking-wider mb-4 flex items-center justify-between">
                  <span>Trạng thái Microservices & Workers</span>
                  <span className="text-xs text-muted font-normal">Cập nhật lúc: 08:20:00</span>
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 bg-petal rounded-lg border border-petal">
                    <div className="flex items-center space-x-3">
                      <Server className="w-5 h-5 text-burgundy" />
                      <div>
                        <p className="text-sm font-semibold text-wine">Transaction Ledger API (M2)</p>
                        <p className="text-xs text-muted">Xử lý bút toán Nợ/Có sổ cái kép</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-blush text-burgundy text-xs font-semibold rounded-full flex items-center">
                      <span className="w-2 h-2 bg-burgundy rounded-full mr-1.5 animate-pulse"></span>
                      Healthy (42ms)
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-petal rounded-lg border border-petal">
                    <div className="flex items-center space-x-3">
                      <RefreshCw className="w-5 h-5 text-rose" />
                      <div>
                        <p className="text-sm font-semibold text-wine">Currency Conversion Worker (M2)</p>
                        <p className="text-xs text-muted">Đồng bộ tỷ giá định kỳ 6 tiếng/lần</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-blush text-burgundy text-xs font-semibold rounded-full flex items-center">
                      <span className="w-2 h-2 bg-burgundy rounded-full mr-1.5 animate-pulse"></span>
                      Running
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-petal rounded-lg border border-petal">
                    <div className="flex items-center space-x-3">
                      <Bell className="w-5 h-5 text-amber-600" />
                      <div>
                        <p className="text-sm font-semibold text-wine">Budget Alert Service (M2)</p>
                        <p className="text-xs text-muted">Lắng nghe sự kiện chạm/vượt ngưỡng ngân sách</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-blush text-burgundy text-xs font-semibold rounded-full flex items-center">
                      <span className="w-2 h-2 bg-burgundy rounded-full mr-1.5 animate-pulse"></span>
                      Listening
                    </span>
                  </div>
                </div>
              </div>

              {/* Lịch sử sao lưu gần đây */}
              <div className="bg-white p-6 rounded-xl border border-line shadow-sm">
                <h3 className="text-sm font-bold text-wine uppercase tracking-wider mb-4">
                  Bản sao lưu DB gần nhất (M3)
                </h3>
                <div className="space-y-3">
                  <div className="p-3 bg-petal rounded-lg border border-petal flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Database className="w-4 h-4 text-burgundy" />
                      <div>
                        <p className="text-xs font-semibold text-wine">backup_20261006_0000.sql</p>
                        <p className="text-[10px] text-muted">Hôm nay - 00:00 AM (245 MB)</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-blush text-burgundy px-2 py-0.5 rounded font-medium">Thành công</span>
                  </div>

                  <div className="p-3 bg-petal rounded-lg border border-petal flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Database className="w-4 h-4 text-burgundy" />
                      <div>
                        <p className="text-xs font-semibold text-wine">backup_20261005_0000.sql</p>
                        <p className="text-[10px] text-muted">Hôm qua - 00:00 AM (242 MB)</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-blush text-burgundy px-2 py-0.5 rounded font-medium">Thành công</span>
                  </div>
                </div>

                <button
                  onClick={handleTriggerBackup}
                  disabled={backupRunning}
                  className="w-full mt-4 py-2 px-4 bg-wine hover:bg-wine text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>{backupRunning ? 'Đang tạo bản sao lưu...' : 'Tạo bản sao lưu ngay'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: QUẢN LÝ TỶ GIÁ */}
        {activeTab === 'currencies' && (
          <div className="bg-white p-6 rounded-xl border border-line shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-wine">Bảng Tỷ giá ngoại tệ hiện tại</h3>
                <p className="text-xs text-muted mt-0.5">Nguồn đồng bộ: ExchangeRate-API (M2 / SR-F10)</p>
              </div>
              <button
                onClick={handleSyncExchangeRates}
                disabled={syncingRate}
                className="py-2 px-4 bg-burgundy hover:bg-wine text-white text-xs font-medium rounded-lg shadow-sm transition-all flex items-center space-x-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingRate ? 'animate-spin' : ''}`} />
                <span>{syncingRate ? 'Đang đồng bộ...' : 'Đồng bộ tỷ giá ngay'}</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-line rounded-lg">
              <table className="w-full text-left text-xs text-muted">
                <thead className="bg-petal border-b border-line text-wine uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Cặp Tiền Tệ</th>
                    <th className="py-3 px-4">Tỷ giá Quy đổi</th>
                    <th className="py-3 px-4">Đồng tiền cơ sở</th>
                    <th className="py-3 px-4">Nguồn dữ liệu</th>
                    <th className="py-3 px-4">Cập nhật lần cuối</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-petal">
                    <td className="py-3 px-4 font-bold text-wine">USD / VND</td>
                    <td className="py-3 px-4 font-mono font-semibold text-burgundy">25,410.00</td>
                    <td className="py-3 px-4">VND</td>
                    <td className="py-3 px-4">ExchangeRate-API</td>
                    <td className="py-3 px-4">2026-10-06 06:00:00</td>
                    <td className="py-3 px-4 text-right">
                      <button className="text-burgundy hover:underline font-medium">Chỉnh sửa</button>
                    </td>
                  </tr>
                  <tr className="hover:bg-petal">
                    <td className="py-3 px-4 font-bold text-wine">EUR / VND</td>
                    <td className="py-3 px-4 font-mono font-semibold text-burgundy">27,850.50</td>
                    <td className="py-3 px-4">VND</td>
                    <td className="py-3 px-4">ExchangeRate-API</td>
                    <td className="py-3 px-4">2026-10-06 06:00:00</td>
                    <td className="py-3 px-4 text-right">
                      <button className="text-burgundy hover:underline font-medium">Chỉnh sửa</button>
                    </td>
                  </tr>
                  <tr className="hover:bg-petal">
                    <td className="py-3 px-4 font-bold text-wine">JPY / VND</td>
                    <td className="py-3 px-4 font-mono font-semibold text-burgundy">168.20</td>
                    <td className="py-3 px-4">VND</td>
                    <td className="py-3 px-4">ExchangeRate-API</td>
                    <td className="py-3 px-4">2026-10-06 06:00:00</td>
                    <td className="py-3 px-4 text-right">
                      <button className="text-burgundy hover:underline font-medium">Chỉnh sửa</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: QUẢN LÝ NGƯỜI DÙNG */}
        {activeTab === 'users' && (
          <div className="bg-white p-6 rounded-xl border border-line shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-wine">Danh sách Tài khoản Người dùng</h3>
                <p className="text-xs text-muted mt-0.5">Quản lý phân quyền và kiểm tra trạng thái 2FA (UR-F10 / SR-F01)</p>
              </div>
              <button className="py-2 px-4 bg-burgundy text-white text-xs font-medium rounded-lg shadow-sm hover:bg-wine">
                + Thêm Người dùng mới
              </button>
            </div>

            <div className="overflow-x-auto border border-line rounded-lg">
              <table className="w-full text-left text-xs text-muted">
                <thead className="bg-petal border-b border-line text-wine uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Tên người dùng</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4">Xác thực 2FA</th>
                    <th className="py-3 px-4">Ngày tạo</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-petal">
                    <td className="py-3 px-4 font-mono text-muted">101</td>
                    <td className="py-3 px-4 font-semibold text-wine">Thanh Loan (M3)</td>
                    <td className="py-3 px-4">loan.db@microfinance.com</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-blush text-burgundy rounded font-semibold text-[10px]">Đã bật</span>
                    </td>
                    <td className="py-3 px-4">2026-09-15</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button className="text-rose hover:underline">Sửa</button>
                      <button className="text-danger hover:underline">Khóa</button>
                    </td>
                  </tr>
                  <tr className="hover:bg-petal">
                    <td className="py-3 px-4 font-mono text-muted">102</td>
                    <td className="py-3 px-4 font-semibold text-wine">Hoàng Anh (M1)</td>
                    <td className="py-3 px-4">anh.ui@microfinance.com</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-petal text-muted rounded font-semibold text-[10px]">Chưa bật</span>
                    </td>
                    <td className="py-3 px-4">2026-09-18</td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button className="text-rose hover:underline">Sửa</button>
                      <button className="text-danger hover:underline">Khóa</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: SAO LƯU & KHÔI PHỤC */}
        {activeTab === 'backups' && (
          <div className="bg-white p-6 rounded-xl border border-line shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-bold text-wine">Quản lý Sao lưu & Khôi phục Cơ sở dữ liệu (M3)</h3>
              <p className="text-xs text-muted mt-0.5">Đảm bảo an toàn sổ cái kép và khôi phục khi có sự cố (SR-F24 / SR-F25)</p>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Lưu ý quan trọng cho Vận hành (M3/M4):</p>
                <p className="mt-0.5">Việc khôi phục dữ liệu sẽ đưa cơ sở dữ liệu về đúng trạng thái bản sao lưu được chọn. Luôn chạy khôi phục thử trên môi trường tách biệt trước khi áp dụng.</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-petal rounded-lg border border-line flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-wine">Bản sao lưu Tự động - 2026-10-06 00:00:00</p>
                  <p className="text-xs text-muted mt-0.5">Dung lượng: 245.8 MB • PostgreSQL 15 Dump</p>
                </div>
                <div className="flex space-x-3">
                  <button className="px-3 py-1.5 bg-line hover:bg-line text-wine text-xs font-semibold rounded">
                    Tải về (.sql)
                  </button>
                  <button className="px-3 py-1.5 bg-danger hover:bg-danger text-white text-xs font-semibold rounded">
                    Khôi phục (Restore)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}