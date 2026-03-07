// api/etag-tracker.js
// ETag supercookie: assigns a unique ID stored in the browser's HTTP cache.
// On return visits, the browser automatically sends "If-None-Match: <id>" — server reads it back.
// Survives cookie clearing, localStorage wipes, and private browsing on most browsers,
// because the HTTP cache is a separate storage layer.

const crypto = require('crypto');

module.exports = async function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Expose-Headers', 'X-Visitor-ETag, X-ETag-Returning');
    res.setHeader('Cache-Control', 'no-cache');

    const incoming = (req.headers['if-none-match'] || '').replace(/"/g, '').trim();

    if (incoming && incoming.length > 0 && incoming !== '*') {
        // Returning visitor — browser sent back our ETag
        res.setHeader('ETag', `"${incoming}"`);
        res.setHeader('X-Visitor-ETag', incoming);
        res.setHeader('X-ETag-Returning', 'YES — returning visitor');
        return res.status(304).end();
    }

    // First visit — generate new unique ID
    const newId = crypto.randomBytes(8).toString('hex');
    res.setHeader('ETag', `"${newId}"`);
    res.setHeader('X-Visitor-ETag', newId);
    res.setHeader('X-ETag-Returning', 'no (first visit)');
    return res.status(200).end();
};
