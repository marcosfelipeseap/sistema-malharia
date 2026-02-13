const itensService = require('../services/itens.service');
const maquinariosService = require('../services/maquinarios.service');

// Lista todos os itens (Com suporte a JSON para pesquisa instantânea)
exports.index = async (req, res) => {
    try {
        const busca = req.query.busca || '';
        // Captura mensagem de erro da URL, se houver
        const error = req.query.error || null; 
        
        const itens = await itensService.getAllItens(busca);

        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({ itens });
        }

        // Passamos a variável 'error' para a view
        res.render('itens/index', { title: 'Itens / Produtos', itens, busca, error });
    } catch (error) {
        console.error("ERRO NO INDEX:", error);
        if (req.xhr) return res.status(500).json({ error: 'Erro ao buscar' });
        res.render('partials/alerts', { message: 'Erro ao carregar itens', type: 'danger' });
    }
};

exports.create = async (req, res) => {
    try {
        const maquinas = await maquinariosService.getAllMaquinas();
        res.render('itens/create', { title: 'Novo Item', maquinas, error: null, formData: {} });
    } catch (error) {
        res.redirect('/itens');
    }
};

exports.store = async (req, res) => {
    try {
        const { nome, descricao, meta_diaria, maquina_id } = req.body;
        
        await itensService.createItem(
            { nome, descricao, meta_diaria: parseInt(meta_diaria) || 0 }, 
            maquina_id 
        );
        
        res.redirect('/itens');
    } catch (error) {
        console.error(error);
        const maquinas = await maquinariosService.getAllMaquinas();
        res.render('itens/create', { 
            title: 'Novo Item', 
            maquinas, 
            error: 'Erro ao salvar: ' + error.message, 
            formData: req.body 
        });
    }
};

exports.edit = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await itensService.getItemById(id);
        const maquinas = await maquinariosService.getAllMaquinas();

        if (!item) return res.redirect('/itens');

        res.render('itens/edit', { title: 'Editar Item', item, maquinas, error: null });
    } catch (error) {
        res.redirect('/itens');
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, descricao, meta_diaria, maquina_id } = req.body;

        await itensService.updateItem(
            id, 
            { nome, descricao, meta_diaria: parseInt(meta_diaria) || 0 }, 
            maquina_id
        );
        
        res.redirect('/itens');
    } catch (error) {
        res.redirect(`/itens/${req.params.id}/edit`);
    }
};

exports.destroy = async (req, res) => {
    try {
        await itensService.deleteItem(req.params.id);
        res.redirect('/itens');
    } catch (error) {
        console.error("ERRO NO DESTROY:", error);
        
        let msg = 'Erro ao excluir item.';
        // Verifica se é o erro de chave estrangeira (FK)
        if (error.code === '23503') {
            msg = 'Não é possível excluir este item pois ele faz parte de um ou mais processos.';
        }
        
        // Redireciona com o erro na URL
        res.redirect(`/itens?error=${encodeURIComponent(msg)}`);
    }
};

exports.apiStore = async (req, res) => {
    try {
        const { nome } = req.body;
        const item = await itensService.createItem({ nome }, []); 
        res.status(201).json(item);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};