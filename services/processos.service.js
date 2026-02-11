const supabase = require('../config/supabaseClient');
const TABLE = 'processo';

exports.getAllItensDisponiveis = async () => {
    const { data } = await supabase.schema('malharia').from('item').select('*').order('nome');
    return data || [];
};

exports.getAllProcessos = async (busca = '') => {
    let query = supabase
        .schema('malharia')
        .from(TABLE)
        .select('*')
        .order('data_entrada', { ascending: false });

    if (busca) {
        query = query.or(`numero_processo.ilike.%${busca}%,orgao.ilike.%${busca}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
};

exports.getProcessoById = async (id) => {
    const { data: processo, error } = await supabase
        .schema('malharia')
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) throw error;

    const { data: itens } = await supabase
        .schema('malharia')
        .from('processo_item')
        .select('*, item:item_id(nome)')
        .eq('processo_id', id);

    return { ...processo, itens: itens || [] };
};

// Verifica se já existe um processo com esse número
async function verificarNumeroExistente(numero, ignorarId = null) {
    let query = supabase
        .schema('malharia')
        .from(TABLE)
        .select('id')
        .eq('numero_processo', numero);

    if (ignorarId) {
        query = query.neq('id', ignorarId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data.length > 0;
}

exports.createProcessoComItens = async (processoData, itensData) => {
    const existe = await verificarNumeroExistente(processoData.numero_processo);
    if (existe) {
        throw new Error(`O número de processo "${processoData.numero_processo}" já está cadastrado!`);
    }

    const { data: processo, error: errProc } = await supabase
        .schema('malharia')
        .from(TABLE)
        .insert([processoData])
        .select()
        .single();

    if (errProc) throw errProc;

    if (itensData && itensData.length > 0) {
        const itensFormatados = itensData.map(item => ({
            ...item,
            processo_id: processo.id
        }));

        const { error: errItens } = await supabase
            .schema('malharia')
            .from('processo_item')
            .insert(itensFormatados);
            
        if (errItens) throw new Error("Erro ao salvar itens: " + errItens.message);
    }
    return processo;
};

exports.updateProcessoComItens = async (id, processoData, itensData) => {
    const existe = await verificarNumeroExistente(processoData.numero_processo, id);
    if (existe) {
        throw new Error(`O número de processo "${processoData.numero_processo}" já pertence a outro registro!`);
    }

    const { error: errProc } = await supabase
        .schema('malharia')
        .from(TABLE)
        .update(processoData)
        .eq('id', id);
    
    if (errProc) throw errProc;

    // Remove itens antigos e insere os novos (atualização completa)
    await supabase.schema('malharia').from('processo_item').delete().eq('processo_id', id);

    if (itensData && itensData.length > 0) {
        const itensFormatados = itensData.map(item => ({
            ...item,
            processo_id: id
        }));
        const { error: errItens } = await supabase
            .schema('malharia')
            .from('processo_item')
            .insert(itensFormatados);
            
        if (errItens) throw errItens;
    }
    return true;
};

exports.deleteProcesso = async (id) => {
    const { error } = await supabase.schema('malharia').from(TABLE).delete().eq('id', id);
    if (error) throw error;
    return true;
};