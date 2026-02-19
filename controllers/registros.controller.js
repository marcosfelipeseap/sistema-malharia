const registrosService = require('../services/registros.service');
const processosService = require('../services/processos.service');
const malhariasService = require('../services/malharias.service');
const itensService = require('../services/itens.service');

exports.index = async (req, res) => {
    try {
        const dataBusca = req.query.data || new Date().toISOString().split('T')[0];
        const registros = await registrosService.getRegistrosByData(dataBusca);
        const todasMalharias = await malhariasService.getAllMalharias();
        const totalMalharias = todasMalharias.length;

        const malhariasComRegistroIds = registros.map(r => r.malharia_id);
        const malhariasPendentes = todasMalharias.filter(m => !malhariasComRegistroIds.includes(m.id));

        const resumoGeral = await registrosService.getResumoRegistros();
        const primeiraData = resumoGeral.length > 0 ? resumoGeral[0].data_registro : new Date().toISOString().split('T')[0];

        const feriados = await registrosService.getFeriados();

        res.render('registros/index', { 
            title: 'Controlo Diário de Produção', 
            registros,
            todasMalharias, 
            feriados,       
            feriadosJSON: JSON.stringify(feriados), 
            malhariasPendentes,
            dataBusca,
            resumoGeralJSON: JSON.stringify(resumoGeral),
            totalMalharias,
            primeiraData
        });
    } catch (error) {
        console.error(error);
        res.render('partials/alerts', { message: 'Erro ao carregar registros', type: 'danger' });
    }
};

exports.storeFeriado = async (req, res) => {
    try {
        const { data_feriado, descricao, malharia_id } = req.body;
        
        // Se malharia_id vier vazio ou indefinido, é GLOBAL (Todas)
        if (!malharia_id) {
            await registrosService.createFeriado({
                data_feriado,
                malharia_id: null,
                descricao
            });
        } else {
            // Se vier apenas 1 id será string, se vierem vários será um Array. Transformamos sempre em Array para facilitar.
            const idsMalharias = Array.isArray(malharia_id) ? malharia_id : [malharia_id];
            
            // Grava um registo de feriado para cada malharia selecionada
            for (const id of idsMalharias) {
                await registrosService.createFeriado({
                    data_feriado,
                    malharia_id: parseInt(id),
                    descricao
                });
            }
        }
        res.redirect('/registros');
    } catch (error) {
        console.error(error);
        res.redirect('/registros?error=true');
    }
};

exports.destroyFeriado = async (req, res) => {
    try {
        await registrosService.deleteFeriado(req.params.id);
        res.redirect('/registros');
    } catch (error) {
        console.error(error);
        res.redirect('/registros?error=true');
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
            title: 'Editar Apontamento', registro, processos, malharias, justificativas,
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
        const { data_registro, malharia_id, qtd_internos, meta_calculada, explicacao_meta, justificativa_id, observacao, processos_ids, itens_ids, qtds_produzidas } = req.body;

        const dadosRegistro = { data_registro, malharia_id, qtd_internos, meta_calculada, explicacao_meta, justificativa_id: justificativa_id || null, observacao };

        let itensProduzidos = [];
        if (Array.isArray(processos_ids)) {
            for(let i=0; i < processos_ids.length; i++){
                itensProduzidos.push({ processo_id: processos_ids[i], item_id: itens_ids[i], qtd_produzida: parseInt(qtds_produzidas[i]) });
            }
        } else if (processos_ids) {
            itensProduzidos.push({ processo_id: processos_ids, item_id: itens_ids, qtd_produzida: parseInt(qtds_produzidas) });
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
        res.render('registros/create', { title: 'Novo Apontamento', processos, malharias, justificativas, todosItensJSON: JSON.stringify(todosItens) });
    } catch (error) {
        res.redirect('/registros');
    }
};

exports.store = async (req, res) => {
    try {
        const { data_registro, malharia_id, qtd_internos, meta_calculada, explicacao_meta, justificativa_id, observacao, processos_ids, itens_ids, qtds_produzidas } = req.body;
        const dadosRegistro = { data_registro: data_registro || new Date(), malharia_id, qtd_internos, meta_calculada, explicacao_meta, justificativa_id: justificativa_id || null, observacao, criado_por: req.user ? req.user.id : null };

        let itensProduzidos = [];
        if (Array.isArray(processos_ids)) {
            for(let i=0; i < processos_ids.length; i++){
                itensProduzidos.push({ processo_id: processos_ids[i], item_id: itens_ids[i], qtd_produzida: qtds_produzidas[i] });
            }
        } else if (processos_ids) {
            itensProduzidos.push({ processo_id: processos_ids, item_id: itens_ids, qtd_produzida: qtds_produzidas });
        }

        await registrosService.createRegistroComItens(dadosRegistro, itensProduzidos);
        res.redirect('/registros');
    } catch (error) {
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

exports.destroy = async (req, res) => {
    try {
        await registrosService.deleteRegistro(req.params.id);
        res.redirect('/registros');
    } catch (error) {
        res.redirect('/registros?error=true');
    }
};