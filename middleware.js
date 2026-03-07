// middleware.js — Vercel Edge Middleware
// Runs at the edge (before any function/page), on every request.
// 1. Captures all Vercel-injected headers (geo, JA4, real IP) and
//    passes them to the page via response headers the frontend can read.
// 2. Acts as a first-party proxy — all tracking looks like internal traffic.

import { NextResponse } from 'next/server';

export const config = {
    // Run on all paths except static files and _next internals
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

export default function middleware(request) {
    const h = request.headers;
    const response = NextResponse.next();

    // ── Vercel geo headers (injected by Vercel infra, not spoofable by client) ──
    const geoCountry  = h.get('x-vercel-ip-country')        || 'N/A';
    const geoCity     = h.get('x-vercel-ip-city')           || 'N/A';
    const geoRegion   = h.get('x-vercel-ip-country-region') || 'N/A';
    const geoLat      = h.get('x-vercel-ip-latitude')       || 'N/A';
    const geoLon      = h.get('x-vercel-ip-longitude')      || 'N/A';
    const geoTZ       = h.get('x-vercel-ip-timezone')       || 'N/A';
    const geoASN      = h.get('x-vercel-ip-asn')            || 'N/A';

    // ── JA4 TLS digest — identifies the network/TLS stack, not the IP ──
    // Stable across VPN, private mode, IP changes. Different per browser+OS+version.
    const ja4         = h.get('x-vercel-ja4-digest')        || 'N/A';

    // ── Real IP as seen by Vercel edge (before any proxy manipulation) ──
    const realIP      = h.get('x-real-ip')
                     || h.get('x-forwarded-for')?.split(',')[0]?.trim()
                     || 'N/A';

    // Expose via response headers so the page JS can read them via /api/geo endpoint
    // (Can't read request headers in browser directly, so we relay via API)
    response.headers.set('x-mw-geo-country',  geoCountry);
    response.headers.set('x-mw-geo-city',     geoCity);
    response.headers.set('x-mw-geo-region',   geoRegion);
    response.headers.set('x-mw-geo-lat',      geoLat);
    response.headers.set('x-mw-geo-lon',      geoLon);
    response.headers.set('x-mw-geo-tz',       geoTZ);
    response.headers.set('x-mw-geo-asn',      geoASN);
    response.headers.set('x-mw-ja4',          ja4);
    response.headers.set('x-mw-real-ip',      realIP);

    return response;
}
