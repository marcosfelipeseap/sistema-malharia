const supabase = require('../config/supabaseClient');
const TABLE = 'processo';
const TABLE_TERMOS = 'termo_entrega';
const BUCKET = 'termos';

exports.getAllItensDisponiveis = async () => {
    const { data } = await supabase.schema('malharia').from('item').select('*').order('nome');
    return data || [];
};

exports.getAllProcessos = async (busca = '') => {
    // 1. Busca os processos e os seus itens solicitados
    let query = supabase
        .schema('malharia')
        .from(TABLE)
        .select('*, itens:processo_item(*)') 
        .order('data_entrada', { ascending: false });

    if (busca) {
        // Limpa os pontos do termo de busca apenas para encontrar o número do processo corretamente
        const buscaLimpaNumero = busca.replace(/\./g, '');
        query = query.or(`numero_processo.ilike.%${buscaLimpaNumero}%,orgao.ilike.%${busca}%,situacao.ilike.%${busca}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    // 2. Busca separadamente toda a produção registada para os processos encontrados (Mais seguro)
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

    // 3. Junta tudo e faz os cálculos finais
    const processosComTotais = data.map(p => {
        // Cálculo dos totais de itens (solicitado, autorizado, entregue, faltante)
        const totais = (p.itens || []).reduce((acc, item) => {
            return {
                solicitado: acc.solicitado + (item.qtd_solicitada || 0),
                autorizado: acc.autorizado + (item.qtd_autorizada || 0),
                entregue: acc.entregue + (item.qtd_entregue || 0),
                faltante: acc.faltante + (item.qtd_faltante || 0)
            };
        }, { solicitado: 0, autorizado: 0, entregue: 0, faltante: 0 });

        // Cálculo do Total Fabricado e detalhes por Malharia
        let totalFabricado = 0;
        let detalhesMalharias = {}; // Formato: { "Malharia A": 50, "Malharia B": 120 }

        // Filtra as produções que pertencem APENAS a este processo atual no loop
        const producaoDesteProcesso = producaoRegistada.filter(reg => reg.processo_id === p.id);

        producaoDesteProcesso.forEach(regItem => {
            const qtd = regItem.qtd_produzida || 0;
            totalFabricado += qtd;

            // Navega com segurança para evitar erros caso alguma malharia tenha sido apagada
            let nomeMalharia = 'Malharia Desconhecida';
            if (regItem.registro && regItem.registro.malharia && regItem.registro.malharia.nome) {
                nomeMalharia = regItem.registro.malharia.nome;
            }
            
            // Soma a quantidade para essa malharia específica
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
    // 1. Busca dados do processo
    const { data: processo, error } = await supabase
        .schema('malharia')
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) throw error;

    // 2. Busca itens
    const { data: itens } = await supabase
        .schema('malharia')
        .from('processo_item')
        .select('*, item:item_id(nome)')
        .eq('processo_id', id);

    // 3. Busca Termos de Entrega (NOVO)
    const { data: termos } = await supabase
        .schema('malharia')
        .from(TABLE_TERMOS)
        .select('*')
        .eq('processo_id', id)
        .order('numero_termo', { ascending: true });

    // Gera URL pública para visualização dos termos
    const termosComUrl = (termos || []).map(t => {
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(t.caminho_arquivo);
        return { ...t, url_publica: data.publicUrl };
    });

    return { ...processo, itens: itens || [], termos: termosComUrl };
};

async function verificarNumeroExistente(numero, ignorarId = null) {
    // Limpa pontos caso venha de alguma outra fonte interna
    const numeroLimpo = String(numero).replace(/\./g, '');
    let query = supabase
        .schema('malharia')
        .from(TABLE)
        .select('id')
        .eq('numero_processo', numeroLimpo);

    if (ignorarId) {
        query = query.neq('id', ignorarId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data.length > 0;
}

exports.createProcessoComItens = async (processoData, itensData) => {
    const existe = await verificarNumeroExistente(processoData.numero_processo);
    if (existe) throw new Error(`O número de processo "${processoData.numero_processo}" já está cadastrado!`);

    const { data: processo, error: errProc } = await supabase
        .schema('malharia')
        .from(TABLE)
        .insert([processoData])
        .select()
        .single();

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
    // Nota: É recomendável deletar os arquivos do Storage antes, 
    // mas o CASCADE do banco cuidará dos registros na tabela.
    const { error } = await supabase.schema('malharia').from(TABLE).delete().eq('id', id);
    if (error) throw error;
    return true;
};

// --- NOVAS FUNÇÕES PARA TERMOS ---

exports.createTermo = async (processoId, numeroTermo, fileBuffer, fileName, mimeType) => {
    // 1. Upload para o Supabase Storage
    const path = `processos/${processoId}/${Date.now()}_${fileName}`;
    
    const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, fileBuffer, {
            contentType: mimeType,
            upsert: false
        });

    if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`);

    // 2. Salvar metadados no Banco
    const { data, error: dbError } = await supabase
        .schema('malharia')
        .from(TABLE_TERMOS)
        .insert([{
            processo_id: processoId,
            numero_termo: numeroTermo,
            nome_arquivo: fileName,
            caminho_arquivo: path,
            tipo_arquivo: mimeType
        }])
        .select()
        .single();

    if (dbError) {
        // Se falhar no banco, tenta limpar o arquivo enviado para não deixar lixo
        await supabase.storage.from(BUCKET).remove([path]);
        throw dbError;
    }

    return data;
};

exports.deleteTermo = async (termoId) => {
    // 1. Busca o termo para pegar o caminho do arquivo
    const { data: termo, error: findError } = await supabase
        .schema('malharia')
        .from(TABLE_TERMOS)
        .select('*')
        .eq('id', termoId)
        .single();
    
    if (findError || !termo) throw new Error("Termo não encontrado");

    // 2. Remove do Storage
    const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove([termo.caminho_arquivo]);
    
    if (storageError) console.error("Aviso: Falha ao deletar arquivo do storage", storageError);

    // 3. Remove do Banco
    const { error: dbError } = await supabase
        .schema('malharia')
        .from(TABLE_TERMOS)
        .delete()
        .eq('id', termoId);

    if (dbError) throw dbError;
    return true;
};