const registrosService = require('../services/registros.service');
const processosService = require('../services/processos.service');
const malhariasService = require('../services/malharias.service');
const itensService = require('../services/itens.service');

exports.index = async (req, res) => {
    try {
        // Pega a data da URL ou usa a data de hoje como padrão
        const dataBusca = req.query.data || new Date().toISOString().split('T')[0];
        
        // Procura registos APENAS da data selecionada
        const registros = await registrosService.getRegistrosByData(dataBusca);
        
        // Pega todas as malharias ativas do sistema
        const todasMalharias = await malhariasService.getAllMalharias();
        
        // Filtra quais malharias ainda NÃO têm registo nesta data
        const malhariasComRegistroIds = registros.map(r => r.malharia_id);
        const malhariasPendentes = todasMalharias.filter(m => !malhariasComRegistroIds.includes(m.id));

        res.render('registros/index', { 
            title: 'Registro Diário de Produção', 
            registros,
            malhariasPendentes,
            dataBusca
        });
    } catch (error) {
        console.error(error);
        res.render('partials/alerts', { message: 'Erro ao carregar registros', type: 'danger' });
    }
};

exports.edit = async (req, res) => {
    try {
        const { id } = req.params;
        const registro = await registrosService.getRegistroById(id);
        const processos = await processosService.getAllProcessos();
        const malharias = await malhariasService.getAllMalharias();
        const justificativas = await registrosService.getTiposJustificativa();
        const todosItens = await require('../services/itens.service').getAllItens(); // Chama o service de itens
        
        res.render('registros/edit', { 
            title: 'Editar Apontamento',
            registro,
            processos,
            malharias,
            justificativas,
            todosItensJSON: JSON.stringify(todosItens)
        });
    } catch (error) {
        console.error(error);
        res.redirect('/registros');
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            data_registro, malharia_id, qtd_internos, meta_calculada, 
            explicacao_meta, justificativa_id, observacao, 
            processos_ids, itens_ids, qtds_produzidas 
        } = req.body;

        const dadosRegistro = {
            data_registro,
            malharia_id,
            qtd_internos,
            meta_calculada,
            explicacao_meta,
            justificativa_id: justificativa_id || null,
            observacao
        };

        let itensProduzidos = [];
        if (Array.isArray(processos_ids)) {
            for(let i=0; i < processos_ids.length; i++){
                itensProduzidos.push({
                    processo_id: processos_ids[i],
                    item_id: itens_ids[i],
                    qtd_produzida: parseInt(qtds_produzidas[i])
                });
            }
        } else if (processos_ids) {
            itensProduzidos.push({ processo_id: processos_ids, item_id: itens_ids, qtd_produzida: parseInt(qtds_produzidas) });
        }

        await registrosService.updateRegistroComItens(id, dadosRegistro, itensProduzidos);
        // Redireciona de volta para o calendário no mesmo dia que foi editado
        res.redirect(`/registros?data=${data_registro}`);
    } catch (error) {
        console.error(error);
        res.redirect(`/registros/${req.params.id}/edit?error=true`); 
    }
};

exports.create = async (req, res) => {
    try {
        const processos = await processosService.getAllProcessos();
        const malharias = await malhariasService.getAllMalharias();
        const justificativas = await registrosService.getTiposJustificativa();
        const todosItens = await itensService.getAllItens(); // Para pegar dados de meta e maquinários
        
        res.render('registros/create', { 
            title: 'Novo Apontamento',
            processos,
            malharias,
            justificativas,
            todosItensJSON: JSON.stringify(todosItens) // Passa pro frontend calcular metas
        });
    } catch (error) {
        console.error(error);
        res.redirect('/registros');
    }
};

exports.store = async (req, res) => {
    try {
        const { 
            data_registro, malharia_id, qtd_internos, meta_calculada, 
            explicacao_meta, justificativa_id, observacao, 
            processos_ids, itens_ids, qtds_produzidas 
        } = req.body;

        const dadosRegistro = {
            data_registro: data_registro || new Date(),
            malharia_id,
            qtd_internos,
            meta_calculada,
            explicacao_meta,
            justificativa_id: justificativa_id || null,
            observacao,
            criado_por: req.user ? req.user.id : null
        };

        // Formata os arrays do form em objetos
        let itensProduzidos = [];
        if (Array.isArray(processos_ids)) {
            for(let i=0; i < processos_ids.length; i++){
                itensProduzidos.push({
                    processo_id: processos_ids[i],
                    item_id: itens_ids[i],
                    qtd_produzida: qtds_produzidas[i]
                });
            }
        } else if (processos_ids) {
            itensProduzidos.push({ processo_id: processos_ids, item_id: itens_ids, qtd_produzida: qtds_produzidas });
        }

        await registrosService.createRegistroComItens(dadosRegistro, itensProduzidos);
        res.redirect('/registros');
    } catch (error) {
        console.error(error);
        res.redirect('/registros/create?error=true'); 
    }
};

// --- APIs para o Frontend ---
exports.getMalhariaInfo = async (req, res) => {
    try {
        const malharia = await malhariasService.getMalhariaById(req.params.id);
        res.json(malharia);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getSugestoes = async (req, res) => {
    // Retorna processos inacabados que tiveram apontamento recente nesta malharia
    try {
        const { data, error } = await require('../config/supabaseClient')
            .schema('malharia')
            .rpc('get_processos_sugeridos_malharia', { p_malharia_id: req.params.malharia_id }); // RPC ideal, mas faremos via query direta abaixo para facilitar
        
        // Forma simples sem RPC:
        const { data: registrosAntigos } = await require('../config/supabaseClient')
            .schema('malharia')
            .from('registro_diario')
            .select('itens:registro_diario_item(processo:processo_id(id, numero_processo, orgao))')
            .eq('malharia_id', req.params.malharia_id)
            .order('data_registro', { ascending: false })
            .limit(5);

        // Extrai processos únicos
        let processos = [];
        registrosAntigos?.forEach(reg => {
            reg.itens.forEach(item => {
                if(!processos.find(p => p.id === item.processo.id)) processos.push(item.processo);
            });
        });

        res.json(processos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Método para excluir um registro
exports.destroy = async (req, res) => {
    try {
        const { id } = req.params;
        await registrosService.deleteRegistro(id);
        res.redirect('/registros');
    } catch (error) {
        console.error(error);
        res.redirect('/registros?error=true');
    }
};