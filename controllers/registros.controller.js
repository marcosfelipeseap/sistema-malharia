const registrosService = require('../services/registros.service');
const processosService = require('../services/processos.service');
const malhariasService = require('../services/malharias.service');
const itensService = require('../services/itens.service');

function validarHorarioBrasilia(dataEnviada) {
    const brTime = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const [dataParte] = brTime.split(','); 
    const [dia, mes, ano] = dataParte.trim().split('/');
    const hojeBr = `${ano}-${mes}-${dia}`;
    return dataEnviada === hojeBr;
}

// Filtro robusto para impedir que o banco de dados retorne malharias, itens ou processos duplicados
function removerDuplicatas(array) {
    if (!Array.isArray(array)) return array;
    const map = new Map();
    array.forEach(item => {
        if (item && item.id) map.set(item.id, item);
    });
    return Array.from(map.values());
}

exports.index = async (req, res) => {
    if (req.user.nivel < 3) return res.redirect('/registros/painel');

    try {
        const dataBusca = req.query.data || new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }).split(',')[0].split('/').reverse().join('-');
        
        let registros = await registrosService.getRegistrosByData(dataBusca);
        let todasMalharias = removerDuplicatas(await malhariasService.getAllMalharias());

        if (req.user.cargo === 'monitor') {
            const permitidas = req.user.malharias_permitidas || [];
            todasMalharias = todasMalharias.filter(m => permitidas.includes(m.id));
            registros = registros.filter(r => permitidas.includes(r.malharia_id));
        }

        const totalMalharias = todasMalharias.length;
        const malhariasComRegistroIds = registros.map(r => r.malharia_id);
        const malhariasPendentes = todasMalharias.filter(m => !malhariasComRegistroIds.includes(m.id));

        const resumoGeral = await registrosService.getResumoRegistros();
        const primeiraData = resumoGeral.length > 0 ? resumoGeral[0].data_registro : new Date().toISOString().split('T')[0];

        const feriados = await registrosService.getFeriados();

        res.render('registros/index', { 
            title: 'Controle Diário de Produção', 
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
        res.redirect('/');
    }
};

exports.create = async (req, res) => {
    try {
        const processos = removerDuplicatas(await processosService.getAllProcessos());
        let malharias = removerDuplicatas(await malhariasService.getAllMalharias());
        
        if (req.user.cargo === 'monitor') {
            const permitidas = req.user.malharias_permitidas || [];
            malharias = malharias.filter(m => permitidas.includes(m.id));
        }

        const justificativas = await registrosService.getTiposJustificativa();
        const todosItens = removerDuplicatas(await itensService.getAllItens()); 
        
        res.render('registros/create', { 
            title: 'Novo Apontamento', processos, malharias, justificativas, todosItensJSON: JSON.stringify(todosItens) 
        });
    } catch (error) {
        res.redirect('/registros');
    }
};

exports.painelDiario = async (req, res) => {
    if (req.user.nivel >= 3) return res.redirect('/registros');

    try {
        const brTime = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }).split(',')[0];
        const dataHoje = brTime.split('/').reverse().join('-');
        
        let registrosHoje = await registrosService.getRegistrosByData(dataHoje);
        let todasMalharias = removerDuplicatas(await malhariasService.getAllMalharias());

        const permitidas = req.user.malharias_permitidas || [];
        let minhasMalharias = todasMalharias;
        if (req.user.cargo === 'monitor') {
            minhasMalharias = todasMalharias.filter(m => permitidas.includes(m.id));
        }

        let meusRegistros = registrosHoje.filter(r => minhasMalharias.map(m=>m.id).includes(r.malharia_id));
        const malhariasComRegistroIds = meusRegistros.map(r => r.malharia_id);

        const malhariasPendentes = minhasMalharias.filter(m => !malhariasComRegistroIds.includes(m.id));
        const registrosEmAndamento = meusRegistros;

        res.render('registros/painel_operacional', {
            title: 'Meu Painel de Produção',
            dataHoje,
            malhariasPendentes,
            registrosEmAndamento
        });
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
};

exports.historico = async (req, res) => {
    if (req.user.nivel >= 3) return res.redirect('/registros');

    try {
        const dataBusca = req.query.data || new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }).split(',')[0].split('/').reverse().join('-');
        
        let registros = await registrosService.getRegistrosByData(dataBusca);
        let todasMalharias = removerDuplicatas(await malhariasService.getAllMalharias());

        const permitidas = req.user.malharias_permitidas || [];
        todasMalharias = todasMalharias.filter(m => permitidas.includes(m.id));
        registros = registros.filter(r => permitidas.includes(r.malharia_id));

        const totalMalharias = todasMalharias.length;
        const malhariasComRegistroIds = registros.map(r => r.malharia_id);
        const malhariasPendentes = todasMalharias.filter(m => !malhariasComRegistroIds.includes(m.id));

        const resumoGeral = await registrosService.getResumoRegistros();
        const primeiraData = resumoGeral.length > 0 ? resumoGeral[0].data_registro : new Date().toISOString().split('T')[0];
        const feriados = await registrosService.getFeriados();

        res.render('registros/index', { 
            title: 'Histórico de Produção', 
            registros, todasMalharias, feriados, feriadosJSON: JSON.stringify(feriados), 
            malhariasPendentes, dataBusca, resumoGeralJSON: JSON.stringify(resumoGeral),
            totalMalharias, primeiraData, isHistoricoPainel: true 
        });
    } catch (error) {
        console.error(error);
        res.redirect('/registros/painel');
    }
};

exports.store = async (req, res) => {
    try {
        const { data_registro, malharia_id, qtd_internos, meta_calculada, explicacao_meta, justificativa_id, observacao, processos_ids, itens_ids, qtds_produzidas, sem_producao } = req.body;
        
        if (req.user.nivel < 3) {
            if (!validarHorarioBrasilia(data_registro)) {
                return res.redirect('/registros/painel'); 
            }
        }

        let avisoSistema = null;

        if (req.user.nivel >= 3) {
            const brTime = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
            const [dataParte] = brTime.split(','); 
            const [dia, mes, ano] = dataParte.trim().split('/');
            const hojeBr = `${ano}-${mes}-${dia}`;
            
            const dataEscolhida = data_registro || hojeBr;

            if (dataEscolhida < hojeBr) {
                avisoSistema = 'Registro retroativo inserido com atraso pelo Gestor.';
            } 
        }

        const dadosRegistro = { 
            data_registro: data_registro || new Date(), 
            malharia_id, qtd_internos, meta_calculada, explicacao_meta, 
            justificativa_id: sem_producao ? justificativa_id : (justificativa_id || null), 
            observacao, 
            aviso_sistema: avisoSistema, 
            criado_por: req.user.id 
        };

        let itensProduzidos = [];
        
        if (!sem_producao && processos_ids) {
            if (Array.isArray(processos_ids)) {
                for(let i=0; i < processos_ids.length; i++){
                    itensProduzidos.push({ processo_id: processos_ids[i], item_id: itens_ids[i], qtd_produzida: qtds_produzidas[i] });
                }
            } else if (processos_ids) {
                itensProduzidos.push({ processo_id: processos_ids, item_id: itens_ids, qtd_produzida: qtds_produzidas });
            }
        }

        await registrosService.createRegistroComItens(dadosRegistro, itensProduzidos);
        res.redirect(req.user.nivel < 3 ? '/registros/painel' : '/registros');
    } catch (error) {
        console.error(error);
        res.redirect('/registros'); 
    }
};

exports.edit = async (req, res) => {
    try {
        const { id } = req.params;
        const registro = await registrosService.getRegistroById(id);
        const processos = removerDuplicatas(await processosService.getAllProcessos());
        let malharias = removerDuplicatas(await malhariasService.getAllMalharias());
        
        if (req.user.cargo === 'monitor') {
            const permitidas = req.user.malharias_permitidas || [];
            malharias = malharias.filter(m => permitidas.includes(m.id));
        }

        const justificativas = await registrosService.getTiposJustificativa();
        const todosItens = removerDuplicatas(await itensService.getAllItens()); 
        
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

        if (req.user.nivel < 3) {
            if (!validarHorarioBrasilia(data_registro)) {
                return res.redirect('/registros/painel'); 
            }
        }

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
        
        if (req.user.nivel < 3) return res.redirect('/registros/painel');
        res.redirect(`/registros?data=${data_registro}`);
    } catch (error) {
        console.error(error);
        res.redirect(`/registros`); 
    }
};

exports.destroy = async (req, res) => {
    try {
        await registrosService.deleteRegistro(req.params.id);
        res.redirect('/registros');
    } catch (error) {
        res.redirect('/registros');
    }
};

exports.storeFeriado = async (req, res) => {
    try {
        const { data_feriado, descricao, malharia_id } = req.body;
        if (!malharia_id) {
            await registrosService.createFeriado({ data_feriado, malharia_id: null, descricao });
        } else {
            const idsMalharias = Array.isArray(malharia_id) ? malharia_id : [malharia_id];
            for (const id of idsMalharias) {
                await registrosService.createFeriado({ data_feriado, malharia_id: parseInt(id), descricao });
            }
        }
        res.redirect('/registros');
    } catch (error) {
        res.redirect('/registros');
    }
};

exports.destroyFeriado = async (req, res) => {
    try {
        await registrosService.deleteFeriado(req.params.id);
        res.redirect('/registros');
    } catch (error) {
        res.redirect('/registros');
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