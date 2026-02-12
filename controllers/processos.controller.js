const processosService = require('../services/processos.service');
const multer = require('multer');

// Configuração do Multer (Armazenamento em memória para envio ao Supabase)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

exports.upload = upload; // Exporta para usar nas rotas se necessário

// API para buscar itens (usada pelo botão de recarregar)
exports.getItensApi = async (req, res) => {
    try {
        const itens = await processosService.getAllItensDisponiveis();
        res.json(itens);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar itens' });
    }
};

exports.index = async (req, res) => {
    try {
        const busca = req.query.busca || '';
        const processos = await processosService.getAllProcessos(busca);
        res.render('processos/index', { title: 'Dashboard de Processos', processos, busca });
    } catch (error) {
        console.error(error);
        res.render('partials/alerts', { message: 'Erro ao carregar processos', type: 'danger' });
    }
};

exports.create = async (req, res) => {
    let itens = [];
    try {
        itens = await processosService.getAllItensDisponiveis();
    } catch (error) {
        console.error("Erro ao carregar itens para o formulário:", error);
    }
    
    res.render('processos/create', { 
        title: 'Novo Processo', 
        itens: itens || [], 
        error: null, 
        formData: {} 
    });
};

// Helper para tratar os dados do formulário
const parseItensFromBody = (body) => {
    const toArray = (val) => (val === undefined || val === null) ? [] : (Array.isArray(val) ? val : [val]);

    const ids = toArray(body.item_id);
    const tamanhos = toArray(body.tamanho); // <--- CAPTURA OS TAMANHOS
    const qSols = toArray(body.qtd_solicitada);
    const qAuts = toArray(body.qtd_autorizada);
    const qEnts = toArray(body.qtd_entregue);
    const qFals = toArray(body.qtd_faltante);
    const dPrazos = toArray(body.data_prazo);

    return ids.map((id, i) => ({
        item_id: parseInt(id),
        tamanho: tamanhos[i] || null, // <--- SALVA O TAMANHO
        qtd_solicitada: parseInt(qSols[i]) || 0,
        qtd_autorizada: parseInt(qAuts[i]) || 0,
        qtd_entregue: parseInt(qEnts[i]) || 0,
        qtd_faltante: parseInt(qFals[i]) || 0,
        data_prazo: dPrazos[i] || null
    })).filter(item => item.item_id && !isNaN(item.item_id));
};

exports.store = async (req, res) => {
    try {
        const { numero_processo, orgao, tipo_demanda, data_entrada, situacao, status, observacao } = req.body;
        
        const processoData = {
            numero_processo, orgao, tipo_demanda, 
            data_entrada: data_entrada || null, 
            situacao, status, observacao
        };
        const itensData = parseItensFromBody(req.body);

        await processosService.createProcessoComItens(processoData, itensData);
        res.redirect('/processos');

    } catch (error) {
        console.error("Erro ao criar:", error.message);
        const itens = await processosService.getAllItensDisponiveis();
        res.render('processos/create', { 
            title: 'Novo Processo', 
            itens, 
            error: error.message, 
            formData: req.body 
        });
    }
};

exports.show = async (req, res) => {
    try {
        const { id } = req.params;
        const processo = await processosService.getProcessoById(id);
        if (!processo) return res.redirect('/processos');
        res.render('processos/show', { title: `Processo ${processo.numero_processo}`, processo });
    } catch (error) {
        console.error(error);
        res.redirect('/processos');
    }
};

// --- NOVOS MÉTODOS DE TERMOS ---
exports.storeTermo = async (req, res) => {
    const { id } = req.params;
    try {
        const { numero_termo } = req.body;
        const file = req.file;

        if (!file) throw new Error("Selecione um arquivo PDF.");
        if (file.mimetype !== 'application/pdf') throw new Error("Apenas arquivos PDF são permitidos.");

        await processosService.createTermo(id, numero_termo, file.buffer, file.originalname, file.mimetype);
        
        res.redirect(`/processos/${id}`);
    } catch (error) {
        console.error("Erro ao adicionar termo:", error);
        res.redirect(`/processos/${id}`);
    }
};

exports.destroyTermo = async (req, res) => {
    const { id, termo_id } = req.params;
    try {
        await processosService.deleteTermo(termo_id);
        res.redirect(`/processos/${id}`);
    } catch (error) {
        console.error("Erro ao deletar termo:", error);
        res.redirect(`/processos/${id}`);
    }
};
// -------------------------------

exports.edit = async (req, res) => {
    try {
        const { id } = req.params;
        const processo = await processosService.getProcessoById(id);
        const itensDisponiveis = await processosService.getAllItensDisponiveis();
        
        if (!processo) return res.redirect('/processos');

        res.render('processos/edit', { title: 'Editar Processo', processo, itensDisponiveis, error: null });
    } catch (error) {
        console.error(error);
        res.redirect('/processos');
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { numero_processo, orgao, tipo_demanda, data_entrada, situacao, status, observacao } = req.body;

        const processoData = { 
            numero_processo, orgao, tipo_demanda, 
            data_entrada: data_entrada || null, 
            situacao, status, observacao 
        };
        const itensData = parseItensFromBody(req.body);

        await processosService.updateProcessoComItens(id, processoData, itensData);
        res.redirect(`/processos/${id}`);

    } catch (error) {
        console.error("Erro ao atualizar:", error.message);
        const itensDisponiveis = await processosService.getAllItensDisponiveis();
        
        const processoRecuperado = {
            id: req.params.id,
            ...req.body,
            itens: parseItensFromBody(req.body).map(i => {
                const itemDb = itensDisponiveis.find(db => db.id === i.item_id);
                return { ...i, item: { nome: itemDb ? itemDb.nome : '?' } };
            })
        };

        res.render('processos/edit', { 
            title: 'Editar Processo', 
            processo: processoRecuperado, 
            itensDisponiveis, 
            error: error.message 
        });
    }
};

exports.destroy = async (req, res) => {
    try {
        const { id } = req.params;
        await processosService.deleteProcesso(id);
        res.redirect('/processos');
    } catch (error) {
        console.error(error);
        res.redirect('/processos');
    }
};