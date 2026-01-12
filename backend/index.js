const express = require("express");
const db = require("./db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const authMiddleware = require("./middleware/auth");
const checkRole = require("./middleware/checkRole");
const authClienteMiddleware = require("./middleware/authCliente");
const authFuncionarioMiddleware = require("./middleware/authFuncionario");
const cron = require("node-cron");
const { enviarLembreteWhatsApp } = require("./whatsapp");
const crypto = require("crypto");
const { enviarEmailReset } = require("./email");
const app = express();
const port = 3001;

// --- REMOVIDO: const checkPlan = require("./middleware/checkPlan"); ---

// --- CONFIGURAÇÃO DE CORS ---
const whitelist = [
  "http://localhost:3000",
  "https://booki-agendamentos.vercel.app",
  "https://barbearia-teste-booki-agendamentos.vercel.app",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Acesso não permitido pela política de CORS"));
    }
  },
};

app.use(cors(corsOptions));
app.use(express.json());

// --- MAPA DE PLANOS SIMPLIFICADO ---
// Agora todos os IDs da Hotmart ativam o mesmo plano "pro" (acesso total)
const planosHotmart = {
  'fiit6bbd': "pro", 
  'ybntddyn': "pro",
  '6lphtre7': "pro",
};

app.post("/webhook/hotmart", express.json({ type: 'application/json' }), async (req, res) => {
    console.log("--- NOTIFICAÇÃO DA HOTMART RECEBIDA ---");
    
    const hottok = req.headers['hottok'] || req.body.hottok;

    if (hottok !== process.env.HOTMART_HOTTOK) {
        console.warn("[WEBHOOK] Assinatura Hottok inválida recebida.");
        return res.status(401).send("Assinatura inválida.");
    }
    
    try {
        const { event, data } = req.body;
        const payerEmail = data?.buyer?.email;
        const productId = data?.product?.id.toString();
        const status = data?.purchase?.status || data?.subscription?.status;

        if (!event || !payerEmail || !productId) {
            return res.status(400).send("Dados insuficientes na notificação.");
        }

        // Se o produto estiver na lista, vira "pro", senão loga erro.
        const nomeDoPlano = planosHotmart[productId];
        
        if (!nomeDoPlano) {
            console.error(`[WEBHOOK] ERRO: ID de produto ${productId} não reconhecido.`);
            return res.status(200).send("OK (Produto não mapeado)");
        }

        let novoStatusPlano = null;
        let novaDataVencimento = null;

        if (event === 'PURCHASE_APPROVED' || status === 'ACTIVE') {
            novoStatusPlano = nomeDoPlano; // Será sempre "pro"
            novaDataVencimento = new Date();
            novaDataVencimento.setDate(novaDataVencimento.getDate() + 30);
        } else if (event === 'SUBSCRIPTION_CANCELED' || status === 'CANCELED' || status === 'REFUSED') {
            novoStatusPlano = 'pendente_pagamento';
            novaDataVencimento = new Date();
        }

        if (novoStatusPlano && novaDataVencimento) {
            const updateUserPlanQuery = `
                UPDATE filial SET plano = $1, assinatura_vence_em = $2
                WHERE id = (SELECT filial_id FROM profissional WHERE email = $3 AND role = 'dono');
            `;
            const updateResult = await db.query(updateUserPlanQuery, [novoStatusPlano, novaDataVencimento.toISOString(), payerEmail]);

            if (updateResult.rowCount > 0) {
                console.log(`[WEBHOOK] SUCESSO: Usuário ${payerEmail} atualizado para '${novoStatusPlano}'.`);
            } else {
                console.error(`[WEBHOOK] FALHA: Nenhum usuário 'dono' com o email ${payerEmail} foi encontrado.`);
            }
        }
        
        res.status(200).send("OK");
    } catch (error) {
        console.error("[WEBHOOK] Erro ao processar notificação da Hotmart:", error);
        res.status(200).send("Erro interno ao processar");
    }
});

// =================================================================
// --- NOVA SUPER-ROTA DE REGISTRO DE NEGÓCIO ---
// =================================================================
app.post("/registrar-negocio", async (req, res) => {
  const client = await db.getClient();
  try {
    const { nomeDono, emailDono, senhaDono, nomeFilial } = req.body;

    if (!nomeDono || !emailDono || !senhaDono || !nomeFilial) {
      return res.status(400).json({ message: "Todos os campos são obrigatórios." });
    }

    await client.query("BEGIN");

    const nomeBase = nomeFilial
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const subdomain = `${nomeBase}-booki-agendamentos`;

    const filialQuery =
      "INSERT INTO filial (nome_filial, plano, subdomain) VALUES ($1, $2, $3) RETURNING id";
    const filialResult = await client.query(filialQuery, [
      nomeFilial,
      "pendente_pagamento",
      subdomain,
    ]);
    const novaFilialId = filialResult.rows[0].id;

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senhaDono, salt);

    const donoQuery =
      "INSERT INTO profissional (nome, email, senha_hash, role, filial_id, config_horarios) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nome, email, role";
    const defaultConfig = {
      seg: "09:00-18:00",
      ter: "09:00-18:00",
      qua: "09:00-18:00",
      qui: "09:00-18:00",
      sex: "09:00-18:00",
      sab: "09:00-14:00",
      dom: null,
    };
    const donoResult = await client.query(donoQuery, [
      nomeDono,
      emailDono,
      senhaHash,
      "dono",
      novaFilialId,
      JSON.stringify(defaultConfig),
    ]);

    await client.query("COMMIT");

    res.status(201).json({
      message: "Negócio registrado com sucesso. Redirecionando para pagamento...",
      user: donoResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      return res.status(409).json({ message: "Este email já está em uso por outro profissional." });
    }
    console.error("ERRO CRÍTICO NO REGISTRO DE NEGÓCIO:", error);
    res.status(500).json({ message: "Falha ao registrar novo negócio." });
  } finally {
    client.release();
  }
});

// =================================================================
// --- ROTAS PÚBLICAS ---
// =================================================================

app.get("/publico/filial/:subdomain", async (req, res) => {
  try {
    const { subdomain } = req.params;
    const result = await db.query(
      "SELECT id, nome_filial FROM filial WHERE subdomain = $1",
      [subdomain]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Filial não encontrada." });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

app.get("/publico/filiais", async (req, res) => {
  try {
    const result = await db.query("SELECT id, nome_filial FROM filial ORDER BY nome_filial");
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

app.get("/publico/profissionais/:filialId", async (req, res) => {
  try {
    const { filialId } = req.params;
    const result = await db.query(
      "SELECT id, nome FROM profissional WHERE filial_id = $1 AND role != 'recepcionista' ORDER BY nome",
      [filialId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

app.get("/publico/servicos/:profissionalId", async (req, res) => {
  try {
    const { profissionalId } = req.params;
    const queryText = `
        SELECT s.id, s.nome_servico, s.duracao_minutos, s.preco 
        FROM servico s 
        JOIN profissional_servico ps ON s.id = ps.servico_id 
        WHERE ps.profissional_id = $1;
    `;
    const result = await db.query(queryText, [profissionalId]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Erro ao buscar serviços públicos:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

app.get("/publico/agenda/:profissionalId", async (req, res) => {
  try {
    const { profissionalId } = req.params;
    const { data } = req.query;
    if (!data) return res.status(400).json({ message: "A data é obrigatória." });
    
    const agendamentosResult = await db.query(
      `SELECT data_hora_inicio, data_hora_fim FROM carrinho_agendamento WHERE profissional_id = $1 AND data_hora_inicio::date = $2`,
      [profissionalId, data]
    );
    const donoHorarioQuery = `SELECT p_dono.config_horarios FROM profissional p_func JOIN filial f ON p_func.filial_id = f.id JOIN profissional p_dono ON f.id = p_dono.filial_id WHERE p_func.id = $1 AND p_dono.role = 'dono';`;
    const donoHorarioResult = await db.query(donoHorarioQuery, [profissionalId]);
    
    if (donoHorarioResult.rows.length === 0)
      return res.status(404).json({ message: "Não foi possível encontrar o horário de trabalho." });
    
    res.status(200).json({
      horariosOcupados: agendamentosResult.rows,
      horarioTrabalho: donoHorarioResult.rows[0].config_horarios,
    });
  } catch (error) {
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

app.post("/publico/agendamentos-carrinho/:profissionalId", async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query("BEGIN");
    const { profissionalId } = req.params;
    const { servicos_ids, nome_cliente, telefone_cliente, email_cliente, senha_cliente, data_hora_inicio } = req.body;

    if (!servicos_ids || servicos_ids.length === 0 || !nome_cliente || !telefone_cliente || !email_cliente || !data_hora_inicio) {
      return res.status(400).json({ message: "Todos os campos são obrigatórios." });
    }

    const servicosInfoQuery = `SELECT id, duracao_minutos, preco FROM servico WHERE id = ANY($1::uuid[])`;
    const servicosInfoResult = await client.query(servicosInfoQuery, [servicos_ids]);
    if (servicosInfoResult.rows.length !== servicos_ids.length)
      throw new Error("Um ou mais serviços não foram encontrados.");

    const duracao_total_minutos = servicosInfoResult.rows.reduce((acc, s) => acc + s.duracao_minutos, 0);
    const preco_total = servicosInfoResult.rows.reduce((acc, s) => acc + parseFloat(s.preco), 0);
    const dataInicio = new Date(data_hora_inicio);
    const dataFim = new Date(dataInicio.getTime() + duracao_total_minutos * 60000);

    let cliente;
    const clienteExistente = await client.query("SELECT * FROM cliente WHERE email_contato = $1", [email_cliente]);

    if (clienteExistente.rows.length > 0) {
      cliente = clienteExistente.rows[0];
    } else {
      if (!senha_cliente) throw new Error("A senha é obrigatória para novos clientes.");
      const salt = await bcrypt.genSalt(10);
      const senhaHash = await bcrypt.hash(senha_cliente, salt);
      const novoCliente = await client.query(
        "INSERT INTO cliente (nome_cliente, telefone_contato, email_contato, senha_hash) VALUES ($1, $2, $3, $4) RETURNING *",
        [nome_cliente, telefone_cliente, email_cliente, senhaHash]
      );
      cliente = novoCliente.rows[0];
    }

    const carrinhoQuery = `INSERT INTO carrinho_agendamento (data_hora_inicio, data_hora_fim, preco_total, duracao_total_minutos, profissional_id, cliente_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;`;
    const carrinhoResult = await client.query(carrinhoQuery, [
      dataInicio.toISOString(),
      dataFim.toISOString(),
      preco_total,
      duracao_total_minutos,
      profissionalId,
      cliente.id,
    ]);
    const carrinho_id = carrinhoResult.rows[0].id;

    const carrinhoServicoQuery = `INSERT INTO carrinho_servico (carrinho_id, servico_id) VALUES ($1, $2)`;
    for (const servico_id of servicos_ids) {
      await client.query(carrinhoServicoQuery, [carrinho_id, servico_id]);
    }

    await client.query("COMMIT");
    res.status(201).json({ message: "Agendamento criado com sucesso." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erro ao criar agendamento público:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  } finally {
    client.release();
  }
});

// =================================================================
// --- ROTAS DE AUTENTICAÇÃO E GESTÃO DE EQUIPE ---
// =================================================================

app.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha)
      return res.status(400).json({ message: "Email e senha são obrigatórios." });

    const queryText = `
            SELECT p.*, f.plano, f.subdomain, f.assinatura_vence_em 
            FROM profissional p 
            LEFT JOIN filial f ON p.filial_id = f.id 
            WHERE p.email = $1
        `;
    const result = await db.query(queryText, [email]);

    if (result.rows.length === 0)
      return res.status(401).json({ message: "Credenciais inválidas." });

    const profissional = result.rows[0];
    const senhaCorreta = await bcrypt.compare(senha, profissional.senha_hash);
    if (!senhaCorreta)
      return res.status(401).json({ message: "Credenciais inválidas." });

    const payload = {
      id: profissional.id,
      nome: profissional.nome,
      role: profissional.role,
      plano: profissional.plano,
      subdomain: profissional.subdomain,
      assinatura_vence_em: profissional.assinatura_vence_em,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

// --- ROTA LIMPA: CRIAÇÃO DE FUNCIONÁRIOS ---
// Removida a verificação checkPlan e a contagem de funcionários
app.post(
  "/profissionais",
  authMiddleware,
  checkRole(["dono"]),
  async (req, res) => {
    try {
      const { id: donoId } = req.profissional; // Não precisamos mais do 'plano' aqui
      const { nome, email, senha, role, especialidade } = req.body;

      if (!nome || !email || !senha || !role)
        return res.status(400).json({ message: "Nome, email, senha e papel (role) são obrigatórios." });

      const filialResult = await db.query("SELECT filial_id FROM profissional WHERE id = $1", [donoId]);
      
      if (!filialResult.rows[0]?.filial_id)
        return res.status(400).json({ message: "Administrador não está associado a uma filial válida." });
      
      const filial_id = filialResult.rows[0].filial_id;

      // REMOVIDO: Bloco de contagem de funcionários (limite do plano equipe)

      const salt = await bcrypt.genSalt(10);
      const senhaHash = await bcrypt.hash(senha, salt);

      const queryText = `INSERT INTO profissional (nome, email, senha_hash, role, filial_id, especialidade) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nome, email, role, especialidade;`;
      const result = await db.query(queryText, [
        nome,
        email,
        senhaHash,
        role,
        filial_id,
        especialidade,
      ]);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      if (error.code === "23505")
        return res.status(409).json({ message: "Este email já está cadastrado." });
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

app.get(
  "/profissionais",
  authMiddleware,
  checkRole(["dono", "recepcionista"]),
  async (req, res) => {
    try {
      const usuarioLogadoId = req.profissional.id;
      const filialResult = await db.query("SELECT filial_id FROM profissional WHERE id = $1", [usuarioLogadoId]);
      if (!filialResult.rows[0]?.filial_id)
        return res.status(400).json({ message: "Usuário não está associado a uma filial." });
      const filial_id = filialResult.rows[0].filial_id;

      const queryText = `SELECT id, nome, email, role, especialidade FROM profissional WHERE filial_id = $1 ORDER BY nome;`;
      const result = await db.query(queryText, [filial_id]);

      res.status(200).json(result.rows);
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

app.put(
  "/profissionais/:id",
  authMiddleware,
  checkRole(["dono"]),
  async (req, res) => {
    try {
      const { id: profissional_id } = req.params;
      const { nome, email, role, especialidade } = req.body;

      if (!nome || !email || !role)
        return res.status(400).json({ message: "Nome, email e papel são obrigatórios." });

      const queryText = `UPDATE profissional SET nome = $1, email = $2, role = $3, especialidade = $4 WHERE id = $5 RETURNING id, nome, email, role, especialidade;`;
      const result = await db.query(queryText, [nome, email, role, especialidade, profissional_id]);

      if (result.rowCount === 0)
        return res.status(404).json({ message: "Profissional não encontrado." });
      res.status(200).json(result.rows[0]);
    } catch (error) {
      if (error.code === "23505")
        return res.status(409).json({ message: "Este email já está em uso por outro usuário." });
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

app.delete(
  "/profissionais/:id",
  authMiddleware,
  checkRole(["dono"]),
  async (req, res) => {
    try {
      const { id: profissional_id } = req.params;
      const result = await db.query("DELETE FROM profissional WHERE id = $1", [profissional_id]);
      if (result.rowCount === 0)
        return res.status(404).json({ message: "Profissional não encontrado." });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

app.get(
  "/profissionais/:id/servicos",
  authMiddleware,
  checkRole(["dono"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const queryText = `SELECT s.id, s.nome_servico FROM servico s JOIN profissional_servico ps ON s.id = ps.servico_id WHERE ps.profissional_id = $1;`;
      const result = await db.query(queryText, [id]);
      res.status(200).json(result.rows);
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

// --- REMOVIDO: Rota duplicada de POST /profissionais que existia aqui ---

app.post(
  "/profissionais/:id/servicos",
  authMiddleware,
  checkRole(["dono"]),
  async (req, res) => {
    try {
      const { id: profissional_id } = req.params;
      const { servico_id } = req.body;
      if (!servico_id)
        return res.status(400).json({ message: "O ID do serviço é obrigatório." });
      const queryText = `INSERT INTO profissional_servico (profissional_id, servico_id) VALUES ($1, $2)`;
      await db.query(queryText, [profissional_id, servico_id]);
      res.status(201).json({ message: "Serviço associado com sucesso." });
    } catch (error) {
      if (error.code === "23505")
        return res.status(200).json({ message: "Associação já existe." });
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

app.delete(
  "/profissionais/:id/servicos/:servicoId",
  authMiddleware,
  checkRole(["dono"]),
  async (req, res) => {
    try {
      const { id: profissional_id, servicoId: servico_id } = req.params;
      const queryText = `DELETE FROM profissional_servico WHERE profissional_id = $1 AND servico_id = $2`;
      await db.query(queryText, [profissional_id, servico_id]);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

app.get(
  "/profissionais/meu-relatorio-financeiro",
  authFuncionarioMiddleware,
  async (req, res) => {
    try {
      const { id: profissional_id } = req.profissional;
      const { mes, ano } = req.query;
      if (!mes || !ano)
        return res.status(400).json({ message: "Mês e ano são obrigatórios." });

      const comissaoQuery = `SELECT f.comissao_percentual FROM filial f JOIN profissional p ON f.id = p.filial_id WHERE p.id = $1`;
      const comissaoResult = await db.query(comissaoQuery, [profissional_id]);
      const comissao = comissaoResult.rows[0]?.comissao_percentual || 50;

      const queryText = `
            SELECT ca.data_hora_inicio, c.nome_cliente, ca.preco_total,
                   (SELECT STRING_AGG(s.nome_servico, ', ') FROM servico s JOIN carrinho_servico cs ON s.id = cs.servico_id WHERE cs.carrinho_id = ca.id) as nome_servico
            FROM carrinho_agendamento ca
            JOIN cliente c ON ca.cliente_id = c.id
            WHERE ca.profissional_id = $1 AND ca.status = 'concluido'
            AND EXTRACT(MONTH FROM ca.data_hora_inicio) = $2 
            AND EXTRACT(YEAR FROM ca.data_hora_inicio) = $3
            ORDER BY ca.data_hora_inicio DESC;
        `;
      const result = await db.query(queryText, [profissional_id, mes, ano]);

      const relatorio = result.rows.map((item) => {
        const precoBruto = parseFloat(item.preco_total);
        const valorAReceber = precoBruto * (1 - comissao / 100);
        return {
          ...item,
          valor_a_receber: valorAReceber.toFixed(2),
        };
      });

      res.status(200).json({ relatorio, comissao });
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

// =================================================================
// --- ROTAS PROTEGIDAS DO PAINEL ---
// =================================================================

// --- Serviços ---
app.get("/servicos", authMiddleware, async (req, res) => {
  try {
    const { id: profissional_id } = req.profissional;
    const queryText = `
        SELECT s.* FROM servico s
        JOIN profissional p_dono ON s.profissional_id = p_dono.id
        WHERE p_dono.filial_id = (SELECT filial_id FROM profissional WHERE id = $1)
        ORDER BY s.nome_servico;
    `;
    const result = await db.query(queryText, [profissional_id]);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

app.post("/servicos", authMiddleware, checkRole(["dono"]), async (req, res) => {
  try {
    const { id: profissional_id } = req.profissional;
    const { nome_servico, duracao_minutos, preco } = req.body;
    const queryText = `INSERT INTO servico (nome_servico, duracao_minutos, preco, profissional_id) VALUES ($1, $2, $3, $4) RETURNING *;`;
    const result = await db.query(queryText, [nome_servico, duracao_minutos, preco, profissional_id]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

app.put(
  "/servicos/:id",
  authMiddleware,
  checkRole(["dono"]),
  async (req, res) => {
    try {
      const { id: servico_id } = req.params;
      const { id: profissional_id } = req.profissional;
      const { nome_servico, duracao_minutos, preco } = req.body;
      if (!nome_servico || !duracao_minutos || !preco)
        return res.status(400).json({ message: "Todos os campos são obrigatórios." });
      const queryText = `UPDATE servico SET nome_servico = $1, duracao_minutos = $2, preco = $3, atualizado_em = NOW() WHERE id = $4 AND profissional_id = $5 RETURNING *;`;
      const result = await db.query(queryText, [nome_servico, duracao_minutos, preco, servico_id, profissional_id]);
      if (result.rowCount === 0)
        return res.status(404).json({ message: "Serviço não encontrado ou não pertence a você." });
      res.status(200).json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

app.delete(
  "/servicos/:id",
  authMiddleware,
  checkRole(["dono"]),
  async (req, res) => {
    try {
      const { id: servico_id } = req.params;
      const { id: profissional_id } = req.profissional;
      const result = await db.query("DELETE FROM servico WHERE id = $1 AND profissional_id = $2", [servico_id, profissional_id]);
      if (result.rowCount === 0)
        return res.status(404).json({ message: "Serviço não encontrado." });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

// --- Agendamentos ---
app.get("/agendamentos", authMiddleware, async (req, res) => {
  try {
    const { id: profissional_id, role } = req.profissional;
    let queryText;
    let values;

    const baseQuery = `
          SELECT 
              ca.id, 
              ca.data_hora_inicio, 
              ca.data_hora_fim, 
              ca.status, 
              c.nome_cliente, 
              c.telefone_contato, 
              p.nome as nome_profissional,
              (
                  SELECT COALESCE(STRING_AGG(s.nome_servico, ', '), 'N/A')
                  FROM servico s 
                  JOIN carrinho_servico cs ON s.id = cs.servico_id 
                  WHERE cs.carrinho_id = ca.id
              ) as nome_servico
          FROM carrinho_agendamento ca
          JOIN cliente c ON ca.cliente_id = c.id
          JOIN profissional p ON ca.profissional_id = p.id
      `;

    if (role === "dono" || role === "recepcionista") {
      const filialResult = await db.query("SELECT filial_id FROM profissional WHERE id = $1", [profissional_id]);
      const filial_id = filialResult.rows[0]?.filial_id;
      if (!filial_id)
        return res.status(200).json({ agendamentos: [], horarioTrabalho: null });
      queryText = `${baseQuery} WHERE p.filial_id = $1 ORDER BY ca.data_hora_inicio ASC;`;
      values = [filial_id];
    } else {
      queryText = `${baseQuery} WHERE ca.profissional_id = $1 ORDER BY ca.data_hora_inicio ASC;`;
      values = [profissional_id];
    }

    const agendamentosResult = await db.query(queryText, values);
    const profissionalResult = await db.query("SELECT config_horarios FROM profissional WHERE id = $1", [profissional_id]);

    res.status(200).json({
      agendamentos: agendamentosResult.rows,
      horarioTrabalho: profissionalResult.rows.length > 0 ? profissionalResult.rows[0].config_horarios : null,
    });
  } catch (error) {
    console.error("ERRO DETALHADO AO LISTAR AGENDAMENTOS:", error);
    res.status(500).json({ message: "Erro interno do servidor ao listar agendamentos." });
  }
});

app.post("/agendamentos", authMiddleware, async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query("BEGIN");
    const { id: logado_id, role } = req.profissional;
    const { servicos_ids, nome_cliente, telefone_cliente, email_cliente, data_hora_inicio, agendado_para_id } = req.body;

    const profissional_final_id = (role === "dono" || role === "recepcionista") ? agendado_para_id : logado_id;
    if (!servicos_ids || servicos_ids.length === 0 || !nome_cliente || !telefone_cliente || !email_cliente || !data_hora_inicio || !profissional_final_id) {
      return res.status(400).json({ message: "Todos os campos são obrigatórios." });
    }

    const servicosInfoQuery = `SELECT id, duracao_minutos, preco FROM servico WHERE id = ANY($1::uuid[])`;
    const servicosInfoResult = await client.query(servicosInfoQuery, [servicos_ids]);
    if (servicosInfoResult.rows.length !== servicos_ids.length) {
      throw new Error("Um ou mais serviços selecionados não foram encontrados.");
    }

    const duracao_total_minutos = servicosInfoResult.rows.reduce((acc, s) => acc + s.duracao_minutos, 0);
    const preco_total = servicosInfoResult.rows.reduce((acc, s) => acc + parseFloat(s.preco), 0);
    const dataInicio = new Date(data_hora_inicio);
    const dataFim = new Date(dataInicio.getTime() + duracao_total_minutos * 60000);

    let cliente;
    const clienteExistente = await client.query("SELECT * FROM cliente WHERE email_contato = $1", [email_cliente]);
    if (clienteExistente.rows.length > 0) {
      cliente = clienteExistente.rows[0];
    } else {
      const novoCliente = await client.query(
        "INSERT INTO cliente (nome_cliente, telefone_contato, email_contato) VALUES ($1, $2, $3) RETURNING *",
        [nome_cliente, telefone_cliente, email_cliente]
      );
      cliente = novoCliente.rows[0];
    }

    const carrinhoQuery = `INSERT INTO carrinho_agendamento (data_hora_inicio, data_hora_fim, preco_total, duracao_total_minutos, profissional_id, cliente_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;`;
    const carrinhoResult = await client.query(carrinhoQuery, [
      dataInicio.toISOString(),
      dataFim.toISOString(),
      preco_total,
      duracao_total_minutos,
      profissional_final_id,
      cliente.id,
    ]);
    const carrinho_id = carrinhoResult.rows[0].id;

    const carrinhoServicoQuery = `INSERT INTO carrinho_servico (carrinho_id, servico_id) VALUES ($1, $2)`;
    for (const servico_id of servicos_ids) {
      await client.query(carrinhoServicoQuery, [carrinho_id, servico_id]);
    }

    await client.query("COMMIT");
    res.status(201).json(carrinhoResult.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erro ao criar agendamento manual:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  } finally {
    client.release();
  }
});

app.put("/agendamentos/:id", authMiddleware, async (req, res) => {
  try {
    const { id: agendamento_id } = req.params;
    const { id: profissional_id, role } = req.profissional;
    const { status } = req.body;
    if (!status)
      return res.status(400).json({ message: "O campo status é obrigatório para atualização." });

    let queryText;
    let values;

    if (role === "dono" || role === "recepcionista") {
      queryText = `
                UPDATE carrinho_agendamento SET status = $1 
                WHERE id = $2 AND profissional_id IN (
                    SELECT id FROM profissional WHERE filial_id = (
                        SELECT filial_id FROM profissional WHERE id = $3
                    )
                ) RETURNING *;
            `;
      values = [status, agendamento_id, profissional_id];
    } else {
      queryText = `UPDATE carrinho_agendamento SET status = $1 WHERE id = $2 AND profissional_id = $3 RETURNING *;`;
      values = [status, agendamento_id, profissional_id];
    }

    const result = await db.query(queryText, values);
    if (result.rowCount === 0)
      return res.status(404).json({ message: "Agendamento não encontrado ou você não tem permissão para atualizá-lo." });

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Erro ao atualizar agendamento:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

app.delete("/agendamentos/:id", authMiddleware, async (req, res) => {
  try {
    const { id: agendamento_id } = req.params;
    const { id: profissional_id, role } = req.profissional;
    let queryText;
    let values;

    if (role === "dono" || role === "recepcionista") {
      queryText = `
                DELETE FROM carrinho_agendamento 
                WHERE id = $1 AND profissional_id IN (
                    SELECT id FROM profissional WHERE filial_id = (
                        SELECT filial_id FROM profissional WHERE id = $2
                    )
                );
            `;
      values = [agendamento_id, profissional_id];
    } else {
      queryText = "DELETE FROM carrinho_agendamento WHERE id = $1 AND profissional_id = $2";
      values = [agendamento_id, profissional_id];
    }

    const result = await db.query(queryText, values);
    if (result.rowCount === 0)
      return res.status(404).json({ message: "Agendamento não encontrado ou você não tem permissão para deletá-lo." });

    res.status(204).send();
  } catch (error) {
    console.error("Erro ao deletar agendamento:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

// --- Configurações ---
app.get(
  "/configuracoes",
  authMiddleware,
  checkRole(["dono"]),
  async (req, res) => {
    try {
      const { id: profissional_id } = req.profissional;
      const horariosResult = await db.query("SELECT config_horarios FROM profissional WHERE id = $1", [profissional_id]);
      const filialResult = await db.query("SELECT f.comissao_percentual FROM filial f JOIN profissional p ON f.id = p.filial_id WHERE p.id = $1", [profissional_id]);
      if (horariosResult.rows.length === 0 || filialResult.rows.length === 0) {
        return res.status(404).json({ message: "Configurações não encontradas." });
      }
      res.status(200).json({
        horarios: horariosResult.rows[0].config_horarios,
        comissao: filialResult.rows[0].comissao_percentual,
      });
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

app.put(
  "/configuracoes",
  authMiddleware,
  checkRole(["dono"]),
  async (req, res) => {
    try {
      const { id: profissional_id } = req.profissional;
      const { horarios, comissao } = req.body;

      if (horarios) {
        await db.query(`UPDATE profissional SET config_horarios = $1 WHERE id = $2`, [horarios, profissional_id]);
      }

      if (comissao !== undefined) {
        const filialResult = await db.query("SELECT filial_id FROM profissional WHERE id = $1", [profissional_id]);
        const filial_id = filialResult.rows[0]?.filial_id;
        if (filial_id) {
          await db.query(`UPDATE filial SET comissao_percentual = $1 WHERE id = $2`, [comissao, filial_id]);
        } else {
          return res.status(400).json({ message: "Usuário dono não está ligado a uma filial." });
        }
      }

      res.status(200).json({ message: "Configurações salvas com sucesso." });
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

// --- Relatórios ---
app.get(
  "/relatorios/servicos-realizados",
  authMiddleware,
  checkRole(["dono"]),
  async (req, res) => {
    try {
      const { id: dono_id } = req.profissional;
      const { mes, ano } = req.query;
      const filialSubQuery = `(SELECT filial_id FROM profissional WHERE id = $1)`;
      let queryText = `SELECT ca.id, ca.data_hora_inicio, c.nome_cliente, p.nome as nome_profissional, ca.preco_total as preco, (SELECT STRING_AGG(s.nome_servico, ', ') FROM servico s JOIN carrinho_servico cs ON s.id = cs.servico_id WHERE cs.carrinho_id = ca.id) as nome_servico FROM carrinho_agendamento ca JOIN cliente c ON ca.cliente_id = c.id JOIN profissional p ON ca.profissional_id = p.id WHERE ca.status = 'concluido' AND p.filial_id = ${filialSubQuery}`;
      const values = [dono_id];
      if (mes && ano) {
        queryText += ` AND EXTRACT(MONTH FROM ca.data_hora_inicio) = $2 AND EXTRACT(YEAR FROM ca.data_hora_inicio) = $3`;
        values.push(mes, ano);
      }
      queryText += ` ORDER BY ca.data_hora_inicio DESC;`;
      const result = await db.query(queryText, values);
      res.status(200).json(result.rows);
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

app.get(
  "/relatorios/faturamento-por-servico",
  authMiddleware,
  checkRole(["dono"]),
  async (req, res) => {
    try {
      const { id: dono_id } = req.profissional;
      const { mes, ano, profissionalId } = req.query;
      if (!mes || !ano)
        return res.status(400).json({ message: "Mês e ano são obrigatórios." });
      const filialSubQuery = `(SELECT filial_id FROM profissional WHERE id = $1)`;
      let queryText = `SELECT s.nome_servico, SUM(s.preco) as faturamento_total, COUNT(s.id) as quantidade FROM carrinho_agendamento ca JOIN carrinho_servico cs ON ca.id = cs.carrinho_id JOIN servico s ON cs.servico_id = s.id WHERE ca.status = 'concluido' AND ca.profissional_id IN (SELECT id FROM profissional WHERE filial_id = ${filialSubQuery}) AND EXTRACT(MONTH FROM ca.data_hora_inicio) = $2 AND EXTRACT(YEAR FROM ca.data_hora_inicio) = $3`;
      const values = [dono_id, mes, ano];
      if (profissionalId && profissionalId !== "todos") {
        queryText += ` AND ca.profissional_id = $4`;
        values.push(profissionalId);
      }
      queryText += ` GROUP BY s.nome_servico ORDER BY faturamento_total DESC;`;
      const result = await db.query(queryText, values);
      res.status(200).json(result.rows);
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

app.get(
  "/relatorios/faturamento-por-profissional",
  authMiddleware,
  checkRole(["dono"]),
  async (req, res) => {
    try {
      const { id: dono_id } = req.profissional;
      const { mes, ano } = req.query;
      if (!mes || !ano)
        return res.status(400).json({ message: "Mês e ano são obrigatórios." });

      const comissaoQuery = `SELECT comissao_percentual FROM filial WHERE id = (SELECT filial_id FROM profissional WHERE id = $1)`;
      const comissaoResult = await db.query(comissaoQuery, [dono_id]);
      const comissao = comissaoResult.rows[0]?.comissao_percentual || 0;

      const faturamentoQuery = `
          SELECT 
              p.id as profissional_id,
              p.nome as nome_profissional,
              SUM(ca.preco_total) as faturamento_bruto
          FROM carrinho_agendamento ca
          JOIN profissional p ON ca.profissional_id = p.id
          WHERE p.filial_id = (SELECT filial_id FROM profissional WHERE id = $1)
            AND ca.status = 'concluido'
            AND EXTRACT(MONTH FROM ca.data_hora_inicio) = $2
            AND EXTRACT(YEAR FROM ca.data_hora_inicio) = $3
          GROUP BY p.id, p.nome
          ORDER BY p.nome;
      `;
      const faturamentoResult = await db.query(faturamentoQuery, [dono_id, mes, ano]);

      const relatorio = faturamentoResult.rows.map((item) => {
        const faturamentoBruto = parseFloat(item.faturamento_bruto);
        const valorAReceber = faturamentoBruto * (1 - comissao / 100);
        return {
          ...item,
          faturamento_bruto: faturamentoBruto.toFixed(2),
          valor_a_receber: valorAReceber.toFixed(2),
        };
      });

      res.status(200).json(relatorio);
    } catch (error) {
      console.error("Erro ao gerar faturamento por profissional:", error);
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

// --- ROTAS DE CLIENTE (AUTENTICAÇÃO) ---
app.post("/clientes/cadastro", async (req, res) => {
  try {
    const { nome, email, telefone, senha } = req.body;
    if (!nome || !email || !senha || !telefone) {
      return res.status(400).json({ message: "Todos os campos são obrigatórios." });
    }
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);

    const queryText = `INSERT INTO cliente (nome_cliente, email_contato, telefone_contato, senha_hash) VALUES ($1, $2, $3, $4) RETURNING id, nome_cliente, email_contato;`;
    const result = await db.query(queryText, [nome, email, telefone, senhaHash]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("ERRO DETALHADO NO CADASTRO DE CLIENTE:", error);
    if (error.code === "23505") {
      return res.status(409).json({ message: "Este email já está cadastrado." });
    }
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

app.post("/clientes/login", async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha)
      return res.status(400).json({ message: "Email e senha são obrigatórios." });
    const result = await db.query("SELECT * FROM cliente WHERE email_contato = $1", [email]);
    if (result.rows.length === 0)
      return res.status(401).json({ message: "Credenciais inválidas." });
    const cliente = result.rows[0];
    if (!cliente.senha_hash)
      return res.status(401).json({ message: "Credenciais inválidas." });
    const senhaCorreta = await bcrypt.compare(senha, cliente.senha_hash);
    if (!senhaCorreta)
      return res.status(401).json({ message: "Credenciais inválidas." });
    const payload = {
      id: cliente.id,
      nome: cliente.nome_cliente,
      email: cliente.email_contato,
      telefone: cliente.telefone_contato,
      tipo: "cliente",
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

app.get(
  "/clientes/meus-agendamentos",
  authClienteMiddleware,
  async (req, res) => {
    try {
      const clienteId = req.cliente.id;
      const queryText = `SELECT ca.id, ca.data_hora_inicio, ca.status, ca.preco_total, p.nome as nome_profissional, f.nome_filial, (SELECT STRING_AGG(s.nome_servico, ', ') FROM servico s JOIN carrinho_servico cs ON s.id = cs.servico_id WHERE cs.carrinho_id = ca.id) as nome_servico FROM carrinho_agendamento ca JOIN profissional p ON ca.profissional_id = p.id JOIN filial f ON p.filial_id = f.id WHERE ca.cliente_id = $1 ORDER BY ca.data_hora_inicio DESC;`;
      const result = await db.query(queryText, [clienteId]);
      res.status(200).json(result.rows);
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

app.delete(
  "/clientes/agendamentos/:id",
  authClienteMiddleware,
  async (req, res) => {
    try {
      const clienteId = req.cliente.id;
      const { id: agendamentoId } = req.params;
      const result = await db.query(
        "DELETE FROM carrinho_agendamento WHERE id = $1 AND cliente_id = $2",
        [agendamentoId, clienteId]
      );
      if (result.rowCount === 0)
        return res.status(404).json({ message: "Agendamento não encontrado ou não pertence a você.", });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

app.get(
  "/clientes",
  authMiddleware,
  checkRole(["dono", "recepcionista"]),
  async (req, res) => {
    try {
      const { id: profissional_id } = req.profissional;
      const filialResult = await db.query("SELECT filial_id FROM profissional WHERE id = $1", [profissional_id]);
      const filial_id = filialResult.rows[0]?.filial_id;
      if (!filial_id) {
        return res.status(400).json({ message: "Usuário não associado a uma filial." });
      }

      const queryText = `
            SELECT DISTINCT ON (c.id) c.id, c.nome_cliente, c.email_contato, c.telefone_contato
            FROM cliente c
            JOIN carrinho_agendamento ca ON c.id = ca.cliente_id
            JOIN profissional p ON ca.profissional_id = p.id
            WHERE p.filial_id = $1
            ORDER BY c.id, c.nome_cliente;
        `;
      const result = await db.query(queryText, [filial_id]);
      res.status(200).json(result.rows);
    } catch (error) {
      console.error("Erro ao listar clientes:", error);
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

app.put(
  "/clientes/:id",
  authMiddleware,
  checkRole(["dono", "recepcionista"]),
  async (req, res) => {
    try {
      const { id: clienteId } = req.params;
      const { nome_cliente, email_contato, telefone_contato } = req.body;

      if (!nome_cliente || !email_contato || !telefone_contato) {
        return res.status(400).json({ message: "Todos os campos são obrigatórios." });
      }

      const { id: profissional_id } = req.profissional;
      const permissaoQuery = `
            SELECT c.id FROM cliente c
            JOIN carrinho_agendamento ca ON c.id = ca.cliente_id
            JOIN profissional p ON ca.profissional_id = p.id
            WHERE c.id = $1 AND p.filial_id = (
                SELECT filial_id FROM profissional WHERE id = $2
            )
            LIMIT 1;
        `;
      const permissaoResult = await db.query(permissaoQuery, [clienteId, profissional_id]);

      if (permissaoResult.rows.length === 0) {
        return res.status(403).json({ message: "Você não tem permissão para editar este cliente." });
      }

      const queryText = `
            UPDATE cliente 
            SET nome_cliente = $1, email_contato = $2, telefone_contato = $3
            WHERE id = $4
            RETURNING id, nome_cliente, email_contato, telefone_contato;
        `;
      const result = await db.query(queryText, [nome_cliente, email_contato, telefone_contato, clienteId]);

      res.status(200).json(result.rows[0]);
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({ message: "Este email já está em uso por outro cliente." });
      }
      console.error("Erro ao atualizar cliente:", error);
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

app.post("/esqueci-senha", async (req, res) => {
  try {
    const { email, tipo } = req.body;
    console.log(`[LOG] Solicitação de reset para email: ${email}, tipo: ${tipo}`);

    const tabela = tipo === "profissional" ? "profissional" : "cliente";
    const colunaEmail = tipo === "profissional" ? "email" : "email_contato";

    const userResult = await db.query(`SELECT * FROM ${tabela} WHERE ${colunaEmail} = $1`, [email]);

    if (userResult.rows.length === 0) {
      return res.status(200).json({
        message: "Se um usuário com este email existir, um link de recuperação será enviado.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    const tokenExpires = new Date(Date.now() + 3600000);

    await db.query(
      `UPDATE ${tabela} SET reset_token = $1, reset_token_expires = $2 WHERE ${colunaEmail} = $3`,
      [hashedToken, tokenExpires, email]
    );

    const resetUrl = `http://localhost:3000/resetar-senha/${resetToken}?tipo=${tipo}`;
    await enviarEmailReset(email, resetUrl);

    res.status(200).json({
      message: "Se um usuário com este email existir, um link de recuperação será enviado.",
    });
  } catch (error) {
    console.error("ERRO CRÍTICO NA ROTA /esqueci-senha:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

app.post("/resetar-senha", async (req, res) => {
  try {
    const { token, tipo, senha } = req.body;
    if (!token || !tipo || !senha) {
      return res.status(400).json({ message: "Token, tipo e nova senha são obrigatórios." });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    let userResult;

    if (tipo === "profissional") {
      userResult = await db.query(`SELECT * FROM profissional WHERE reset_token = $1 AND reset_token_expires > NOW()`, [hashedToken]);
    } else if (tipo === "cliente") {
      userResult = await db.query(`SELECT * FROM cliente WHERE reset_token = $1 AND reset_token_expires > NOW()`, [hashedToken]);
    } else {
      return res.status(400).json({ message: "Tipo de usuário inválido." });
    }

    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: "Token de recuperação inválido ou expirado." });
    }
    const user = userResult.rows[0];

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);

    if (tipo === "profissional") {
      await db.query(`UPDATE profissional SET senha_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2`, [senhaHash, user.id]);
    } else {
      await db.query(`UPDATE cliente SET senha_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2`, [senhaHash, user.id]);
    }

    res.status(200).json({ message: "Senha atualizada com sucesso." });
  } catch (error) {
    console.error("ERRO DETALHADO EM /resetar-senha:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

// =================================================================
// --- ROBÔS ---
// =================================================================
console.log("Agendando robôs...");
cron.schedule("*/30 * * * *", async () => {
  console.log(`[${new Date().toLocaleString("pt-BR")}] 🤖 Robô de lembretes verificando agendamentos...`);
  try {
    const queryText = `
        SELECT ca.id, ca.data_hora_inicio, c.nome_cliente, c.telefone_contato,
               (SELECT STRING_AGG(s.nome_servico, ', ') FROM servico s JOIN carrinho_servico cs ON s.id = cs.servico_id WHERE cs.carrinho_id = ca.id) as nome_servico
        FROM carrinho_agendamento ca
        JOIN cliente c ON ca.cliente_id = c.id
        WHERE ca.status = 'agendado' AND ca.lembrete_enviado = FALSE
          AND ca.data_hora_inicio BETWEEN NOW() + interval '23 hours' AND NOW() + interval '24 hours';
    `;
    const result = await db.query(queryText);
    const agendamentosParaLembrar = result.rows;

    if (agendamentosParaLembrar.length > 0) {
      for (const ag of agendamentosParaLembrar) {
        const dataFormatada = new Date(ag.data_hora_inicio).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        const horaFormatada = new Date(ag.data_hora_inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        const mensagem = `Olá, ${ag.nome_cliente}! Passando para lembrar do seu agendamento de "${ag.nome_servico}" amanhã, dia ${dataFormatada} às ${horaFormatada}. Esperamos por você!`;
        const telefoneParaEnvio = `whatsapp:${ag.telefone_contato.replace(/\D/g, "")}`;
        
        const sucesso = await enviarLembreteWhatsApp(telefoneParaEnvio, mensagem);
        if (sucesso) {
          await db.query("UPDATE carrinho_agendamento SET lembrete_enviado = TRUE WHERE id = $1", [ag.id]);
        }
      }
    }
  } catch (error) {
    console.error("🤖 Erro ao executar o robô de lembretes:", error);
  }
});

cron.schedule("0 3 * * *", async () => {
  try {
    const queryText = `
            DELETE FROM filial
            WHERE id IN (
                SELECT f.id FROM filial f
                JOIN profissional p ON f.id = p.filial_id
                WHERE f.plano = 'pendente_pagamento'
                  AND p.role = 'dono'
                  AND p.criado_em < NOW() - INTERVAL '72 hours'
            );
        `;
    await db.query(queryText);
  } catch (error) {
    console.error("🤖 Erro ao executar o robô de limpeza:", error);
  }
});

app.listen(port, () => {
  console.log(`🚀 SERVIDOR "ACESSO TOTAL" rodando na porta http://localhost:${port}`);
});