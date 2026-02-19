const registrosService = require('../services/registros.service');
const processosService = require('../services/processos.service');
const malhariasService = require('../services/malharias.service');
const itensService = require('../services/itens.service');

exports.index = async (req, res) => {
    try {
        const dataBusca = req.query.data || new Date().toISOString().split('T')[0];
        const registros = await registrosService.getRegistrosByData(dataBusca);
        const todasMalharias = await malhariasService.getAllMalharias();
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
        const todosItens = await require('../services/itens.service').getAllItens(); 
        
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
                    qtd_produzida: parseInt(qtds_produzidas[i]) || 0
                });
            }
        } else if (processos_ids) {
            itensProduzidos.push({ 
                processo_id: processos_ids, 
                item_id: itens_ids, 
                qtd_produzida: parseInt(qtds_produzidas) || 0
            });
        }

        await registrosService.updateRegistroComItens(id, dadosRegistro, itensProduzidos);
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
        const todosItens = await itensService.getAllItens(); 
        
        res.render('registros/create', { 
            title: 'Novo Apontamento',
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

        let itensProduzidos = [];
        if (Array.isArray(processos_ids)) {
            for(let i=0; i < processos_ids.length; i++){
                itensProduzidos.push({
                    processo_id: processos_ids[i],
                    item_id: itens_ids[i],
                    qtd_produzida: parseInt(qtds_produzidas[i]) || 0
                });
            }
        } else if (processos_ids) {
            itensProduzidos.push({ 
                processo_id: processos_ids, 
                item_id: itens_ids, 
                qtd_produzida: parseInt(qtds_produzidas) || 0
            });
        }

        await registrosService.createRegistroComItens(dadosRegistro, itensProduzidos);
        res.redirect('/registros');
    } catch (error) {
        console.error(error);
        res.redirect('/registros/create?error=true'); 
    }
};

exports.getMalhariaInfo = async (req, res) => {
    try {
        const malharia = await malhariasService.getMalhariaById(req.params.id);
        res.json(malharia);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// getSugestoes removido pois não é mais usado na interface

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