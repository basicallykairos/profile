// middleware.js
// Vercel Edge Middleware — roda ANTES de qualquer função serverless ou asset.
// Usa apenas Web APIs padrão (Request/Response/Headers) — sem next/server.
//
// NOTA: Honeypot paths são tratados pelo vercel.json via rewrites transparentes.
// NÃO tratamos aqui — um 307 redirect exporia "/api/honeypot" no header Location,
// avisando ao scanner que existe um honeypot.

export default function middleware(request) {
    // Pass through — all routing handled by vercel.json rewrites
    return;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|music/).*)',
    ],
};
