export type DefaultPreferences = { walletId: string; androidApp: string; iosApp: string };
const empty: DefaultPreferences = { walletId: '', androidApp: '', iosApp: '' };
export function readDefaults(userId: string): DefaultPreferences {
    try {
        const value = JSON.parse(localStorage.getItem(`cnpm-defaults:${userId}`) || '{}');
        return Object.fromEntries(Object.keys(empty).map(key => [key, typeof value?.[key] === 'string' ? value[key] : ''])) as DefaultPreferences;
    } catch { return { ...empty }; }
}
export function saveDefaults(userId: string, value: DefaultPreferences) {
    localStorage.setItem(`cnpm-defaults:${userId}`, JSON.stringify(value));
}

export function bankPlatform(): 'ios' | 'android' {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'ios' : 'android';
}
