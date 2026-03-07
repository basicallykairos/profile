// api/geo.js
// Relay endpoint that reads Vercel-injected server-side headers and returns them as JSON.
// The browser can't read request headers directly, so this API bridges the gap.
// These headers are set by Vercel infrastructure — they cannot be spoofed by the client.

module.exports = async function(req, res) {
    const h = req.headers;

    const data = {
        // ── JA4 TLS fingerprint ──
        // Hash of the TLS ClientHello (cipher suites, extensions, versions).
        // Identifies browser + OS + network stack. Stable across IP/VPN changes.
        ja4:           h['x-vercel-ja4-digest']        || 'N/A',

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

        // ── Deployment region (which Vercel PoP handled this request) ──
        edgeRegion:    h['x-vercel-deployment-url']    || 'N/A',
    };

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(data);
};
