const supabase = require('../config/supabaseClient');

const TABLE_REGISTRO = 'registro_diario';
const TABLE_ITENS = 'registro_diario_item';

exports.getAllRegistros = async () => {
    const { data, error } = await supabase
        .schema('malharia')
        .from(TABLE_REGISTRO)
        .select(`
            *,
            malharia:malharia_id (nome),
            justificativa:justificativa_id (nome),
            itens:registro_diario_item(
                qtd_produzida,
                processo:processo_id(numero_processo),
                item:item_id(nome)
            )
        `)
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
    // 1. Cria o registro principal
    const { data: registro, error: errReg } = await supabase
        .schema('malharia')
        .from(TABLE_REGISTRO)
        .insert([dadosRegistro])
        .select()
        .single();

    if (errReg) throw errReg;

    // 2. Insere os itens produzidos (produtos de diferentes processos)
    if (itensProduzidos && itensProduzidos.length > 0) {
        const itensParaSalvar = itensProduzidos.map(item => ({
            registro_id: registro.id,
            processo_id: item.processo_id,
            item_id: item.item_id,
            qtd_produzida: item.qtd_produzida
        }));

        const { error: errItens } = await supabase
            .schema('malharia')
            .from(TABLE_ITENS)
            .insert(itensParaSalvar);

        if (errItens) throw errItens;
    }

    return registro;
};

exports.deleteRegistro = async (id) => {
    const { error } = await supabase.schema('malharia').from(TABLE_REGISTRO).delete().eq('id', id);
    if (error) throw error;
    return true;
};

// Procura todos os registos de um DIA específico
exports.getRegistrosByData = async (dataBusca) => {
    const { data, error } = await supabase
        .schema('malharia')
        .from(TABLE_REGISTRO)
        .select(`
            *,
            malharia:malharia_id (id, nome, tipo),
            justificativa:justificativa_id (nome),
            itens:registro_diario_item(
                qtd_produzida,
                processo:processo_id(id, numero_processo, orgao),
                item:item_id(id, nome)
            )
        `)
        .eq('data_registro', dataBusca)
        .order('criado_em', { ascending: false });

    if (error) throw error;
    return data;
};

// Pega um registo específico para a tela de Edição
exports.getRegistroById = async (id) => {
    const { data, error } = await supabase
        .schema('malharia')
        .from(TABLE_REGISTRO)
        .select(`
            *,
            malharia:malharia_id (nome, num_internos),
            justificativa:justificativa_id (nome),
            itens:registro_diario_item(
                processo_id,
                item_id,
                qtd_produzida,
                processo:processo_id(numero_processo),
                item:item_id(nome)
            )
        `)
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
};

// Atualiza um registo e recria a lista de produtos dele
exports.updateRegistroComItens = async (id, dadosRegistro, itensProduzidos) => {
    // 1. Atualiza cabecalho
    const { error: errReg } = await supabase.schema('malharia').from(TABLE_REGISTRO).update(dadosRegistro).eq('id', id);
    if (errReg) throw errReg;

    // 2. Apaga itens antigos
    const { error: errDel } = await supabase.schema('malharia').from('registro_diario_item').delete().eq('registro_id', id);
    if (errDel) throw errDel;

    // 3. Insere novos itens
    if (itensProduzidos && itensProduzidos.length > 0) {
        const itensParaSalvar = itensProduzidos.map(item => ({
            registro_id: id,
            processo_id: item.processo_id,
            item_id: item.item_id,
            qtd_produzida: item.qtd_produzida
        }));
        const { error: errItens } = await supabase.schema('malharia').from('registro_diario_item').insert(itensParaSalvar);
        if (errItens) throw errItens;
    }
    return true;
};