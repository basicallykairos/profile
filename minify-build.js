// minify-build.js
// Rodado automaticamente pela Vercel no build (npm run build).
// Extrai o maior bloco <script> do index.html, minifica com Terser, e reinjeta.

const fs   = require('fs');
const path = require('path');
const { minify } = require('terser');

const HTML_PATH = path.join(__dirname, 'public', 'index.html');

(async () => {
    const html = fs.readFileSync(HTML_PATH, 'utf8');

    // Encontra todos os blocos <script> sem atributo src
    const scriptRegex = /<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    let largestMatch = null;
    let largestLen   = 0;

    while ((match = scriptRegex.exec(html)) !== null) {
        if (match[1].trim().length > largestLen) {
            largestLen   = match[1].trim().length;
            largestMatch = match;
        }
    }

    if (!largestMatch) {
        console.log('⚠️  Nenhum bloco <script> encontrado. Pulando minificação.');
        process.exit(0);
    }

    const originalJS = largestMatch[1];
    console.log(`📦 JS original: ${originalJS.length} chars`);

    const result = await minify(originalJS, {
        compress: {
            drop_console: false, // manter console.error para debug de prod
            passes: 2,
            dead_code: true,
        },
        mangle: true,
        format: {
            comments: false,
        },
    });

    if (!result.code) {
        console.error('❌ Terser falhou. Mantendo JS original.');
        process.exit(0); // não quebra o deploy
    }

    const minifiedJS = result.code;
    const savings = Math.round((1 - minifiedJS.length / originalJS.length) * 100);
    console.log(`✅ JS minificado: ${minifiedJS.length} chars (redução de ${savings}%)`);

    const newHTML = html.replace(originalJS, '\n' + minifiedJS + '\n');
    fs.writeFileSync(HTML_PATH, newHTML, 'utf8');
    console.log('✅ index.html atualizado com JS minificado.');
})();
