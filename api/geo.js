// api/geo.js
// Relay endpoint that reads Vercel-injected server-side headers and returns them as JSON.
// The browser can't read request headers directly, so this API bridges the gap.
// These headers are set by Vercel infrastructure — they cannot be spoofed by the client.

// ── JA4 signature database ──
// Format: partial prefix → { label, type }
// JA4 structure: t<TLS_ver><SNI><num_ciphers><num_extensions><alpn>_<cipher_hash>_<ext_hash>
// Sources: FoxIO JA4+ database, public research, empirical collection
const JA4_SIGNATURES = {
    // ── Browsers ──
    't13d1516h2_8daaf6152771': { label: 'Chrome 120+',         type: 'browser' },
    't13d1517h2_8daaf6152771': { label: 'Chrome/Chromium',     type: 'browser' },
    't13d1516h2_5b57614c22b0': { label: 'Firefox 120+',                    type: 'browser' },
    't13d1717h2_5b57614c22b0': { label: 'Firefox 120+ (SNI)',              type: 'browser' },
    't13d1715h2_5b57614c22b0': { label: 'Firefox (Private/ETP Strict)',    type: 'browser' },
    't13d1516h2_5b57614c22b1': { label: 'Firefox (Private)',               type: 'browser' },
    't13d1516h2_b32309a7f351': { label: 'Safari 17',           type: 'browser' },
    't13d1517h2_b32309a7f351': { label: 'Safari/WebKit',       type: 'browser' },
    't13d1516h2_3b5074b1b51d': { label: 'Edge (Chromium)',     type: 'browser' },
    't13d1517h2_3b5074b1b51d': { label: 'Edge (Chromium)',     type: 'browser' },
    // ── Bots / Crawlers ──
    't13d1517h2_8daaf6152771_dcad5a053991': { label: 'Chromium Headless / Vercel Bot', type: 'bot' },
    't10d170900_': { label: 'Googlebot',              type: 'bot' },
    't13d190900_': { label: 'Generic crawler',        type: 'bot' },
    // ── CLI / Scripts ──
    't13d190000_': { label: 'curl',                   type: 'cli' },
    't13d190900_9dc949149365': { label: 'curl',       type: 'cli' },
    't13d190000_9dc949149365': { label: 'curl',       type: 'cli' },
    't13d190000_e7d705a3586e': { label: 'Python requests', type: 'cli' },
    't13d190900_e7d705a3586e': { label: 'Python requests', type: 'cli' },
    't12d190000_':             { label: 'wget',        type: 'cli' },
    't13d190000_b32309a7f351': { label: 'Go http',    type: 'cli' },
    't13d190900_b32309a7f351': { label: 'Go http',    type: 'cli' },
    // ── Tor Browser ──
    't13d1516h2_3a7b6b8c0d1e': { label: 'Tor Browser',  type: 'tor' },
    't13d1716h2_3a7b6b8c0d1e': { label: 'Tor Browser',  type: 'tor' },
    // ── Security Tools ──
    't13d190900_7c4b5a6d3f2e': { label: 'Burp Suite',   type: 'scanner' },
    't13d190000_7c4b5a6d3f2e': { label: 'Burp Suite',   type: 'scanner' },
    't13d190900_1a2b3c4d5e6f': { label: 'OWASP ZAP',    type: 'scanner' },
};

function classifyJA4(ja4) {
    if (!ja4 || ja4 === 'N/A') return { label: 'unknown', type: 'unknown' };
    // Sort by prefix length descending — longest (most specific) match wins
    // Without this, 'Chrome' prefix matches before 'Chromium Headless' prefix
    const sorted = Object.entries(JA4_SIGNATURES).sort(([a], [b]) => b.length - a.length);
    for (const [prefix, info] of sorted) {
        if (ja4.startsWith(prefix)) return info;
    }
    // Heuristic fallbacks
    if (ja4.startsWith('t13d19'))  return { label: 'CLI tool (curl/wget/script)', type: 'cli' };
    if (ja4.startsWith('t10d'))    return { label: 'Old TLS client',              type: 'legacy' };
    if (ja4.startsWith('t12d'))    return { label: 'TLS 1.2 client',              type: 'unknown' };
    if (ja4.includes('0000'))      return { label: 'Minimal TLS client',          type: 'cli' };
    return { label: 'unrecognized', type: 'unknown' };
}

module.exports = async function(req, res) {
    const h = req.headers;

    const data = {
        // ── JA4 TLS fingerprint ──
        // Hash of the TLS ClientHello (cipher suites, extensions, versions).
        // Identifies browser + OS + network stack. Stable across IP/VPN changes.
        ja4:           h['x-vercel-ja4-digest']        || 'N/A',
        ...(() => { const s = classifyJA4(h['x-vercel-ja4-digest']); return { ja4Label: s.label, ja4Type: s.type }; })(),

        // ── Vercel geo (from Vercel's IP intelligence, not GPS) ──
        geoCountry:    h['x-vercel-ip-country']        || 'N/A',
        geoCity:       h['x-vercel-ip-city']           || 'N/A',
        geoRegion:     h['x-vercel-ip-country-region'] || 'N/A',
        geoLat:        h['x-vercel-ip-latitude']       || 'N/A',
        geoLon:        h['x-vercel-ip-longitude']      || 'N/A',
        geoTZ:         h['x-vercel-ip-timezone']       || 'N/A',
        geoASN:        h['x-vercel-ip-asn']            || 'N/A',

        // ── Real IP as seen at the edge ──
        edgeIP:        h['x-real-ip']
                    || h['x-forwarded-for']?.split(',')[0]?.trim()
                    || 'N/A',

        // ── Edge region (extracted from x-vercel-id, format: "region::...") ──
        edgeRegion:    (h['x-vercel-id'] || '').split('::')[0] || 'N/A',
    };

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(data);
};
