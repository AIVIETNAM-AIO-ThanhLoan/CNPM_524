import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// Icon cho màn hình chính trên iPhone
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#7a0c2e',
          color: '#ffffff',
          fontSize: 88,
          fontWeight: 700,
        }}
      >
        TT
      </div>
    ),
    { ...size }
  );
}
