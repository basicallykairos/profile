// netlify/functions/favicon-handler.js
// Favicon Cache Attack — serve a 1x1 PNG with aggressive caching
// Each bit position (?b=0..31) is a separate cached resource.
// Bit=1 = this URL was fetched and cached on a previous visit.
// Bit=0 = URL was never fetched (not in cache).

// 1x1 transparent PNG (base64)
const PIXEL = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAABjE+ibYAAAAASUVORK5CYII=';

exports.handler = async () => ({
    statusCode: 200,
    headers: {
        'Content-Type':  'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
    },
    body: PIXEL,
    isBase64Encoded: true,
});
