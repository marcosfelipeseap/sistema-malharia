const registrosService = require('../services/registros.service');
const malhariasService = require('../services/malharias.service');

exports.index = async (req, res) => {
    try {
        let malharias = await malhariasService.getAllMalharias();
        
        // Filtro de permissão
        if (req.user.cargo === 'monitor') {
            const permitidas = (req.user.malharias_permitidas || []).map(String);
            malharias = malharias.filter(m => permitidas.includes(String(m.id)));
        }

        const todosRegistros = await registrosService.getAllRegistros();
        
        let estoque = {};

        // Inicializa as malharias com um contador de 'total_geral' zerado
        malharias.forEach(m => {
            estoque[m.id] = { id: m.id, nome: m.nome, tipo: m.tipo, processos: {}, total_geral: 0 };
        });

        // Contabiliza o histórico
        todosRegistros.forEach(reg => {
            const malhariaId = reg.malharia_id;
            
            // Verifica se a malharia do registro está nas malharias permitidas para este usuário
            const malhariaPermitida = req.user.cargo === 'monitor' 
                ? (req.user.malharias_permitidas || []).map(String).includes(String(malhariaId))
                : true;

            if (malhariaPermitida && estoque[malhariaId] && reg.itens && reg.itens.length > 0) {
                reg.itens.forEach(item => {
                    if (item.qtd_produzida > 0 && item.processo) {
                        const procId = item.processo_id;
                        const itemId = item.item_id;
                        
                        let desc = item.descricao || (item.item ? item.item.descricao : '');
                        let tam = item.tamanho || (item.item ? item.item.tamanho : '');
                        let nomeItem = item.item ? item.item.nome : 'Desconhecido';

                        // Soma o total geral desta malharia
                        estoque[malhariaId].total_geral += item.qtd_produzida;

                        if (!estoque[malhariaId].processos[procId]) {
                            estoque[malhariaId].processos[procId] = {
                                id: procId, numero_processo: item.processo.numero_processo, orgao: item.processo.orgao, itens: {}
                            };
                        }

                        if (!estoque[malhariaId].processos[procId].itens[itemId]) {
                            estoque[malhariaId].processos[procId].itens[itemId] = {
                                nome: nomeItem, descricao: desc, tamanho: tam, total_produzido: 0
                            };
                        }
                        estoque[malhariaId].processos[procId].itens[itemId].total_produzido += item.qtd_produzida;
                    }
                });
            }
        });

        res.render('estoque/index', { 
            title: 'Estoque Consolidado', 
            estoque: Object.values(estoque)
        });
    } catch (error) {
        console.error("Erro ao carregar estoque:", error);
        res.redirect('/');
    }
};