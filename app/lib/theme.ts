export const THEMES = [
    { id: 'blue', name: 'Xanh dương' },
    { id: 'green', name: 'Xanh lá' },
    { id: 'purple', name: 'Tím' },
    { id: 'rose', name: 'Hồng' },
    { id: 'orange', name: 'Cam' },
    { id: 'slate', name: 'Xám' },
] as const;

export type Theme = (typeof THEMES)[number]['id'];
export const DEFAULT_THEME: Theme = 'blue';
export const THEME_STORAGE_KEY = 'tingting:theme';
const THEME_CHANGED = 'tingting:theme-changed';

export function isTheme(value: unknown): value is Theme {
    return THEMES.some(theme => theme.id === value);
}

export function readTheme(): Theme {
    try {
        const value = localStorage.getItem(THEME_STORAGE_KEY);
        return isTheme(value) ? value : DEFAULT_THEME;
    } catch { return DEFAULT_THEME; }
}

export function applyTheme(theme: Theme) {
    document.documentElement.dataset.theme = theme;
    const color = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
    document.querySelectorAll('meta[name="theme-color"]').forEach(meta => meta.setAttribute('content', color));
}

export function saveTheme(theme: Theme) {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyTheme(theme);
    window.dispatchEvent(new Event(THEME_CHANGED));
}

export function subscribeTheme(onChange: () => void) {
    function onStorage(event: StorageEvent) {
        if (event.key === THEME_STORAGE_KEY || event.key === null) onChange();
    }
    window.addEventListener(THEME_CHANGED, onChange);
    window.addEventListener('storage', onStorage);
    return () => {
        window.removeEventListener(THEME_CHANGED, onChange);
        window.removeEventListener('storage', onStorage);
    };
}

// Apply the saved palette before hydration so a reload keeps the selected colors.
export const themeInitScript = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});document.documentElement.dataset.theme=${JSON.stringify(THEMES.map(theme => theme.id))}.includes(t)?t:${JSON.stringify(DEFAULT_THEME)}}catch{document.documentElement.dataset.theme=${JSON.stringify(DEFAULT_THEME)}}`;
