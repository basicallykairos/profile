// api/asn-classify.js
// Classifies an ASN against known lists: VPN providers, datacenters, Tor, residential.
// Called from the frontend with ?asn=AS12345
// Returns a JSON with provider name, category, and risk level.

// ── ASN database ──
// Sources: public ASN lists, VPN provider ASNs, datacenter CIDRs research
const ASN_DB = {
    // ── VPN Providers ──
    'AS9009':   { name: 'M247 (VPN backbone)',     category: 'vpn',        risk: 'high' },
    'AS20473':  { name: 'Choopa/Vultr',            category: 'vpn',        risk: 'high' },
    'AS54825':  { name: 'Packet.net/Equinix Metal',category: 'datacenter', risk: 'medium' },
    'AS19551':  { name: 'Incapsula (CDN/proxy)',   category: 'proxy',      risk: 'medium' },
    'AS60068':  { name: 'CDN77',                   category: 'proxy',      risk: 'medium' },
    'AS212238': { name: 'Mullvad VPN',             category: 'vpn',        risk: 'high' },
    'AS39351':  { name: '31173 Services (Mullvad)',category: 'vpn',        risk: 'high' },
    'AS9002':   { name: 'RETN (VPN backbone)',     category: 'vpn',        risk: 'medium' },
    'AS206070': { name: 'NordVPN',                 category: 'vpn',        risk: 'high' },
    'AS62331':  { name: 'ExpressVPN',              category: 'vpn',        risk: 'high' },
    'AS135190': { name: 'ExpressVPN Asia',         category: 'vpn',        risk: 'high' },
    'AS209854': { name: 'Surfshark VPN',           category: 'vpn',        risk: 'high' },
    'AS400107': { name: 'ProtonVPN',               category: 'vpn',        risk: 'high' },
    'AS62240':  { name: 'Clouvider (VPN hosting)', category: 'vpn',        risk: 'high' },
    'AS51396':  { name: 'Pfingo / VPN host',       category: 'vpn',        risk: 'high' },

    // ── Tor Exit Nodes (ASNs that host many exit nodes) ──
    'AS4224':   { name: 'Tor Project',             category: 'tor',        risk: 'critical' },
    'AS60729':  { name: 'Quintex Alliance (Tor)',  category: 'tor',        risk: 'critical' },
    'AS200052': { name: 'Tor exit hosting',        category: 'tor',        risk: 'critical' },
    'AS44194':  { name: 'Tor-friendly host',       category: 'tor',        risk: 'high' },

    // ── Cloud / Datacenter ──
    'AS16509':  { name: 'Amazon AWS',              category: 'datacenter', risk: 'medium' },
    'AS14618':  { name: 'Amazon AWS (US-East)',    category: 'datacenter', risk: 'medium' },
    'AS15169':  { name: 'Google Cloud',            category: 'datacenter', risk: 'medium' },
    'AS396982': { name: 'Google Cloud 2',          category: 'datacenter', risk: 'medium' },
    'AS8075':   { name: 'Microsoft Azure',         category: 'datacenter', risk: 'medium' },
    'AS14061':  { name: 'DigitalOcean',            category: 'datacenter', risk: 'medium' },
    'AS63949':  { name: 'Linode/Akamai',           category: 'datacenter', risk: 'medium' },
    'AS20940':  { name: 'Akamai CDN',              category: 'datacenter', risk: 'low' },
    'AS13335':  { name: 'Cloudflare',              category: 'cdn',        risk: 'low' },
    'AS16276':  { name: 'OVHcloud',                category: 'datacenter', risk: 'medium' },
    'AS24940':  { name: 'Hetzner',                 category: 'datacenter', risk: 'medium' },
    'AS136907': { name: 'Huawei Cloud',            category: 'datacenter', risk: 'medium' },
    'AS45090':  { name: 'Tencent Cloud',           category: 'datacenter', risk: 'medium' },
    'AS37963':  { name: 'Alibaba Cloud',           category: 'datacenter', risk: 'medium' },
    'AS76001':  { name: 'Vercel',                  category: 'datacenter', risk: 'low' },

    // ── Proxy / Anonymizer ──
    'AS29802':  { name: 'HVC-AS (proxy)',          category: 'proxy',      risk: 'high' },
    'AS174':    { name: 'Cogent (backbone)',        category: 'transit',    risk: 'low' },
    'AS3356':   { name: 'Lumen/CenturyLink',       category: 'transit',    risk: 'low' },

    // ── Brazilian ISPs (residential — low risk) ──
    'AS4230':   { name: 'Claro Brasil',            category: 'residential', risk: 'low' },
    'AS18881':  { name: 'Vivo/Telefônica',         category: 'residential', risk: 'low' },
    'AS7738':   { name: 'Telemar/Oi',              category: 'residential', risk: 'low' },
    'AS28573':  { name: 'Claro NET',               category: 'residential', risk: 'low' },
    'AS267180': { name: 'Copnet Telecom',          category: 'residential', risk: 'low' },
    'AS22047':  { name: 'VTR Banda Ancha',         category: 'residential', risk: 'low' },
};

const RISK_EMOJI = {
    critical: '🔴',
    high:     '🟠',
    medium:   '🟡',
    low:      '🟢',
};

const CATEGORY_EMOJI = {
    vpn:         '🔒 VPN',
    tor:         '🧅 Tor',
    datacenter:  '🏢 Datacenter',
    cdn:         '⚡ CDN',
    proxy:       '🔀 Proxy',
    residential: '🏠 Residencial',
    transit:     '🌐 Transit',
    unknown:     '❓ Desconhecido',
};

module.exports = async function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');

    // ASN can come from query param or from Vercel header (when called server-side)
    const rawASN = req.query?.asn
        || req.headers['x-vercel-ip-asn']
        || '';

    const asn = rawASN.toString().trim().toUpperCase().replace(/^AS/, 'AS');

    const entry = ASN_DB[asn] || ASN_DB['AS' + asn.replace('AS','')];

    if (entry) {
        return res.status(200).json({
            asn,
            name:     entry.name,
            category: entry.category,
            risk:     entry.risk,
            label:    `${RISK_EMOJI[entry.risk]||'❓'} ${CATEGORY_EMOJI[entry.category]||entry.category} — ${entry.name}`,
        });
    }

    // Unknown ASN — try to infer from org string if passed
    const org = (req.query?.org || '').toLowerCase();
    let inferredCategory = 'unknown';
    let inferredRisk = 'low';

    if (/vpn|proxy|tunnel|anon|priv/i.test(org))      { inferredCategory = 'vpn';         inferredRisk = 'high'; }
    else if (/aws|amazon|gcp|google|azure|digital|linode|vultr|hetz|ovh/i.test(org)) {
        inferredCategory = 'datacenter'; inferredRisk = 'medium';
    }
    else if (/tor|onion|exit/i.test(org))             { inferredCategory = 'tor';          inferredRisk = 'critical'; }
    else if (/cloudflare|fastly|akamai|cdn/i.test(org)) { inferredCategory = 'cdn';        inferredRisk = 'low'; }

    return res.status(200).json({
        asn,
        name:     org || 'Unknown',
        category: inferredCategory,
        risk:     inferredRisk,
        label:    `${RISK_EMOJI[inferredRisk]||'❓'} ${CATEGORY_EMOJI[inferredCategory]||inferredCategory} — ${org||'Unknown ASN'}`,
    });
};
