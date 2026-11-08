'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { applyTheme, readTheme, subscribeTheme } from '../lib/theme';

export default function ThemeRuntime() {
    const pathname = usePathname();
    useEffect(() => {
        const refresh = () => applyTheme(readTheme());
        refresh();
        return subscribeTheme(refresh);
    }, [pathname]);
    return null;
}
