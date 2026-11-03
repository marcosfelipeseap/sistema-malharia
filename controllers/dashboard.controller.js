const registrosService = require('../services/registros.service');
const malhariasService = require('../services/malharias.service');
const processosService = require('../services/processos.service');
const rankingService = require('../services/ranking.service'); 
const { GoogleAuth } = require('google-auth-library');

// --- AUTENTICAÇÃO LEVE GOOGLE SHEETS ---
let auth;
try {
    let authOptions = {
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    };

    if (process.env.GOOGLE_CREDENTIALS) {
        let rawCreds = process.env.GOOGLE_CREDENTIALS;
        let credsObj;
        try {
            credsObj = JSON.parse(rawCreds);
        } catch (e1) {
            rawCreds = rawCreds.trim();
            if ((rawCreds.startsWith('"') && rawCreds.endsWith('"')) || (rawCreds.startsWith("'") && rawCreds.endsWith("'"))) {
                rawCreds = rawCreds.substring(1, rawCreds.length - 1);
            }
            credsObj = JSON.parse(rawCreds);
        }
        let privateKey = credsObj.private_key;
        if (privateKey && privateKey.includes('\\n')) {
            privateKey = privateKey.replace(/\\n/g, '\n');
        }
        authOptions.credentials = {
            client_email: credsObj.client_email,
            private_key: privateKey,
            project_id: credsObj.project_id
        };
    } else {
        authOptions.keyFile = 'credentials.json';
    }
    
    auth = new GoogleAuth(authOptions);
} catch (error) {
    console.error("Erro na leitura da chave Google:", error.message);
}

// Cache da Planilha (10 minutos)
let sheetsCache = {
    data: { fardData: [], fardSeapData: [], dadosAntigosData: [] },
    lastFetch: 0,
    isFetching: false
};

async function fetchPlanilhasGoogle() {
    if (!auth) return sheetsCache.data;
    
    if (sheetsCache.lastFetch > 0 && (Date.now() - sheetsCache.lastFetch < 600000)) {
        return sheetsCache.data;
    }

    if (sheetsCache.isFetching) return sheetsCache.data;
    sheetsCache.isFetching = true;

    try {
        const client = await auth.getClient();
        const spreadsheetId = '1GU1b3QiOh9sSisqI3g-a2MoR5mTESD_jaTt_tOH5QjA';
        
        const urlInterno = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('Fardamento Interno - Novo!A:G')}?valueRenderOption=UNFORMATTED_VALUE`;
        const urlSeap = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('Fardamento Servidor!A:G')}?valueRenderOption=UNFORMATTED_VALUE`;
        const urlDadosAntigos = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent('DADOSANTIGOS!A:H')}?valueRenderOption=UNFORMATTED_VALUE`;

        const [resInterno, resSeap, resAntigos] = await Promise.all([
            client.request({ url: urlInterno, timeout: 10000 }).catch(() => ({ data: { values: [] } })),
            client.request({ url: urlSeap, timeout: 10000 }).catch(() => ({ data: { values: [] } })),
            client.request({ url: urlDadosAntigos, timeout: 10000 }).catch(() => ({ data: { values: [] } }))
        ]);

        const fardData = processFardamentoData(resInterno.data.values || []);
        const fardSeapData = processFardamentoSeapData(resSeap.data.values || []);
        const dadosAntigosData = processDadosAntigos(resAntigos.data.values || []);

        if (fardData.length > 0 || dadosAntigosData.length > 0) {
            sheetsCache.data = { fardData, fardSeapData, dadosAntigosData };
            sheetsCache.lastFetch = Date.now();
        }
    } catch (err) {
        console.error("Erro ao buscar dados no Google:", err.message);
    } finally {
        sheetsCache.isFetching = false;
    }

    return sheetsCache.data;
}

// --- FUNÇÕES UTILITÁRIAS DA PLANILHA ---
function normalizeDate(val) {
    if (val === null || val === undefined || val === "") return "";
    if (typeof val === 'number' || (typeof val === 'string' && !isNaN(val) && Number(val) > 40000)) {
        let serial = Number(val);
        let utc_days = Math.floor(serial - 25569);
        let date_info = new Date(utc_days * 86400 * 1000);
        let day = String(date_info.getUTCDate()).padStart(2, '0');
        let month = String(date_info.getUTCMonth() + 1).padStart(2, '0');
        let year = date_info.getUTCFullYear();
        return `${day}/${month}/${year}`;
    }
    let str = String(val).trim().split(' ')[0]; 
    if (str.toLowerCase() === "invalid date") return "";
    if (str.includes('/')) {
        let parts = str.split('/');
        if (parts.length === 2) return `${parts[0].trim().padStart(2, '0')}/${parts[1].trim().padStart(2, '0')}/${new Date().getFullYear()}`;
        if (parts.length >= 3) {
            let p0 = parts[0].trim().padStart(2, '0'), p1 = parts[1].trim().padStart(2, '0'), p2 = parts[2].trim();
            if (p2.length === 2) p2 = "20" + p2;
            if (p0.length === 4) return `${parts[2].trim().padStart(2, '0')}/${p1}/${p0}`;
            return `${p0}/${p1}/${p2.substring(0,4)}`;
        }
    }
    if (str.includes('-')) {
        let parts = str.split('-');
        if (parts.length >= 3) {
            let p0 = parts[0].trim(), p1 = parts[1].trim().padStart(2, '0'), p2 = parts[2].trim();
            if (p0.length === 4) return `${p2.padStart(2, '0')}/${p1}/${p0}`;
            if (p2.length === 2) p2 = "20" + p2;
            return `${p0.padStart(2, '0')}/${p1}/${p2.substring(0,4)}`;
        }
    }
    return str;
}

function parseNumber(val) {
    if (typeof val === 'string') {
        let clean = val.replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
        return parseFloat(clean) || 0;
    }
    return val || 0;
}

function processFardamentoData(values) {
    if (values.length < 2) return [];
    return values.slice(1).map(row => {
        let dataStr = normalizeDate(row[0]);
        if (!dataStr) return null;
        return { data: dataStr, mesAno: String(row[1] || "").trim(), tipo: String(row[2] || "").trim(), cor: String(row[3] || "").trim(), quantidade: parseNumber(row[4]), destino: String(row[5] || "").trim(), observacao: String(row[6] || "").trim() };
    }).filter(i => i !== null && i.tipo !== "");
}

function processFardamentoSeapData(values) {
    if (values.length < 2) return [];
    return values.slice(1).map(row => {
        let dataStr = normalizeDate(row[0]);
        if (!dataStr) return null;
        return { data: dataStr, mesAno: String(row[1] || "").trim(), tipo: String(row[2] || "").trim(), tamanho: String(row[3] || "").trim(), quantidade: parseNumber(row[4]), destino: String(row[5] || "").trim(), observacao: String(row[6] || "").trim() };
    }).filter(i => i !== null && i.tipo !== "");
} 

function processDadosAntigos(values) {
    if (values.length < 2) return [];
    return values.slice(1).map(row => {
        let dataStr = normalizeDate(row[0]);
        if (!dataStr) return null;
        
        let p = dataStr.split('/');
        if (p.length !== 3) return null;
        let dataObj = new Date(p[2], p[1]-1, p[0]);
        
        return { 
            data: dataStr,
            dateObj: dataObj,
            dataOriginal: `${p[2]}-${p[1]}-${p[0]}`,
            oficina: String(row[1] || "").trim(),
            item: String(row[2] || "").trim(),
            qtd_internos: parseNumber(row[3]),
            meta: parseNumber(row[4]),
            producaoDia: parseNumber(row[5]),
            desempenho: String(row[6] || "").trim(),
            justificativa: String(row[7] || "").trim()
        };
    }).filter(i => i !== null && i.producaoDia > 0 && i.item !== "");
}

function removerDuplicatasRegistros(array) {
    if (!Array.isArray(array)) return array;
    const map = new Map();
    array.forEach(item => {
        if (item && item.id) map.set(item.id, item);
    });
    return Array.from(map.values());
}

// --- CACHE DO PAYLOAD DO DASHBOARD EM MEMÓRIA ---
let dashboardCache = {
    payload: null,
    lastFetch: 0,
    isFetching: false
};

async function construirPayloadDashboard() {
    if (dashboardCache.isFetching) return dashboardCache.payload;
    dashboardCache.isFetching = true;

    try {
        const hojeObj = new Date();
        const mesAtual = hojeObj.getMonth() + 1;
        const anoAtual = hojeObj.getFullYear();
        
        const formatData = (d) => {
            const mes = String(d.getMonth() + 1).padStart(2, '0');
            const dia = String(d.getDate()).padStart(2, '0');
            return `${d.getFullYear()}-${mes}-${dia}`;
        };

        // Usa a função leve se existir, senão usa a padrão
        const fnRegistros = registrosService.getRegistrosParaDashboard 
            ? registrosService.getRegistrosParaDashboard(formatData(hojeObj))
            : registrosService.getRegistrosFiltrados(null, formatData(hojeObj));

        let [registros, feriadosRaw, malhariasRaw, processosRaw, itensDisponiveis, rankingRaw, planilhas] = await Promise.all([
            fnRegistros, 
            registrosService.getFeriados(),                                    
            malhariasService.getAllMalharias(),                                
            processosService.getAllProcessos(),                                
            processosService.getAllItensDisponiveis(),                          
            rankingService.getRankingPerformance(mesAtual, anoAtual),
            fetchPlanilhasGoogle()
        ]);
        
        registros = removerDuplicatasRegistros(registros);

        const itensMap = {};
        if (itensDisponiveis && Array.isArray(itensDisponiveis)) {
            itensDisponiveis.forEach(it => { itensMap[it.id] = it.nome; });
        }

        const malhariasMap = {};
        const infoOficinasEstatico = [];
        
        if (malhariasRaw && Array.isArray(malhariasRaw)) {
            malhariasRaw.forEach(m => {
                malhariasMap[m.id] = (m.itens && Array.isArray(m.itens)) ? m.itens.length : 0;
                infoOficinasEstatico.push({
                    id: m.id,
                    nome: m.nome,
                    remunerados: m.remunerados || 0
                });
            });
        }

        let rawData = [];
        const assinaturasGlobais = new Set();
        const demandasMap = {};
        
        registros.forEach(reg => {
            const dataFormatada = reg.data_registro.split('-').reverse().join('/');
            const dataObj = new Date(reg.data_registro + 'T00:00:00'); 
            const oficinaNome = reg.malharia ? reg.malharia.nome : 'Desconhecida';
            
            let numMaquinas = reg.malharia_id && malhariasMap[reg.malharia_id] !== undefined ? malhariasMap[reg.malharia_id] : 'Não informado';
            
            const baseData = { 
                data: dataFormatada, 
                oficina: oficinaNome, 
                oficinaId: reg.malharia_id,
                metaOficina: reg.meta_calculada || 0, 
                justificativa: reg.justificativa ? reg.justificativa.nome : '', 
                observacao: reg.observacao || '', 
                maquinas: numMaquinas, 
                internos: reg.qtd_internos || 0, 
                internosVinc: reg.qtd_internos || 0, 
                dateObj: dataObj,
                dataOriginal: reg.data_registro
            };

            if (reg.itens && reg.itens.length > 0) {
                reg.itens.forEach(it => {
                    let tamanhoItem = it.tamanho || '';
                    let tipoItem = it.descricao || '';
                    
                    if (it.processo && Array.isArray(it.processo.processo_item)) {
                        const pItem = it.processo.processo_item.find(pi => String(pi.id) === String(it.processo_item_id)) || it.processo.processo_item[0];
                        if (pItem) {
                            if (!tamanhoItem) tamanhoItem = pItem.tamanho || '';
                            if (!tipoItem) tipoItem = pItem.descricao || '';
                        }
                    } else if (it.processo && it.processo.processo_item) {
                        if (!tamanhoItem) tamanhoItem = it.processo.processo_item.tamanho || '';
                        if (!tipoItem) tipoItem = it.processo.processo_item.descricao || '';
                    }

                    const numeroProcessoLimpo = it.processo && it.processo.numero_processo ? it.processo.numero_processo.replace(/\./g, '') : '';
                    const nomeDoProcesso = it.processo && it.processo.orgao ? it.processo.orgao : (numeroProcessoLimpo || 'Diversos');
                    const procId = it.processo_id || (it.processo ? it.processo.id : nomeDoProcesso);
                    const itemNome = it.item ? it.item.nome : (itensMap[it.item_id] || 'Desconhecido');
                    const qtd = reg.qtd_produzida_ajustada || it.qtd_produzida || 0;

                    if (it.processo) {
                        if (!demandasMap[procId]) demandasMap[procId] = { id: procId, orgao: nomeDoProcesso, numero: it.processo.numero_processo || '', itensMap: {} };
                        let itemKey = `${itemNome}|${tipoItem}|${tamanhoItem}`;
                        if (!demandasMap[procId].itensMap[itemKey]) demandasMap[procId].itensMap[itemKey] = { nome: itemNome, descricao: tipoItem, tamanho: tamanhoItem };
                    }

                    const assinatura = `${dataFormatada}|${oficinaNome}|${itemNome}|${tamanhoItem}|${tipoItem}|${nomeDoProcesso}|${qtd}`;
                    if (!assinaturasGlobais.has(assinatura)) {
                        assinaturasGlobais.add(assinatura);
                        rawData.push({ ...baseData, producaoDia: qtd, item: itemNome, tamanho: tamanhoItem, tipo: tipoItem || '-', processoNome: nomeDoProcesso, processoId: procId });
                    }
                });
            } else {
                const assinaturaVazia = `${dataFormatada}|${oficinaNome}|Nenhum|SemProducao`;
                if (!assinaturasGlobais.has(assinaturaVazia)) {
                    assinaturasGlobais.add(assinaturaVazia);
                    rawData.push({ ...baseData, producaoDia: 0, item: 'Nenhum', tamanho: '', tipo: '-', processoNome: '-', processoId: null });
                }
            }
        });

        const feriados = feriadosRaw.map(f => ({ data: f.data_feriado.split('-').reverse().join('/'), descricao: f.descricao, oficina: f.malharia ? f.malharia.nome : 'Todas' }));
        const demandasFormatadas = Object.values(demandasMap).map(d => ({ id: d.id, orgao: d.orgao, numero: d.numero, itens: Object.values(d.itensMap) }));

        const formatDateBR = (dateStr) => {
            if (!dateStr) return '-';
            try {
                let clean = dateStr.toString().split('T')[0];
                let parts = clean.split('-');
                if (parts.length === 3) { return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`; }
                return dateStr;
            } catch(e) { return dateStr; }
        };

        const processosMapeados = [];
        const cronogramaDataMap = {};

        (processosRaw || []).forEach(p => {
            const produtosBasicosSet = new Set(); 
            const itensFormatados = (p.itens || []).map(i => {
                const nomeItem = itensMap[i.item_id] || (i.item ? i.item.nome : 'Item');
                produtosBasicosSet.add(nomeItem); 

                const descItem = i.descricao ? ` (${i.descricao})` : '';
                const tamItem = (i.tamanho && i.tamanho !== '-') ? ` [Tam: ${i.tamanho}]` : '';
                const strPrazo = formatDateBR(i.data_prazo);
                const qtdSol = i.qtd_solicitada || 0;
                const qtdEnt = i.qtd_entregue || 0;
                const qtdFaltante = i.qtd_faltante || 0;
                const statusItem = p.status || 'Entrega não iniciada';

                if (strPrazo !== '-' && strPrazo) {
                    const chCrono = `${p.id}_${strPrazo}`;
                    if (!cronogramaDataMap[chCrono]) {
                        cronogramaDataMap[chCrono] = { nProcesso: p.numero_processo || 'S/N', orgao: p.orgao || 'Sem Órgão', prazo: strPrazo, items: [], totalPendente: 0 };
                    }
                    cronogramaDataMap[chCrono].items.push({ produto: `${nomeItem}${descItem}`, tamanho: i.tamanho || 'Único', status: statusItem, obs: p.observacao || '', qtdPendente: qtdFaltante });
                    cronogramaDataMap[chCrono].totalPendente += qtdFaltante;
                }

                return { produto: `${nomeItem}${descItem}${tamItem}`, dataEntrada: formatDateBR(p.data_entrada), qtdSolicitada: qtdSol, qtdAutorizada: i.qtd_autorizada || 0, qtdEntregue: qtdEnt, qtdFaltante: qtdFaltante, prazo: strPrazo, situacao: p.situacao || 'Pendente', status: statusItem, obs: p.observacao || '-' };
            });

            processosMapeados.push({ nProcesso: p.numero_processo || '', tipoDemanda: p.tipo_demanda || 'Geral', orgao: p.orgao || 'Órgão não especificado', produtosBasicos: [...produtosBasicosSet], status: p.status || 'Entrega não iniciada', situacao: p.situacao || 'Pendente', linkSei: p.link_sei || '', obs: p.observacao || '', qtdAutorizada: p.totais ? p.totais.autorizado : 0, qtdEntregue: p.totais ? p.totais.entregue : 0, qtdFaltante: p.totais ? p.totais.faltante : 0, itens: itensFormatados });
        });

        dashboardCache.payload = {
            rawDataJSON: JSON.stringify(rawData),
            feriadosJSON: JSON.stringify(feriados),
            demandasJSON: JSON.stringify(demandasFormatadas),
            processosJSON: JSON.stringify(processosMapeados),
            scheduleJSON: JSON.stringify(Object.values(cronogramaDataMap)),
            rankingJSON: JSON.stringify(rankingRaw), 
            infoOficinasEstaticoJSON: JSON.stringify(infoOficinasEstatico),
            fardamentoJSON: JSON.stringify(planilhas.fardData),
            fardamentoseapJSON: JSON.stringify(planilhas.fardSeapData),
            dadosAntigosJSON: JSON.stringify(planilhas.dadosAntigosData)
        };
        dashboardCache.lastFetch = Date.now();
    } catch (err) {
        console.error("Erro ao atualizar cache do Dashboard:", err.message);
    } finally {
        dashboardCache.isFetching = false;
    }

    return dashboardCache.payload;
}

// Pré-aquece o cache assim que o servidor liga!
setTimeout(() => {
    construirPayloadDashboard();
}, 1000);

exports.diarioPublico = async (req, res) => {
    try {
        // Se já existe em cache, entrega NA HORA (0ms de espera!)
        if (dashboardCache.payload) {
            // Se passou de 2 minutos, manda atualizar em segundo plano sem travar o usuário
            if (Date.now() - dashboardCache.lastFetch > 120000) {
                construirPayloadDashboard();
            }
            return res.render('dashboard/index', {
                layout: 'layouts/public',
                title: 'Painel Público - Produção',
                ...dashboardCache.payload,
                user: req.user || res.locals.user || null 
            });
        }

        // Apenas se alguém acessar no exato primeiro segundo em que o servidor ligou
        const payload = await construirPayloadDashboard();
        res.render('dashboard/index', {
            layout: 'layouts/public',
            title: 'Painel Público - Produção',
            ...(payload || {}),
            user: req.user || res.locals.user || null 
        });

    } catch (error) {
        console.error("Erro ao carregar o dashboard público:", error);
        res.status(500).send("Erro no servidor ao montar o painel público. Consulte os logs.");
    }
};