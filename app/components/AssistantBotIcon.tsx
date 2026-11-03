// Robot đeo tai nghe cho nút Trợ lý AI; chuyển động (chớp mắt, đèn ăng-ten) định nghĩa trong styles/home.css.
export default function AssistantBotIcon({ size = 44 }: { size?: number }) {
    return (
        <svg className="assistant-bot" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
            <defs>
                <linearGradient id="assistant-bot-bg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#5b8dee" />
                    <stop offset="1" stopColor="#2f5fd0" />
                </linearGradient>
            </defs>
            <circle cx="32" cy="32" r="32" fill="url(#assistant-bot-bg)" />
            <g fill="#fff">
                <line x1="32" y1="13" x2="32" y2="21" stroke="#fff" strokeWidth="2" />
                <circle className="assistant-bot-light" cx="32" cy="11" r="3.4" />
                <path d="M14 37v-4a18 16 0 0 1 36 0v4" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
                <rect x="9.5" y="31" width="7" height="13" rx="3.5" />
                <rect x="47.5" y="31" width="7" height="13" rx="3.5" />
                <path d="M13 44c0 6 4 9 11 9h3" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
                <ellipse cx="30.5" cy="53" rx="4.5" ry="2.8" />
                <ellipse cx="32" cy="22.5" rx="5.5" ry="3" />
                <rect x="18" y="22" width="28" height="22" rx="7" />
            </g>
            <g fill="#2f5fd0">
                <g className="assistant-bot-eyes">
                    <circle cx="26" cy="31.5" r="2.6" />
                    <circle cx="38" cy="31.5" r="2.6" />
                </g>
                <path d="M27.5 36.5h9a4.5 4.5 0 0 1-9 0z" />
            </g>
        </svg>
    );
}
