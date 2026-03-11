// api/honeypot.js
// Honeypot endpoint — nenhum humano navegando normalmente jamais acessa essas rotas.
// Qualquer hit aqui é garantidamente um bot, scanner ou analista automatizado.
// Rotas configuradas no vercel.json: /api/admin, /wp-login, /.env, /wp-admin, etc.

module.exports = async function(req, res) {
    const WEBHOOK = process.env.DISCORD_WEBHOOK_URL;

    const ip     = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
                || req.headers['x-real-ip']
                || 'N/A';
    const ua     = req.headers['user-agent'] || 'N/A';
    const path   = req.query?._path || req.url || 'N/A';  // _path = original path before rewrite
    const method = req.method || 'GET';
    const ja4    = req.headers['x-vercel-ja4-digest'] || 'N/A';
    const geo    = {
        country: req.headers['x-vercel-ip-country']        || 'N/A',
        city:    req.headers['x-vercel-ip-city']           || 'N/A',
        region:  req.headers['x-vercel-ip-country-region'] || 'N/A',
        asn:     req.headers['x-vercel-ip-asn']            || 'N/A',
        tz:      req.headers['x-vercel-ip-timezone']       || 'N/A',
    };

    // Classify what kind of scanner based on path
    const SCANNER_PATTERNS = {
        '/wp-login':          '🟠 WordPress scanner',
        '/wp-admin':          '🟠 WordPress scanner',
        '/xmlrpc.php':        '🟠 WordPress XML-RPC exploit',
        '/api/admin':         '🔴 Admin panel probe',
        '/.env':              '🔴 Environment file leak attempt',
        '/.git':              '🔴 Git repo exposure probe',
        '/phpmyadmin':        '🟠 phpMyAdmin scanner',
        '/admin':             '🟠 Generic admin probe',
        '/login':             '🟡 Login page probe',
        '/config.php':        '🔴 Config file leak attempt',
        '/backup':            '🟡 Backup file probe',
        '/shell':             '🔴 Webshell probe',
        '/eval':              '🔴 Code execution probe',
    };

    const scannerType = Object.entries(SCANNER_PATTERNS).find(([p]) => path.includes(p))?.[1]
        || '🟡 Unknown probe';

    if (WEBHOOK) {
        const embed = {
            title: '🍯 HONEYPOT — Bot/Scanner Detectado',
            color: 0xe74c3c,
            fields: [
                { name: '🚨 Tipo de scanner',  value: scannerType,                        inline: false },
                { name: '🔗 Path acessado',    value: `\`${path}\``,                      inline: true  },
                { name: '📡 Método',           value: method,                             inline: true  },
                { name: '🌐 IP',               value: ip,                                 inline: true  },
                { name: '🌍 Localização',      value: `${geo.city}, ${geo.region}, ${geo.country}`, inline: true },
                { name: '🏢 ASN',              value: geo.asn,                            inline: true  },
                { name: '🕐 Timezone',         value: geo.tz,                             inline: true  },
                { name: '🔐 JA4 TLS',          value: `\`${ja4}\``,                       inline: false },
                { name: '🖥 User-Agent',        value: ua.slice(0, 200),                   inline: false },
            ],
            footer: { text: 'Honeypot — rota não divulgada acessada automaticamente' },
            timestamp: new Date().toISOString(),
        };

        await fetch(WEBHOOK, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ embeds: [embed] }),
        }).catch(() => {});
    }

    // Respond like a real server to not tip off the scanner
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('X-Powered-By', 'PHP/7.4.3'); // fake header to seem legit
    return res.status(403).send('<!DOCTYPE html><html><head><title>403 Forbidden</title></head><body><h1>Forbidden</h1><p>You don\'t have permission to access this resource.</p></body></html>');
};
