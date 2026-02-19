const supabase = require('../config/supabaseClient');

const TABLE_REGISTRO = 'registro_diario';
const TABLE_ITENS = 'registro_diario_item';
const TABLE_FERIADO = 'feriado'; // Tabela nova

exports.getAllRegistros = async () => {
    const { data, error } = await supabase
        .schema('malharia')
        .from(TABLE_REGISTRO)
        .select(`*, malharia:malharia_id (nome), justificativa:justificativa_id (nome), itens:registro_diario_item(qtd_produzida, processo:processo_id(numero_processo), item:item_id(nome))`)
        .order('data_registro', { ascending: false });
    if (error) throw error;
    return data;
};

exports.getTiposJustificativa = async () => {
    const { data, error } = await supabase.schema('malharia').from('tipo_justificativa').select('*').order('nome');
    if (error) throw error;
    return data;
};

exports.createRegistroComItens = async (dadosRegistro, itensProduzidos) => {
    const { data: registro, error: errReg } = await supabase.schema('malharia').from(TABLE_REGISTRO).insert([dadosRegistro]).select().single();
    if (errReg) throw errReg;

    if (itensProduzidos && itensProduzidos.length > 0) {
        const itensParaSalvar = itensProduzidos.map(item => ({
            registro_id: registro.id, processo_id: item.processo_id, item_id: item.item_id, qtd_produzida: item.qtd_produzida
        }));
        const { error: errItens } = await supabase.schema('malharia').from(TABLE_ITENS).insert(itensParaSalvar);
        if (errItens) throw errItens;
    }
    return registro;
};

exports.deleteRegistro = async (id) => {
    const { error } = await supabase.schema('malharia').from(TABLE_REGISTRO).delete().eq('id', id);
    if (error) throw error;
    return true;
};

exports.getRegistrosByData = async (dataBusca) => {
    const { data, error } = await supabase
        .schema('malharia')
        .from(TABLE_REGISTRO)
        .select(`*, malharia:malharia_id (id, nome, tipo), justificativa:justificativa_id (nome), itens:registro_diario_item(qtd_produzida, processo:processo_id(id, numero_processo, orgao), item:item_id(id, nome))`)
        .eq('data_registro', dataBusca)
        .order('criado_em', { ascending: false });
    if (error) throw error;
    return data;
};

exports.getRegistroById = async (id) => {
    const { data, error } = await supabase
        .schema('malharia')
        .from(TABLE_REGISTRO)
        .select(`*, malharia:malharia_id (nome, num_internos), justificativa:justificativa_id (nome), itens:registro_diario_item(processo_id, item_id, qtd_produzida, processo:processo_id(numero_processo), item:item_id(nome))`)
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
};

exports.updateRegistroComItens = async (id, dadosRegistro, itensProduzidos) => {
    const { error: errReg } = await supabase.schema('malharia').from(TABLE_REGISTRO).update(dadosRegistro).eq('id', id);
    if (errReg) throw errReg;

    const { error: errDel } = await supabase.schema('malharia').from('registro_diario_item').delete().eq('registro_id', id);
    if (errDel) throw errDel;

    if (itensProduzidos && itensProduzidos.length > 0) {
        const itensParaSalvar = itensProduzidos.map(item => ({
            registro_id: id, processo_id: item.processo_id, item_id: item.item_id, qtd_produzida: item.qtd_produzida
        }));
        const { error: errItens } = await supabase.schema('malharia').from('registro_diario_item').insert(itensParaSalvar);
        if (errItens) throw errItens;
    }
    return true;
};

exports.getResumoRegistros = async () => {
    const { data, error } = await supabase.schema('malharia').from(TABLE_REGISTRO).select('data_registro, malharia_id').order('data_registro', { ascending: true });
    if (error) throw error;
    return data || [];
};

// ================= NOVAS FUNÇÕES DE FERIADOS =================
exports.getFeriados = async () => {
    const { data, error } = await supabase.schema('malharia').from(TABLE_FERIADO).select('*, malharia:malharia_id(nome)').order('data_feriado', { ascending: true });
    if (error) throw error;
    return data || [];
};

exports.createFeriado = async (dados) => {
    const { data, error } = await supabase.schema('malharia').from(TABLE_FERIADO).insert([dados]).select().single();
    if (error) throw error;
    return data;
};

exports.deleteFeriado = async (id) => {
    const { error } = await supabase.schema('malharia').from(TABLE_FERIADO).delete().eq('id', id);
    if (error) throw error;
    return true;
};