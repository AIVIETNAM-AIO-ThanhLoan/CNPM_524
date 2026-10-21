// Keep the sum of stored DECIMAL amounts exact, including cents.
export function sumBudgetAmounts(amounts: string[]): string {
    const total = amounts.reduce((sum, amount) => {
        const [whole, fraction = ''] = amount.split('.');
        return sum + BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, '0'));
    }, BigInt(0));
    return `${total / BigInt(100)}.${String(total % BigInt(100)).padStart(2, '0')}`;
}

export function formatBudgetMoney(amount: string): string {
    const [whole, fraction = '00'] = amount.split('.');
    return `${BigInt(whole).toLocaleString('vi-VN')}${fraction === '00' ? '' : `,${fraction.padEnd(2, '0')}`}đ`;
}
