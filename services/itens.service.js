const supabase = require('../config/supabaseClient');
const TABLE = 'item';

exports.getAllItens = async () => {
    const { data, error } = await supabase
        .schema('malharia')
        .from(TABLE)
        .select('*')
        .order('nome', { ascending: true });
    if (error) throw error;
    return data;
};

exports.getItemById = async (id) => {
    const { data, error } = await supabase
        .schema('malharia')
        .from(TABLE)
        .select('*')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
};

exports.createItem = async (itemData) => {
    const { data, error } = await supabase
        .schema('malharia')
        .from(TABLE)
        .insert([itemData])
        .select();
    if (error) throw error;
    return data;
};

exports.updateItem = async (id, itemData) => {
    const { data, error } = await supabase
        .schema('malharia')
        .from(TABLE)
        .update(itemData)
        .eq('id', id)
        .select();
    if (error) throw error;
    return data;
};

exports.deleteItem = async (id) => {
    const { error } = await supabase
        .schema('malharia')
        .from(TABLE)
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
};