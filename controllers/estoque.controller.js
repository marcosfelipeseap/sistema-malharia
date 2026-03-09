const registrosService = require('../services/registros.service');
const malhariasService = require('../services/malharias.service');
const transferenciasService = require('../services/transferencias.service');
const processosService = require('../services/processos.service');
const supabase = require('../config/supabaseClient'); 

exports.index = async (req, res) => {
    try {
        let malharias = await malhariasService.getAllMalharias();
        
        if (req.user.cargo === 'monitor') {
            const permitidas = (req.user.malharias_permitidas || []).map(String);
            malharias = malharias.filter(m => permitidas.includes(String(m.id)));
        }

        const todosRegistros = await registrosService.getAllRegistros();
        let todasTransferencias = await transferenciasService.getAllTransferencias();
        
        let estoque = {};
        let transferenciasPendentes = []; 
        let minhasPendencias = []; 
        let meuHistorico = [];

        const sedeId = 'sede-central-estoque';
        estoque[sedeId] = { 
            id: sedeId, nome: 'MALHARIA SEDE', tipo: 'Centro de Distribuição', processos: {}, total_geral: 0, isSede: true 
        };

        malharias.forEach(m => {
            estoque[m.id] = { id: m.id, nome: m.nome, tipo: m.tipo, processos: {}, total_geral: 0, isSede: false };
        });

        // 1. Contabiliza toda a produção bruta
        todosRegistros.forEach(reg => {
            const malhariaId = reg.malharia_id;
            const malhariaPermitida = req.user.cargo === 'monitor' ? (req.user.malharias_permitidas || []).map(String).includes(String(malhariaId)) : true;

            if (malhariaPermitida && estoque[malhariaId] && reg.itens && reg.itens.length > 0) {
                reg.itens.forEach(item => {
                    if (item.qtd_produzida > 0 && item.processo) {
                        const procId = item.processo_id;
                        const itemId = item.item_id;
                        let desc = item.descricao || (item.item ? item.item.descricao : '');
                        let tam = item.tamanho || (item.item ? item.item.tamanho : '');
                        let nomeItem = item.item ? item.item.nome : 'Desconhecido';

                        estoque[malhariaId].total_geral += item.qtd_produzida;

                        if (!estoque[malhariaId].processos[procId]) {
                            estoque[malhariaId].processos[procId] = { id: procId, numero_processo: item.processo.numero_processo, orgao: item.processo.orgao, itens: {} };
                        }

                        if (!estoque[malhariaId].processos[procId].itens[itemId]) {
                            estoque[malhariaId].processos[procId].itens[itemId] = {
                                nome: nomeItem, descricao: desc, tamanho: tam, total_produzido: 0, em_transito: 0, entregue: 0
                            };
                        }
                        estoque[malhariaId].processos[procId].itens[itemId].total_produzido += item.qtd_produzida;
                    }
                });
            }
        });

        todasTransferencias.sort((a, b) => new Date(a.data_transferencia) - new Date(b.data_transferencia));

        // 2. Processa as Movimentações e Entregas
        todasTransferencias.forEach(transf => {
            const malhariaId = transf.malharia_origem_id ? String(transf.malharia_origem_id) : sedeId;
            const procId = String(transf.processo_id);
            const itemId = String(transf.item_id);
            const qtd = parseInt(transf.quantidade) || 0;
            const qtdSolicitada = parseInt(transf.quantidade_solicitada) || qtd;
            const tipoDestino = transf.tipo_destino || 'sede';

            const permitidas = req.user.cargo === 'monitor' ? (req.user.malharias_permitidas || []).map(String) : [];
            const pertenceAoUsuario = req.user.cargo === 'monitor' ? (malhariaId === sedeId ? false : permitidas.includes(malhariaId)) : true;
            
            // CORREÇÃO: Força a comparação de ID ser Texto com Texto (String)
            transf.nome_origem = malhariaId === sedeId ? 'MALHARIA SEDE' : (malharias.find(m => String(m.id) === String(malhariaId))?.nome || 'Oficina Desconhecida');

            if (transf.status === 'pendente') {
                transferenciasPendentes.push(transf); 
                if (req.user.nivel < 3 && pertenceAoUsuario) {
                    minhasPendencias.push(transf);
                }
            } else if ((transf.status === 'aprovada' || transf.status === 'rejeitada') && req.user.nivel < 3 && pertenceAoUsuario && !transf.arquivado) {
                const seteDiasAtras = new Date();
                seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
                const dataAv = transf.data_avaliacao ? new Date(transf.data_avaliacao) : new Date(transf.data_transferencia);
                
                if (dataAv >= seteDiasAtras) {
                    transf.timestamp_ordenacao = dataAv.getTime();
                    meuHistorico.push(transf);
                }
            }

            if (transf.status === 'rejeitada') return;

            const qtdAbaterOrigem = transf.status === 'pendente' ? qtdSolicitada : qtd;

            if (estoque[malhariaId] && estoque[malhariaId].processos[procId] && estoque[malhariaId].processos[procId].itens[itemId]) {
                estoque[malhariaId].processos[procId].itens[itemId].total_produzido -= qtdAbaterOrigem;
                estoque[malhariaId].total_geral -= qtdAbaterOrigem;
                
                if (transf.status === 'pendente') {
                    estoque[malhariaId].processos[procId].itens[itemId].em_transito = (estoque[malhariaId].processos[procId].itens[itemId].em_transito || 0) + qtdAbaterOrigem;
                }

                if (transf.status === 'aprovada' && tipoDestino === 'processo') {
                    estoque[malhariaId].processos[procId].itens[itemId].entregue = (estoque[malhariaId].processos[procId].itens[itemId].entregue || 0) + qtd;
                }
            }

            if (transf.status === 'aprovada' && tipoDestino === 'sede') {
                estoque[sedeId].total_geral += qtd;

                if (!estoque[sedeId].processos[procId]) {
                    estoque[sedeId].processos[procId] = { id: procId, numero_processo: transf.processo ? transf.processo.numero_processo : 'S/N', orgao: transf.processo ? transf.processo.orgao : 'Órgão Desconhecido', itens: {} };
                }
                if (!estoque[sedeId].processos[procId].itens[itemId]) {
                    estoque[sedeId].processos[procId].itens[itemId] = { nome: transf.item ? transf.item.nome : 'Item Transferido', descricao: transf.item ? transf.item.descricao : '', tamanho: transf.item ? transf.item.tamanho : '', total_produzido: 0, em_transito: 0, entregue: 0 };
                }
                estoque[sedeId].processos[procId].itens[itemId].total_produzido += qtd;
            }
        });

        let estoqueArray = Object.values(estoque);
        estoqueArray.sort((a, b) => {
            if (a.isSede && !b.isSede) return -1;
            if (!a.isSede && b.isSede) return 1;
            return a.nome.localeCompare(b.nome);
        });

        meuHistorico.sort((a, b) => b.timestamp_ordenacao - a.timestamp_ordenacao);

        res.render('estoque/index', { 
            title: 'Estoque Consolidado', 
            estoque: estoqueArray,
            transferenciasPendentes,
            minhasPendencias,
            meuHistorico
        });
    } catch (error) {
        console.error("Erro ao carregar estoque:", error);
        res.redirect('/');
    }
};

exports.transferir = async (req, res) => {
    try {
        const { malharia_origem_id, processo_id, transferencias_json, tipo_destino } = req.body;
        if (!malharia_origem_id || !processo_id || !transferencias_json) return res.redirect('/estoque');

        // BLOQUEIO DE SEGURANÇA: Se for da Sede e o usuário for Monitor/Coordenador, bloqueia a transferência.
        if (malharia_origem_id === 'sede-central-estoque' && req.user.nivel < 3) {
            return res.redirect('/estoque');
        }

        const itensTransferir = JSON.parse(transferencias_json);
        const statusDaTransferencia = req.user.nivel >= 3 ? 'aprovada' : 'pendente';
        
        const origemDb = malharia_origem_id === 'sede-central-estoque' ? null : malharia_origem_id;
        const destinoFinal = origemDb === null ? 'processo' : (tipo_destino || 'sede');

        const dadosInsert = itensTransferir.map(t => ({
            malharia_origem_id: origemDb,
            processo_id,
            item_id: t.item_id,
            quantidade: parseInt(t.quantidade),
            quantidade_solicitada: parseInt(t.quantidade),
            usuario_id: req.user.id,
            status: statusDaTransferencia,
            tipo_destino: destinoFinal
        })).filter(t => t.quantidade > 0); 

        if (dadosInsert.length > 0) {
            await transferenciasService.createTransferencia(dadosInsert);
            
            if (statusDaTransferencia === 'aprovada' && destinoFinal === 'processo') {
                for (let t of dadosInsert) {
                    await processosService.registrarEntregaDeEstoque(t.processo_id, t.item_id, t.quantidade);
                }
            }
        }
        res.redirect('/estoque');
    } catch (error) {
        console.error("Erro ao transferir:", error);
        res.redirect('/estoque');
    }
};

exports.aprovar = async (req, res) => {
    try {
        const { id_transferencia, quantidade_aprovada } = req.body;
        
        const { data: transf } = await supabase
            .schema('malharia')
            .from('transferencias_estoque')
            .select('*')
            .eq('id', id_transferencia)
            .single();

        await transferenciasService.updateTransferencia(id_transferencia, {
            status: 'aprovada',
            quantidade: parseInt(quantidade_aprovada), 
            avaliador_id: req.user.id,
            data_avaliacao: new Date()
        });
        
        if (transf && transf.tipo_destino === 'processo') {
            await processosService.registrarEntregaDeEstoque(transf.processo_id, transf.item_id, parseInt(quantidade_aprovada));
        }

        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.json({ success: true });
        }
        res.redirect('/estoque');
    } catch (error) {
        console.error(error);
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(500).json({ success: false, error: 'Erro ao aprovar' });
        }
        res.redirect('/estoque');
    }
};

exports.rejeitar = async (req, res) => {
    try {
        const { id_transferencia } = req.body;
        await transferenciasService.updateTransferencia(id_transferencia, {
            status: 'rejeitada',
            avaliador_id: req.user.id,
            data_avaliacao: new Date()
        });
        
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.json({ success: true });
        }
        res.redirect('/estoque');
    } catch (error) {
        console.error(error);
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(500).json({ success: false, error: 'Erro ao rejeitar' });
        }
        res.redirect('/estoque');
    }
};

exports.arquivar = async (req, res) => {
    try {
        const { id_transferencia } = req.body;
        await transferenciasService.updateTransferencia(id_transferencia, { arquivado: true });
        
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.json({ success: true });
        }
        res.redirect('/estoque');
    } catch (error) {
        console.error(error);
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(500).json({ success: false, error: 'Erro ao arquivar' });
        }
        res.redirect('/estoque');
    }
};