const supabase = require('../config/supabaseClient');

exports.getAllTransferencias = async () => {
    // Tenta buscar as transferências fazendo join para pegar o nome do solicitante
    const { data, error } = await supabase
        .from('transferencias_estoque')
        .select(`
            *,
            processo (*),
            item (*),
            solicitante:usuarios!transferencias_estoque_usuario_id_fkey(nome)
        `);
        
    if (error) {
        console.error("Erro ao buscar transferencias:", error);
        // Fallback de segurança caso o nome da chave estrangeira seja diferente
        const { data: fallbackData } = await supabase
            .from('transferencias_estoque')
            .select('*, processo(*), item(*)');
        return fallbackData || [];
    }
    return data;
};

exports.createTransferencia = async (dados) => {
    const arrDados = Array.isArray(dados) ? dados : [dados];
    
    // Todas nascem como 'pendente' por padrão
    const { data, error } = await supabase
        .from('transferencias_estoque')
        .insert(arrDados)
        .select();
        
    if (error) throw error;
    return data;
};

exports.updateTransferencia = async (id, dados) => {
    const { data, error } = await supabase
        .from('transferencias_estoque')
        .update(dados)
        .eq('id', id)
        .select();
        
    if (error) throw error;
    return data;
};