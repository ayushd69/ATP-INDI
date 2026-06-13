import dns from 'dns/promises';

const host = '_mongodb._tcp.cluster0.ldvtkqc.mongodb.net';

(async () => {
    try {
        const res = await dns.resolveSrv(host);
        console.log('resolveSrv result:', res);
    } catch (err) {
        console.error('resolveSrv error:', err);
    }
})();
