const cortesService = require('../services/cortes.service');
const malhariasService = require('../services/malharias.service');
const processosService = require('../services/processos.service');
const itensService = require('../services/itens.service');
const supabase = require('../config/supabaseClient');

exports.index = async (req, res) => {
    try {
        let malharias = await malhariasService.getAllMalharias();
        if (req.user.cargo === 'monitor') {
            const permitidas = (req.user.malharias_permitidas || []).map(String);
            malharias = malharias.filter(m => permitidas.includes(String(m.id)));
        }

        const todosProcessos = await processosService.getAllProcessos();
        const processosAtivos = todosProcessos.filter(p => p.situacao !== 'Concluído' && p.situacao !== 'Finalizado' && p.status !== 'DEMANDA CONCLUÍDA');
        const todosItens = await itensService.getAllItens();
        const cortes = await cortesService.getAllCortes();

        cortes.forEach(c => {
            c.tamanho_exato = '-';
            c.descricao_exata = '';
            if (c.processo && c.processo.processo_item) {
                const pi = c.processo.processo_item.find(p => String(p.id) === String(c.processo_item_id));
                if (pi) {
                    if (pi.tamanho) c.tamanho_exato = pi.tamanho;
                    if (pi.descricao) c.descricao_exata = pi.descricao;
                }
            }
        });

        const malhariasData = malharias.map(m => {
            const cortesMalharia = cortes.filter(c => String(c.malharia_id) === String(m.id));
            const produtosCortes = {};

            cortesMalharia.forEach(c => {
                const itemKey = `${c.item_id}_${c.tamanho_exato}_${c.descricao_exata}`;
                if (!produtosCortes[itemKey]) {
                    produtosCortes[itemKey] = {
                        item_id: c.item_id,
                        nome: c.item?.nome || 'Item Desconhecido',
                        tamanho: c.tamanho_exato,
                        descricao: c.descricao_exata,
                        total_cortado: 0,
                        historico: []
                    };
                }
                produtosCortes[itemKey].total_cortado += c.quantidade;
                c.numero_processo = c.processo?.numero_processo || 'S/N';
                produtosCortes[itemKey].historico.push(c);
            });

            return {
                id: m.id, nome: m.nome, tipo: m.tipo,
                total_geral: cortesMalharia.reduce((acc, c) => acc + c.quantidade, 0),
                produtos: Object.values(produtosCortes)
            };
        });

        res.render('cortes/index', {
            title: 'Entradas de Cortes', abaAtual: 'entradas',
            malhariasData, malharias,
            processosAtivosJSON: JSON.stringify(processosAtivos),
            todosItensJSON: JSON.stringify(todosItens)
        });
    } catch(error) {
        console.error(error); res.redirect('/');
    }
};

exports.store = async (req, res) => {
    try {
        const { malharia_id, data_corte, processos_ids, processo_item_ids, itens_ids, quantidades } = req.body;
        if (!req.file) return res.send("<script>alert('O comprovante em PDF é obrigatório.'); window.location.href='/cortes';</script>");
        if (!processos_ids) return res.send("<script>alert('Nenhum produto foi adicionado à lista.'); window.location.href='/cortes';</script>");

        const fileExt = 'pdf';
        const fileName = `corte_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `comprovantes/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('comprovantes-cortes').upload(filePath, req.file.buffer, { contentType: 'application/pdf', upsert: false });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('comprovantes-cortes').getPublicUrl(filePath);
        
        const toArray = (val) => Array.isArray(val) ? val : [val];
        const pIds = toArray(processos_ids);
        const pItemIds = toArray(processo_item_ids);
        const iIds = toArray(itens_ids);
        const qtds = toArray(quantidades);

        for (let i = 0; i < pIds.length; i++) {
            if (parseInt(qtds[i]) > 0) {
                await cortesService.createCorte({
                    malharia_id, processo_id: pIds[i], processo_item_id: pItemIds[i], item_id: iIds[i],
                    quantidade: parseInt(qtds[i]), data_corte, documento_comprovante: publicUrlData.publicUrl, usuario_id: req.user.id
                });
            }
        }
        res.redirect('/cortes');
    } catch (error) {
        console.error(error); res.send(`<script>alert('Erro: ${error.message}'); window.location.href='/cortes';</script>`);
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantidade, data_corte } = req.body;
        let dadosUpdate = { quantidade: parseInt(quantidade), data_corte };

        if (req.file) {
            const fileName = `corte_edit_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`;
            const filePath = `comprovantes/${fileName}`;
            const { error: uploadError } = await supabase.storage.from('comprovantes-cortes').upload(filePath, req.file.buffer, { contentType: 'application/pdf', upsert: false });
            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage.from('comprovantes-cortes').getPublicUrl(filePath);
            dadosUpdate.documento_comprovante = publicUrlData.publicUrl;
        }

        await cortesService.updateCorte(id, dadosUpdate);
        res.redirect('/cortes');
    } catch (error) {
        res.send(`<script>alert('Erro: ${error.message}'); window.location.href='/cortes';</script>`);
    }
};

exports.destroy = async (req, res) => {
    try { await cortesService.deleteCorte(req.params.id); res.redirect('/cortes'); } 
    catch (error) { res.redirect('/cortes'); }
};

// ==========================================
// MÓDULO DE CONSUMO DE CORTES
// ==========================================

exports.consumo = async (req, res) => {
    try {
        const dataBusca = req.query.data || new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }).split(',')[0].split('/').reverse().join('-');
        
        let malharias = await malhariasService.getAllMalharias();
        if (req.user.cargo === 'monitor') {
            const permitidas = (req.user.malharias_permitidas || []).map(String);
            malharias = malharias.filter(m => permitidas.includes(String(m.id)));
        }

        const todosCortes = await cortesService.getAllCortes();
        const todasBaixas = await cortesService.getAllBaixas();

        // 1. Calcula o Saldo de Cortes Disponível
        let estoqueDisponivel = {};
        
        todosCortes.forEach(c => {
            const mId = String(c.malharia_id);
            const piId = String(c.processo_item_id);
            
            if (!estoqueDisponivel[mId]) estoqueDisponivel[mId] = {};
            if (!estoqueDisponivel[mId][piId]) {
                const piInfo = c.processo?.processo_item?.find(pi => String(pi.id) === piId);
                estoqueDisponivel[mId][piId] = {
                    processo_item_id: piId, processo_id: c.processo_id,
                    numero_processo: c.processo?.numero_processo || 'S/N', orgao: c.processo?.orgao || '',
                    nome_produto: c.item?.nome || 'Produto', tamanho: piInfo?.tamanho || '-',
                    descricao: piInfo?.descricao || '', total_entradas: 0, total_saidas: 0, disponivel: 0
                };
            }
            estoqueDisponivel[mId][piId].total_entradas += c.quantidade;
        });

        todasBaixas.forEach(b => {
            if (b.status !== 'rejeitada') {
                const mId = String(b.malharia_id);
                const piIdOrigem = String(b.processo_item_origem_id);
                if (estoqueDisponivel[mId] && estoqueDisponivel[mId][piIdOrigem]) {
                    estoqueDisponivel[mId][piIdOrigem].total_saidas += b.quantidade;
                }
            }
        });

        Object.keys(estoqueDisponivel).forEach(mId => {
            Object.keys(estoqueDisponivel[mId]).forEach(piId => {
                const est = estoqueDisponivel[mId][piId];
                est.disponivel = est.total_entradas - est.total_saidas;
                if (est.disponivel <= 0) delete estoqueDisponivel[mId][piId];
            });
        });

        // 2. Baixas do dia
        const baixasDoDia = todasBaixas.filter(b => {
            const permitida = req.user.cargo === 'monitor' ? malharias.map(m=>String(m.id)).includes(String(b.malharia_id)) : true;
            return b.data_baixa === dataBusca && permitida;
        });

        // 3. Resumo pro Calendário
        const resumoCalendario = todasBaixas.map(b => b.data_baixa);

        const todosProcessos = await processosService.getAllProcessos();
        const processosAtivos = todosProcessos.filter(p => p.situacao !== 'Concluído' && p.situacao !== 'Finalizado' && p.status !== 'DEMANDA CONCLUÍDA');

        res.render('cortes/consumo', {
            title: 'Consumo de Cortes', abaAtual: 'consumo',
            dataBusca, malharias,
            estoqueDisponivelJSON: JSON.stringify(estoqueDisponivel),
            processosAtivosJSON: JSON.stringify(processosAtivos),
            baixasDoDia,
            resumoCalendarioJSON: JSON.stringify(resumoCalendario)
        });
    } catch(error) {
        console.error(error); res.redirect('/');
    }
};

// FUNÇÃO DE AUTO-PREENCHIMENTO VIA PRODUÇÃO DIÁRIA
exports.syncConsumo = async (req, res) => {
    try {
        const { data_baixa } = req.body;

        // Puxa tudo que foi costurado neste dia nas oficinas
        const { data: itensProduzidos, error: errProd } = await supabase
            .schema('malharia')
            .from('registro_diario_item')
            .select(`
                qtd_produzida,
                processo_item_id,
                registro:registro_id ( id, data_registro, malharia_id )
            `);

        if (errProd) throw errProd;

        // Filtra só o dia selecionado
        const producaoDoDia = itensProduzidos.filter(item => {
            if (!item.registro || !item.processo_item_id) return false;
            const dataReg = item.registro.data_registro || '';
            return dataReg.startsWith(data_baixa);
        });

        // Evita duplicatas buscando o que já foi consumido hoje
        const { data: baixasExistentes } = await supabase
            .schema('malharia')
            .from('cortes_baixas')
            .select('processo_item_origem_id, malharia_id')
            .eq('data_baixa', data_baixa);

        // Cria a baixa automática
        for (const prod of producaoDoDia) {
            const malhariaId = prod.registro.malharia_id;
            const piId = prod.processo_item_id;
            const qtd = prod.qtd_produzida;

            const jaBaixado = baixasExistentes?.find(b => String(b.processo_item_origem_id) === String(piId) && String(b.malharia_id) === String(malhariaId));

            if (!jaBaixado && qtd > 0) {
                await cortesService.createBaixa({
                    malharia_id: malhariaId,
                    data_baixa: data_baixa,
                    processo_item_origem_id: piId,
                    processo_item_destino_id: piId,
                    quantidade: parseInt(qtd),
                    usuario_id: req.user.id,
                    status: req.user.nivel >= 3 ? 'aprovada' : 'pendente',
                    avaliador_id: req.user.nivel >= 3 ? req.user.id : null,
                    data_avaliacao: req.user.nivel >= 3 ? new Date() : null
                });
            }
        }

        res.redirect(`/cortes/consumo?data=${data_baixa}`);
    } catch (error) {
        console.error("Erro no auto-preenchimento:", error);
        res.send(`<script>alert('Erro ao sincronizar: ${error.message}'); window.location.href='/cortes/consumo?data=${req.body.data_baixa}';</script>`);
    }
};

exports.storeBaixa = async (req, res) => {
    try {
        const { malharia_id, data_baixa, processo_item_origem_id, processo_item_destino_id, quantidade } = req.body;
        const isGestor = req.user.nivel >= 3;

        await cortesService.createBaixa({
            malharia_id, data_baixa, processo_item_origem_id, processo_item_destino_id,
            quantidade: parseInt(quantidade), usuario_id: req.user.id,
            status: isGestor ? 'aprovada' : 'pendente',
            avaliador_id: isGestor ? req.user.id : null, data_avaliacao: isGestor ? new Date() : null
        });

        res.redirect(`/cortes/consumo?data=${data_baixa}`);
    } catch (error) {
        res.send(`<script>alert('Erro ao registrar baixa: ${error.message}'); window.location.href='/cortes/consumo';</script>`);
    }
};

exports.updateBaixa = async (req, res) => {
    try {
        const { quantidade, data_baixa, processo_item_destino_id } = req.body;
        await cortesService.updateBaixaFull(req.params.id, { 
            quantidade: parseInt(quantidade), 
            data_baixa,
            processo_item_destino_id 
        });
        res.redirect(`/cortes/consumo?data=${data_baixa}`);
    } catch (error) { res.redirect('/cortes/consumo'); }
};

exports.aprovarBaixa = async (req, res) => {
    try {
        await cortesService.updateBaixaStatus(req.params.id, 'aprovada', req.user.id);
        res.redirect('back');
    } catch (error) { res.redirect('/cortes/consumo'); }
};

exports.rejeitarBaixa = async (req, res) => {
    try {
        await cortesService.updateBaixaStatus(req.params.id, 'rejeitada', req.user.id);
        res.redirect('back');
    } catch (error) { res.redirect('/cortes/consumo'); }
};

exports.destroyBaixa = async (req, res) => {
    try {
        await cortesService.deleteBaixa(req.params.id);
        res.redirect('back');
    } catch (error) { res.redirect('/cortes/consumo'); }
};