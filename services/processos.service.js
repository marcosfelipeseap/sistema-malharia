const supabase = require('../config/supabaseClient');
const TABLE = 'processo';
const TABLE_TERMOS = 'termo_entrega';
const BUCKET = 'termos';

exports.getAllItensDisponiveis = async () => {
    const { data } = await supabase.schema('malharia').from('item').select('*').order('nome');
    return data || [];
};

exports.getAllProcessos = async (busca = '') => {
    let query = supabase
        .schema('malharia')
        .from(TABLE)
        .select('*, itens:processo_item(*)') 
        .order('data_entrada', { ascending: false });

    if (busca) {
        const buscaLimpaNumero = busca.replace(/\./g, '');
        query = query.or(`numero_processo.ilike.%${buscaLimpaNumero}%,orgao.ilike.%${busca}%,situacao.ilike.%${busca}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const processosIds = data.map(p => p.id);
    let producaoRegistada = [];
    
    if (processosIds.length > 0) {
        const { data: rData, error: rError } = await supabase
            .schema('malharia')
            .from('registro_diario_item')
            .select(`
                processo_id,
                qtd_produzida,
                registro:registro_id (
                    malharia:malharia_id (nome)
                )
            `)
            .in('processo_id', processosIds);
            
        if (!rError && rData) {
            producaoRegistada = rData;
        } else if (rError) {
            console.error("Erro ao buscar a produção dos processos:", rError);
        }
    }

    const processosComTotais = data.map(p => {
        const totais = (p.itens || []).reduce((acc, item) => {
            return {
                solicitado: acc.solicitado + (item.qtd_solicitada || 0),
                autorizado: acc.autorizado + (item.qtd_autorizada || 0),
                entregue: acc.entregue + (item.qtd_entregue || 0),
                faltante: acc.faltante + (item.qtd_faltante || 0)
            };
        }, { solicitado: 0, autorizado: 0, entregue: 0, faltante: 0 });

        let totalFabricado = 0;
        let detalhesMalharias = {}; 

        const producaoDesteProcesso = producaoRegistada.filter(reg => reg.processo_id === p.id);

        producaoDesteProcesso.forEach(regItem => {
            const qtd = regItem.qtd_produzida || 0;
            totalFabricado += qtd;

            let nomeMalharia = 'Malharia Desconhecida';
            if (regItem.registro && regItem.registro.malharia && regItem.registro.malharia.nome) {
                nomeMalharia = regItem.registro.malharia.nome;
            }
            
            if (detalhesMalharias[nomeMalharia]) {
                detalhesMalharias[nomeMalharia] += qtd;
            } else {
                detalhesMalharias[nomeMalharia] = qtd;
            }
        });

        return { ...p, totais, totalFabricado, detalhesMalharias };
    });

    return processosComTotais;
};

exports.getProcessoById = async (id) => {
    const { data: processo, error } = await supabase.schema('malharia').from(TABLE).select('*').eq('id', id).single();
    if (error) throw error;

    const { data: itens } = await supabase.schema('malharia').from('processo_item').select('*, item:item_id(nome)').eq('processo_id', id);
    const { data: termos } = await supabase.schema('malharia').from(TABLE_TERMOS).select('*').eq('processo_id', id).order('numero_termo', { ascending: true });

    const termosComUrl = (termos || []).map(t => {
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(t.caminho_arquivo);
        return { ...t, url_publica: data.publicUrl };
    });

    // 4. Busca total Produzido/Fabricado COM os Detalhes das Malharias para o Modal
    let totalFabricadoGeral = 0;
    const detalhesMalharias = {};
    
    try {
        const { data: producao } = await supabase
            .schema('malharia')
            .from('registro_diario_item')
            .select(`
                qtd_produzida,
                registro:registro_id (
                    malharia:malharia_id (nome)
                )
            `)
            .eq('processo_id', id);

        if (producao) {
            producao.forEach(reg => {
                const qtd = reg.qtd_produzida || 0;
                totalFabricadoGeral += qtd;
                
                let nomeMalharia = 'Malharia Desconhecida';
                if (reg.registro && reg.registro.malharia && reg.registro.malharia.nome) {
                    nomeMalharia = reg.registro.malharia.nome;
                }
                
                if (!detalhesMalharias[nomeMalharia]) {
                    detalhesMalharias[nomeMalharia] = 0;
                }
                detalhesMalharias[nomeMalharia] += qtd;
            });
        }
    } catch(err) {
        console.error('Erro ao buscar fabricado do processo:', err);
    }

    // 5. RASTREIO DE ENTREGAS (ESTOQUE VS MANUAL)
    let transferencias = [];
    try {
        const { data } = await supabase
            .schema('malharia')
            .from('transferencias_estoque')
            .select('*')
            .eq('processo_id', id)
            .eq('status', 'aprovada')
            .eq('tipo_destino', 'processo') 
            .order('data_avaliacao', { ascending: false });
        transferencias = data || [];
    } catch(err) {
        console.error('Erro ao buscar historico de estoque do processo:', err);
    }

    const { data: malharias } = await supabase.schema('malharia').from('malharia').select('id, nome');
    const malhariasMap = {};
    if (malharias) malharias.forEach(m => malhariasMap[String(m.id)] = m.nome);

    const itensComHistorico = (itens || []).map(item => {
        const historicoDesseItem = transferencias.filter(t => String(t.item_id) === String(item.item_id));
        
        let qtdPeloEstoque = 0;
        const historicoFormatado = historicoDesseItem.map(t => {
            qtdPeloEstoque += parseInt(t.quantidade);
            const origem = t.malharia_origem_id ? (malhariasMap[String(t.malharia_origem_id)] || 'Oficina Desconhecida') : 'MALHARIA SEDE';
            return {
                data: t.data_avaliacao || t.data_transferencia,
                origem: origem,
                quantidade: parseInt(t.quantidade)
            };
        });

        const qtdManual = (item.qtd_entregue || 0) - qtdPeloEstoque;

        return {
            ...item,
            historico_entregas: historicoFormatado,
            qtd_manual: qtdManual > 0 ? qtdManual : 0
        };
    });

    return { 
        ...processo, 
        itens: itensComHistorico, 
        termos: termosComUrl, 
        total_fabricado: totalFabricadoGeral,
        detalhesMalharias: detalhesMalharias // Retorna os detalhes para o Modal
    };
};

async function verificarNumeroExistente(numero, ignorarId = null) {
    const numeroLimpo = String(numero).replace(/\./g, '');
    let query = supabase.schema('malharia').from(TABLE).select('id').eq('numero_processo', numeroLimpo);

    if (ignorarId) query = query.neq('id', ignorarId);

    const { data, error } = await query;
    if (error) throw error;
    return data.length > 0;
}

exports.createProcessoComItens = async (processoData, itensData) => {
    const existe = await verificarNumeroExistente(processoData.numero_processo);
    if (existe) throw new Error(`O número de processo "${processoData.numero_processo}" já está cadastrado!`);

    const { data: processo, error: errProc } = await supabase.schema('malharia').from(TABLE).insert([processoData]).select().single();
    if (errProc) throw errProc;

    if (itensData && itensData.length > 0) {
        const itensFormatados = itensData.map(item => ({ ...item, processo_id: processo.id }));
        const { error: errItens } = await supabase.schema('malharia').from('processo_item').insert(itensFormatados);
        if (errItens) throw new Error("Erro ao salvar itens: " + errItens.message);
    }
    return processo;
};

exports.updateProcessoComItens = async (id, processoData, itensData) => {
    const existe = await verificarNumeroExistente(processoData.numero_processo, id);
    if (existe) throw new Error(`O número de processo "${processoData.numero_processo}" já pertence a outro registro!`);

    const { error: errProc } = await supabase.schema('malharia').from(TABLE).update(processoData).eq('id', id);
    if (errProc) throw errProc;

    await supabase.schema('malharia').from('processo_item').delete().eq('processo_id', id);

    if (itensData && itensData.length > 0) {
        const itensFormatados = itensData.map(item => ({ ...item, processo_id: id }));
        const { error: errItens } = await supabase.schema('malharia').from('processo_item').insert(itensFormatados);
        if (errItens) throw errItens;
    }
    return true;
};

exports.deleteProcesso = async (id) => {
    const { error } = await supabase.schema('malharia').from(TABLE).delete().eq('id', id);
    if (error) throw error;
    return true;
};

// --- FUNÇÕES PARA TERMOS ---
exports.createTermo = async (processoId, numeroTermo, fileBuffer, fileName, mimeType) => {
    const path = `processos/${processoId}/${Date.now()}_${fileName}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, fileBuffer, { contentType: mimeType, upsert: false });

    if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`);

    const { data, error: dbError } = await supabase.schema('malharia').from(TABLE_TERMOS).insert([{
        processo_id: processoId,
        numero_termo: numeroTermo,
        nome_arquivo: fileName,
        caminho_arquivo: path,
        tipo_arquivo: mimeType
    }]).select().single();

    if (dbError) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw dbError;
    }

    return data;
};

exports.deleteTermo = async (termoId) => {
    const { data: termo, error: findError } = await supabase.schema('malharia').from(TABLE_TERMOS).select('*').eq('id', termoId).single();
    if (findError || !termo) throw new Error("Termo não encontrado");

    const { error: storageError } = await supabase.storage.from(BUCKET).remove([termo.caminho_arquivo]);
    if (storageError) console.error("Aviso: Falha ao deletar arquivo do storage", storageError);

    const { error: dbError } = await supabase.schema('malharia').from(TABLE_TERMOS).delete().eq('id', termoId);
    if (dbError) throw dbError;
    return true;
};

exports.registrarEntregaDeEstoque = async (processoId, itemId, quantidadeAdicional) => {
    const { data: itens, error } = await supabase.schema('malharia').from('processo_item')
        .select('id, qtd_entregue, qtd_autorizada, qtd_faltante')
        .eq('processo_id', processoId)
        .eq('item_id', itemId);
        
    if (error || !itens || itens.length === 0) return;

    const item = itens[0];
    const novaEntregue = (item.qtd_entregue || 0) + quantidadeAdicional;
    const novaFaltante = Math.max(0, (item.qtd_autorizada || 0) - novaEntregue);

    await supabase.schema('malharia').from('processo_item')
        .update({ qtd_entregue: novaEntregue, qtd_faltante: novaFaltante })
        .eq('id', item.id);
};