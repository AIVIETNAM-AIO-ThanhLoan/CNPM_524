import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Chi Tiêu',
    short_name: 'Chi Tiêu',
    description: 'Quản lý thu chi cá nhân',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#7a0c2e',
    lang: 'vi',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
