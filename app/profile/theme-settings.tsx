'use client';

import { useState, useSyncExternalStore } from 'react';
import { ArrowDownLeft, ArrowUpRight, Check, Palette, Plus, Wallet } from 'lucide-react';
import { DEFAULT_THEME, readTheme, saveTheme, subscribeTheme, THEMES, type Theme } from '../lib/theme';

export default function ThemeSettings() {
    const selected = useSyncExternalStore(subscribeTheme, readTheme, () => DEFAULT_THEME);
    const activeTheme = THEMES.find(theme => theme.id === selected) || THEMES[0];
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    function select(theme: Theme, name: string) {
        try {
            saveTheme(theme);
            setError('');
            setNotice(`Đã chọn màu ${name.toLocaleLowerCase('vi-VN')}.`);
        } catch {
            setNotice('');
            setError('Không lưu được màu giao diện. Vui lòng kiểm tra quyền lưu trữ của trình duyệt.');
        }
    }

    return <section className="card settings-card theme-settings" aria-labelledby="theme-settings-title">
        <div className="theme-heading">
            <span className="theme-heading-icon" aria-hidden="true"><Palette size={21} strokeWidth={1.7} /></span>
            <div><h2 id="theme-settings-title" className="settings-title">Màu giao diện</h2></div>
        </div>
        <div className="theme-preview" role="img" aria-label={`Xem trước giao diện màu ${activeTheme.name.toLocaleLowerCase('vi-VN')}`}>
            <div className="theme-preview-caption"><span>Xem trước</span><span className="theme-current"><i />{activeTheme.name}</span></div>
            <div className="theme-preview-app" aria-hidden="true">
                <div className="theme-preview-top"><span className="theme-preview-logo"><Wallet size={15} strokeWidth={1.8} /></span><strong>Ting Ting</strong><span className="theme-preview-dots">•••</span></div>
                <div className="theme-preview-balance"><div><span>Tổng số dư</span><strong>••• ••• <small>đ</small></strong></div><span className="theme-preview-add"><Plus size={18} /></span></div>
                <div className="theme-preview-stats"><span><i className="theme-preview-income"><ArrowDownLeft size={13} /></i>Thu nhập<span className="theme-preview-line" /></span><span><i className="theme-preview-expense"><ArrowUpRight size={13} /></i>Chi tiêu<span className="theme-preview-line" /></span></div>
            </div>
        </div>
        <div className="theme-palette-heading"><h3>Bảng màu</h3><span>6 sắc thái</span></div>
        <fieldset className="theme-options">
            <legend className="theme-sr-only">Chọn màu giao diện</legend>
            {THEMES.map(theme => <label key={theme.id} className="theme-option" data-theme={theme.id}>
                <input type="radio" name="app-theme" value={theme.id} checked={selected === theme.id} onChange={() => select(theme.id, theme.name)} />
                <span className="theme-option-content">
                    <span className="theme-swatch" aria-hidden="true"><Check size={16} strokeWidth={2.5} /></span>
                    <span className="theme-option-name">{theme.name}</span>
                </span>
            </label>)}
        </fieldset>
        {error && <p role="alert" className="theme-error">{error}</p>}
        <p role="status" className="theme-notice">{notice}</p>
    </section>;
}
