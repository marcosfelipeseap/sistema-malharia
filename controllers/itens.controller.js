const itensService = require('../services/itens.service');

exports.index = async (req, res) => {
    try {
        const itens = await itensService.getAllItens();
        res.render('itens/index', { title: 'Catálogo de Itens', itens });
    } catch (error) {
        console.error(error);
        res.render('partials/alerts', { message: 'Erro ao carregar itens', type: 'danger' });
    }
};

exports.create = (req, res) => {
    res.render('itens/create', { title: 'Novo Item' });
};

exports.store = async (req, res) => {
    try {
        const { nome } = req.body;
        await itensService.createItem({ nome });
        res.redirect('/itens');
    } catch (error) {
        console.error(error);
        res.render('itens/create', { title: 'Novo Item', error: 'Erro ao criar item.' });
    }
};

// --- ADICIONE ESTA NOVA FUNÇÃO ---
exports.apiStore = async (req, res) => {
    try {
        const { nome } = req.body;
        // O service.createItem retorna um array, pegamos o primeiro item
        const novoItem = await itensService.createItem({ nome });
        
        // Retorna o item criado em formato JSON
        res.status(201).json(novoItem[0]); 
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar item via API' });
    }
};


exports.edit = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await itensService.getItemById(id);
        if (!item) return res.redirect('/itens');
        res.render('itens/edit', { title: 'Editar Item', item });
    } catch (error) {
        console.error(error);
        res.redirect('/itens');
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome } = req.body;
        await itensService.updateItem(id, { nome });
        res.redirect('/itens');
    } catch (error) {
        console.error(error);
        res.redirect(`/itens/${req.params.id}/edit`);
    }
};

exports.destroy = async (req, res) => {
    try {
        const { id } = req.params;
        await itensService.deleteItem(id);
        res.redirect('/itens');
    } catch (error) {
        console.error(error);
        res.redirect('/itens');
    }
};