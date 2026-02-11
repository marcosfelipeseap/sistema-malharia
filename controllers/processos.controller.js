const processosService = require('../services/processos.service');

// Exibe o dashboard de processos
exports.index = async (req, res) => {
    try {
        const processos = await processosService.getAllProcessos();
        res.render('processos/index', { 
            title: 'Dashboard de Processos',
            processos,
            user: req.user
        });
    } catch (error) {
        console.error(error);
        res.render('partials/alerts', { message: 'Erro ao carregar processos', type: 'danger' });
    }
};

// Renderiza o formulário de criação
exports.create = (req, res) => {
    res.render('processos/create', { title: 'Novo Processo' });
};

// Salva o novo processo
exports.store = async (req, res) => {
    try {
        const { nome, descricao, status, data_inicio, data_fim } = req.body;
        
        await processosService.createProcesso({
            nome,
            descricao,
            status: status || 'Aberto', // Valor padrão
            data_inicio: data_inicio || new Date(),
            data_fim,
            criado_por: req.user.id // Assume que existe coluna para auditoria
        });

        res.redirect('/processos');
    } catch (error) {
        console.error(error);
        res.render('processos/create', { 
            title: 'Novo Processo', 
            error: 'Erro ao criar processo' 
        });
    }
};

// Renderiza o formulário de edição
exports.edit = async (req, res) => {
    try {
        const { id } = req.params;
        const processo = await processosService.getProcessoById(id);
        
        if (!processo) return res.redirect('/processos');

        res.render('processos/edit', { title: 'Editar Processo', processo });
    } catch (error) {
        console.error(error);
        res.redirect('/processos');
    }
};

// Atualiza o processo
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, descricao, status, data_inicio, data_fim } = req.body;

        await processosService.updateProcesso(id, {
            nome,
            descricao,
            status,
            data_inicio,
            data_fim
        });

        res.redirect('/processos');
    } catch (error) {
        console.error(error);
        res.redirect(`/processos/${req.params.id}/edit`);
    }
};

// Remove o processo
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