const supabase = require('../config/supabaseClient');

/**
 * Serviço para interagir com a tabela 'processo' no schema 'malharia'
 */
const TABLE = 'processo';

exports.getAllProcessos = async () => {
    // Busca todos os processos ordenados por criação
    const { data, error } = await supabase
        .schema('malharia')
        .from(TABLE)
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
};

exports.getProcessoById = async (id) => {
    const { data, error } = await supabase
        .schema('malharia')
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .single();

    if (error) throw error;
    return data;
};

exports.createProcesso = async (processoData) => {
    // Insere novo processo. Supabase ignora o ID se for auto-increment
    const { data, error } = await supabase
        .schema('malharia')
        .from(TABLE)
        .insert([processoData])
        .select();

    if (error) throw error;
    return data;
};

exports.updateProcesso = async (id, processoData) => {
    const { data, error } = await supabase
        .schema('malharia')
        .from(TABLE)
        .update(processoData)
        .eq('id', id)
        .select();

    if (error) throw error;
    return data;
};

exports.deleteProcesso = async (id) => {
    const { error } = await supabase
        .schema('malharia')
        .from(TABLE)
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
};