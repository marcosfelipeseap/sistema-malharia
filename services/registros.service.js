const supabase = require('../config/supabaseClient');

const TABLE = 'registro_diario';

// Lista registros com joins para trazer nomes de Malharia e Processo
exports.getAllRegistros = async () => {
    const { data, error } = await supabase
        .schema('malharia')
        .from(TABLE)
        .select(`
            *,
            malharia:malharia_id (nome),
            processo:processo_id (nome)
        `)
        .order('data_registro', { ascending: false });

    if (error) throw error;
    return data;
};

// Cria um novo registro de produção
exports.createRegistro = async (registroData) => {
    const { data, error } = await supabase
        .schema('malharia')
        .from(TABLE)
        .insert([registroData])
        .select();

    if (error) throw error;
    return data;
};

// Remove um registro
exports.deleteRegistro = async (id) => {
    const { error } = await supabase
        .schema('malharia')
        .from(TABLE)
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
};