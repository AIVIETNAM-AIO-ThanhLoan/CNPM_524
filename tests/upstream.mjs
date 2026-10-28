// Deterministic external-service contracts for disposable integration servers only.
if (process.env.CNPM_TEST_UPSTREAM === 'true') {
    const original = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
        const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
        const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
        if (url.hostname === 'api.vietqr.io') {
            if (url.pathname === '/v2/banks') return json({ code: '00', data: [
                { bin: '970422', code: 'MB', shortName: 'MBBank', name: 'Ngân hàng Quân đội' },
                { bin: '970436', code: 'VCB', shortName: 'Vietcombank', name: 'Ngân hàng Ngoại thương' },
            ] });
            return json({ apps: [{ appId: 'mb', appName: 'MB Bank', autofill: 1 }, { appId: 'vcb', appName: 'VCB Digibank', autofill: 0 }] });
        }
        if (url.hostname === 'open.er-api.com') {
            const base = url.pathname.split('/').at(-1);
            if (base === 'ZZZ') return json({ result: 'error' }, 503);
            if (base === 'BAD') return json({ result: 'success', rates: { VND: -1 } });
            return json({ result: 'success', rates: { USD: 1, VND: 25000, EUR: 0.92, JPY: 150 } });
        }
        return original(input, init);
    };
}
