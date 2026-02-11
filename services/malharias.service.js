const supabase = require('../config/supabaseClient');

const TABLE = 'malharia';

// Busca todas as malharias, idealmente trazendo dados da unidade relacionada (join simples via query se necessário, ou ID)
exports.getAllMalharias = async () => {
    // Nota: O Supabase permite joins com select('*, unidade(nome)'). 
    // Assumindo relacionamento FK configurado no banco: malharia.unidade_id -> unidade.id
    const { data, error } = await supabase
        .schema('malharia')
        .from(TABLE)
        .select(`
            *,
            unidade:unidade_id (
                nome
            )
        `)
        .order('nome', { ascending: true });

    if (error) throw error;
    return data;
};

exports.getMalhariaById = async (id) => {
    const { data, error } = await supabase
        .schema('malharia')
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
};

exports.createMalharia = async (malhariaData) => {
    const { data, error } = await supabase
        .schema('malharia')
        .from(TABLE)
        .insert([malhariaData])
        .select();

    if (error) throw error;
    return data;
};

exports.updateMalharia = async (id, malhariaData) => {
    const { data, error } = await supabase
        .schema('malharia')
        .from(TABLE)
        .update(malhariaData)
        .eq('id', id)
        .select();

    if (error) throw error;
    return data;
};

exports.deleteMalharia = async (id) => {
    const { error } = await supabase
        .schema('malharia')
        .from(TABLE)
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
};