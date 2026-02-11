const itensService = require('../services/itens.service');

exports.index = async (req, res) => {
    try {
        const itens = await itensService.getAllItens();
        res.render('itens/index', { 
            title: 'Catálogo de Itens', 
            itens 
        });
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
        const { nome, tipo, unidade_medida, estoque_atual, custo_unitario } = req.body;
        
        await itensService.createItem({
            nome,
            tipo, // Ex: Fio, Tecido Cru, Tecido Tinto, Peça Pronta
            unidade_medida, // Ex: KG, Metro, Unidade
            estoque_atual: estoque_atual || 0,
            custo_unitario: custo_unitario || 0.00
        });

        res.redirect('/itens');
    } catch (error) {
        console.error(error);
        res.render('itens/create', { 
            title: 'Novo Item', 
            error: 'Erro ao criar item. Verifique os dados.' 
        });
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
        const { nome, tipo, unidade_medida, estoque_atual, custo_unitario } = req.body;

        await itensService.updateItem(id, {
            nome,
            tipo,
            unidade_medida,
            estoque_atual,
            custo_unitario
        });

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