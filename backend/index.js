const express = require("express");
const db = require("./db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const authMiddleware = require("./middleware/auth");
const checkRole = require("./middleware/checkRole");
const authClienteMiddleware = require("./middleware/authCliente");
const authFuncionarioMiddleware = require("./middleware/authFuncionario"); // Novo

const crypto = require("crypto");
const { enviarEmailReset } = require("./email");

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(
    `[${new Date().toLocaleString("pt-BR")}] Recebida requisição: ${
      req.method
    } ${req.originalUrl}`
  );
  next();
});

// =================================================================
// --- ROTAS PÚBLICAS ---
// =================================================================

app.get("/publico/filiais", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, nome_filial FROM filial ORDER BY nome_filial"
    );
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
    const roleResult = await db.query(
      "SELECT role FROM profissional WHERE id = $1",
      [profissionalId]
    );
    if (roleResult.rows.length === 0)
      return res.status(404).json({ message: "Profissional não encontrado." });
    const role = roleResult.rows[0].role;
    let queryText;
    const values = [profissionalId];
    if (role === "dono") {
      queryText =
        "SELECT id, nome_servico, duracao_minutos, preco FROM servico WHERE profissional_id = $1";
    } else {
      queryText = `SELECT s.id, s.nome_servico, s.duracao_minutos, s.preco FROM servico s JOIN profissional_servico ps ON s.id = ps.servico_id WHERE ps.profissional_id = $1;`;
    }
    const result = await db.query(queryText, values);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

app.get("/publico/agenda/:profissionalId", async (req, res) => {
  try {
    const { profissionalId } = req.params;
    const { data } = req.query;
    if (!data)
      return res.status(400).json({ message: "A data é obrigatória." });
    const agendamentosResult = await db.query(
      `SELECT data_hora_inicio, data_hora_fim FROM carrinho_agendamento WHERE profissional_id = $1 AND data_hora_inicio::date = $2`,
      [profissionalId, data]
    );
    const donoHorarioQuery = `SELECT p_dono.config_horarios FROM profissional p_func JOIN filial f ON p_func.filial_id = f.id JOIN profissional p_dono ON f.id = p_dono.filial_id WHERE p_func.id = $1 AND p_dono.role = 'dono';`;
    const donoHorarioResult = await db.query(donoHorarioQuery, [
      profissionalId,
    ]);
    if (donoHorarioResult.rows.length === 0)
      return res.status(404).json({
        message:
          "Não foi possível encontrar o horário de trabalho para este profissional.",
      });
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
    const {
      servicos_ids,
      nome_cliente,
      telefone_cliente,
      email_cliente,
      data_hora_inicio,
    } = req.body;
    if (
      !servicos_ids ||
      servicos_ids.length === 0 ||
      !nome_cliente ||
      !telefone_cliente ||
      !email_cliente ||
      !data_hora_inicio
    ) {
      return res.status(400).json({
        message: "Todos os campos, incluindo email, são obrigatórios.",
      });
    }
    const servicosInfoQuery = `SELECT id, duracao_minutos, preco FROM servico WHERE id = ANY($1::uuid[])`;
    const servicosInfoResult = await client.query(servicosInfoQuery, [
      servicos_ids,
    ]);
    if (servicosInfoResult.rows.length !== servicos_ids.length) {
      throw new Error("Um ou mais serviços não foram encontrados.");
    }
    const duracao_total_minutos = servicosInfoResult.rows.reduce(
      (acc, s) => acc + s.duracao_minutos,
      0
    );
    const preco_total = servicosInfoResult.rows.reduce(
      (acc, s) => acc + parseFloat(s.preco),
      0
    );
    const dataInicio = new Date(data_hora_inicio);
    const dataFim = new Date(
      dataInicio.getTime() + duracao_total_minutos * 60000
    );
    let cliente;
    const clienteExistente = await client.query(
      "SELECT * FROM cliente WHERE email_contato = $1",
      [email_cliente]
    );
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
      profissionalId,
      cliente.id,
    ]);
    const carrinho_id = carrinhoResult.rows[0].id;
    const carrinhoServicoQuery = `INSERT INTO carrinho_servico (carrinho_id, servico_id) VALUES ($1, $2)`;
    for (const servico_id of servicos_ids) {
      await client.query(carrinhoServicoQuery, [carrinho_id, servico_id]);
    }
    await client.query("COMMIT");
    res
      .status(201)
      .json({ message: "Agendamento criado com sucesso.", carrinho_id });
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
      return res
        .status(400)
        .json({ message: "Email e senha são obrigatórios." });
    const result = await db.query(
      "SELECT * FROM profissional WHERE email = $1",
      [email]
    );
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
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

app.post(
  "/profissionais",
  authMiddleware,
  checkRole(["dono"]),
  async (req, res) => {
    try {
      const donoId = req.profissional.id;
      const { nome, email, senha, role } = req.body;
      if (!nome || !email || !senha || !role)
        return res.status(400).json({
          message: "Nome, email, senha e papel (role) são obrigatórios.",
        });
      const filialResult = await db.query(
        "SELECT filial_id FROM profissional WHERE id = $1",
        [donoId]
      );
      if (!filialResult.rows[0]?.filial_id)
        return res.status(400).json({
          message: "Administrador não está associado a uma filial válida.",
        });
      const filial_id = filialResult.rows[0].filial_id;
      const salt = await bcrypt.genSalt(10);
      const senhaHash = await bcrypt.hash(senha, salt);
      const queryText = `INSERT INTO profissional (nome, email, senha_hash, role, filial_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, nome, email, role;`;
      const result = await db.query(queryText, [
        nome,
        email,
        senhaHash,
        role,
        filial_id,
      ]);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      if (error.code === "23505")
        return res
          .status(409)
          .json({ message: "Este email já está cadastrado." });
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
      const filialResult = await db.query(
        "SELECT filial_id FROM profissional WHERE id = $1",
        [usuarioLogadoId]
      );
      if (!filialResult.rows[0]?.filial_id)
        return res
          .status(400)
          .json({ message: "Usuário não está associado a uma filial." });
      const filial_id = filialResult.rows[0].filial_id;
      const queryText = `SELECT id, nome, email, role FROM profissional WHERE filial_id = $1 ORDER BY nome;`;
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
      const { nome, email, role } = req.body;
      if (!nome || !email || !role)
        return res
          .status(400)
          .json({ message: "Nome, email e papel são obrigatórios." });
      const queryText = `UPDATE profissional SET nome = $1, email = $2, role = $3 WHERE id = $4 RETURNING id, nome, email, role;`;
      const result = await db.query(queryText, [
        nome,
        email,
        role,
        profissional_id,
      ]);
      if (result.rowCount === 0)
        return res
          .status(404)
          .json({ message: "Profissional não encontrado." });
      res.status(200).json(result.rows[0]);
    } catch (error) {
      if (error.code === "23505")
        return res
          .status(409)
          .json({ message: "Este email já está em uso por outro usuário." });
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
      const result = await db.query("DELETE FROM profissional WHERE id = $1", [
        profissional_id,
      ]);
      if (result.rowCount === 0)
        return res
          .status(404)
          .json({ message: "Profissional não encontrado." });
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

app.post(
  "/profissionais/:id/servicos",
  authMiddleware,
  checkRole(["dono"]),
  async (req, res) => {
    try {
      const { id: profissional_id } = req.params;
      const { servico_id } = req.body;
      if (!servico_id)
        return res
          .status(400)
          .json({ message: "O ID do serviço é obrigatório." });
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

      // Busca a comissão da filial
      const comissaoQuery = `SELECT f.comissao_percentual FROM filial f JOIN profissional p ON f.id = p.filial_id WHERE p.id = $1`;
      const comissaoResult = await db.query(comissaoQuery, [profissional_id]);
      const comissao = comissaoResult.rows[0]?.comissao_percentual || 50;

      // Busca os agendamentos concluídos do funcionário no período
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

      // Calcula o valor líquido para cada serviço
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
    // Lógica unificada: qualquer profissional logado vê todos os serviços da sua filial
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
    const result = await db.query(queryText, [
      nome_servico,
      duracao_minutos,
      preco,
      profissional_id,
    ]);
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
        return res
          .status(400)
          .json({ message: "Todos os campos são obrigatórios." });
      const queryText = `UPDATE servico SET nome_servico = $1, duracao_minutos = $2, preco = $3, atualizado_em = NOW() WHERE id = $4 AND profissional_id = $5 RETURNING *;`;
      const result = await db.query(queryText, [
        nome_servico,
        duracao_minutos,
        preco,
        servico_id,
        profissional_id,
      ]);
      if (result.rowCount === 0)
        return res
          .status(404)
          .json({ message: "Serviço não encontrado ou não pertence a você." });
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
      const result = await db.query(
        "DELETE FROM servico WHERE id = $1 AND profissional_id = $2",
        [servico_id, profissional_id]
      );
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
    const baseQuery = `SELECT ca.id, ca.data_hora_inicio, ca.data_hora_fim, ca.status, c.nome_cliente, c.telefone_contato, p.nome as nome_profissional, (SELECT STRING_AGG(s.nome_servico, ', ') FROM servico s JOIN carrinho_servico cs ON s.id = cs.servico_id WHERE cs.carrinho_id = ca.id) as nome_servico FROM carrinho_agendamento ca JOIN cliente c ON ca.cliente_id = c.id JOIN profissional p ON ca.profissional_id = p.id`;

    if (role === "dono" || role === "recepcionista") {
      const filialResult = await db.query(
        "SELECT filial_id FROM profissional WHERE id = $1",
        [profissional_id]
      );
      const filial_id = filialResult.rows[0]?.filial_id;
      if (!filial_id)
        return res
          .status(200)
          .json({ agendamentos: [], horarioTrabalho: null });
      queryText = `${baseQuery} WHERE p.filial_id = $1 ORDER BY ca.data_hora_inicio ASC;`;
      values = [filial_id];
    } else {
      queryText = `${baseQuery} WHERE ca.profissional_id = $1 ORDER BY ca.data_hora_inicio ASC;`;
      values = [profissional_id];
    }
    const agendamentosResult = await db.query(queryText, values);
    const profissionalResult = await db.query(
      "SELECT config_horarios FROM profissional WHERE id = $1",
      [profissional_id]
    );
    res.status(200).json({
      agendamentos: agendamentosResult.rows,
      horarioTrabalho:
        profissionalResult.rows.length > 0
          ? profissionalResult.rows[0].config_horarios
          : null,
    });
  } catch (error) {
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

app.post("/agendamentos", authMiddleware, async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query("BEGIN");
    const { id: logado_id, role } = req.profissional;
    const {
      servicos_ids,
      nome_cliente,
      telefone_cliente,
      data_hora_inicio,
      agendado_para_id,
    } = req.body;
    const profissional_final_id =
      role === "dono" || role === "recepcionista"
        ? agendado_para_id
        : logado_id;
    if (
      !servicos_ids ||
      servicos_ids.length === 0 ||
      !nome_cliente ||
      !telefone_cliente ||
      !data_hora_inicio ||
      !profissional_final_id
    ) {
      return res
        .status(400)
        .json({ message: "Todos os campos são obrigatórios." });
    }
    let cliente;
    const clienteExistente = await client.query(
      "SELECT * FROM cliente WHERE telefone_contato = $1",
      [telefone_cliente]
    );
    if (clienteExistente.rows.length > 0) {
      cliente = clienteExistente.rows[0];
    } else {
      const novoCliente = await client.query(
        "INSERT INTO cliente (nome_cliente, telefone_contato, email_contato) VALUES ($1, $2, $3) RETURNING *",
        [nome_cliente, telefone_cliente, `cliente_${Date.now()}@manual.com`]
      );
      cliente = novoCliente.rows[0];
    }
    const servicosInfoQuery = `SELECT id, duracao_minutos, preco FROM servico WHERE id = ANY($1::uuid[])`;
    const servicosInfoResult = await client.query(servicosInfoQuery, [
      servicos_ids,
    ]);
    if (servicosInfoResult.rows.length !== servicos_ids.length)
      throw new Error("Um ou mais serviços não foram encontrados.");
    const duracao_total_minutos = servicosInfoResult.rows.reduce(
      (acc, s) => acc + s.duracao_minutos,
      0
    );
    const preco_total = servicosInfoResult.rows.reduce(
      (acc, s) => acc + parseFloat(s.preco),
      0
    );
    const dataInicio = new Date(data_hora_inicio);
    const dataFim = new Date(
      dataInicio.getTime() + duracao_total_minutos * 60000
    );
    const carrinhoQuery = `INSERT INTO carrinho_agendamento (data_hora_inicio, data_hora_fim, preco_total, duracao_total_minutos, profissional_id, cliente_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;`;
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
    res.status(500).json({ message: "Erro interno do servidor." });
  } finally {
    client.release();
  }
});

// ROTA DE ATUALIZAÇÃO CORRIGIDA
app.put("/agendamentos/:id", authMiddleware, async (req, res) => {
  try {
    const { id: agendamento_id } = req.params;
    const { id: profissional_id, role } = req.profissional;
    const { status } = req.body;
    if (!status)
      return res
        .status(400)
        .json({ message: "O campo status é obrigatório para atualização." });

    let queryText;
    let values;

    // Adicionamos a coluna 'atualizado_em' que faltava na tabela carrinho_agendamento
    // E garantimos que a query esteja correta
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
      return res.status(404).json({
        message:
          "Agendamento não encontrado ou você não tem permissão para atualizá-lo.",
      });

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Erro ao atualizar agendamento:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

// ROTA DE DELEÇÃO (DELETE) CORRIGIDA
app.delete("/agendamentos/:id", authMiddleware, async (req, res) => {
  try {
    const { id: agendamento_id } = req.params;
    const { id: profissional_id, role } = req.profissional;
    let queryText;
    let values;

    if (role === "dono" || role === "recepcionista") {
      // Dono e Recepcionista podem deletar qualquer agendamento da filial
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
      // Funcionário só pode deletar o seu próprio agendamento
      queryText =
        "DELETE FROM carrinho_agendamento WHERE id = $1 AND profissional_id = $2";
      values = [agendamento_id, profissional_id];
    }

    const result = await db.query(queryText, values);
    if (result.rowCount === 0)
      return res.status(404).json({
        message:
          "Agendamento não encontrado ou você não tem permissão para deletá-lo.",
      });

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

      // Busca tanto os horários do profissional (dono) quanto a comissão da filial
      const horariosResult = await db.query(
        "SELECT config_horarios FROM profissional WHERE id = $1",
        [profissional_id]
      );
      const filialResult = await db.query(
        "SELECT f.comissao_percentual FROM filial f JOIN profissional p ON f.id = p.filial_id WHERE p.id = $1",
        [profissional_id]
      );

      if (horariosResult.rows.length === 0 || filialResult.rows.length === 0) {
        return res
          .status(404)
          .json({ message: "Configurações não encontradas." });
      }

      // Retorna um objeto com ambas as configurações
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
      const { horarios, comissao } = req.body; // Agora recebe horários e comissão

      // 1. Atualiza os horários na tabela do profissional (dono)
      if (horarios) {
        await db.query(
          `UPDATE profissional SET config_horarios = $1 WHERE id = $2`,
          [horarios, profissional_id]
        );
      }

      // 2. Atualiza a comissão na tabela da filial
      if (comissao !== undefined) {
        const filialResult = await db.query(
          "SELECT filial_id FROM profissional WHERE id = $1",
          [profissional_id]
        );
        const filial_id = filialResult.rows[0]?.filial_id;
        if (filial_id) {
          await db.query(
            `UPDATE filial SET comissao_percentual = $1 WHERE id = $2`,
            [comissao, filial_id]
          );
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

// --- ROTAS DE CLIENTE (AUTENTICAÇÃO) ---
app.post("/clientes/cadastro", async (req, res) => {
  try {
    const { nome, email, telefone, senha } = req.body;
    if (!nome || !email || !senha || !telefone)
      return res
        .status(400)
        .json({ message: "Todos os campos são obrigatórios." });
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);
    const queryText = `INSERT INTO cliente (nome_cliente, email_contato, telefone_contato, senha_hash) VALUES ($1, $2, $3, $4) RETURNING id, nome_cliente, email_contato;`;
    const result = await db.query(queryText, [
      nome,
      email,
      telefone,
      senhaHash,
    ]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505")
      return res
        .status(409)
        .json({ message: "Este email já está cadastrado." });
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

app.post("/clientes/login", async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha)
      return res
        .status(400)
        .json({ message: "Email e senha são obrigatórios." });
    const result = await db.query(
      "SELECT * FROM cliente WHERE email_contato = $1",
      [email]
    );
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
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
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
        return res.status(404).json({
          message: "Agendamento não encontrado ou não pertence a você.",
        });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

// ROTA PARA LISTAR TODOS OS CLIENTES DA FILIAL
app.get(
  "/clientes",
  authMiddleware,
  checkRole(["dono", "recepcionista"]),
  async (req, res) => {
    try {
      const { id: profissional_id } = req.profissional;

      // Descobre a filial do usuário logado
      const filialResult = await db.query(
        "SELECT filial_id FROM profissional WHERE id = $1",
        [profissional_id]
      );
      const filial_id = filialResult.rows[0]?.filial_id;
      if (!filial_id) {
        return res
          .status(400)
          .json({ message: "Usuário não associado a uma filial." });
      }

      // Busca todos os clientes únicos que já tiveram um agendamento em qualquer profissional daquela filial
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

app.post("/esqueci-senha", async (req, res) => {
  try {
    const { email, tipo } = req.body;
    console.log(
      `[LOG] Solicitação de reset para email: ${email}, tipo: ${tipo}`
    );

    const tabela = tipo === "profissional" ? "profissional" : "cliente";
    const colunaEmail = tipo === "profissional" ? "email" : "email_contato";

    const userResult = await db.query(
      `SELECT * FROM ${tabela} WHERE ${colunaEmail} = $1`,
      [email]
    );

    if (userResult.rows.length === 0) {
      console.log(
        `[LOG] Usuário com email ${email} não encontrado na tabela ${tabela}. Respondendo com sucesso genérico.`
      );
      return res.status(200).json({
        message:
          "Se um usuário com este email existir, um link de recuperação será enviado.",
      });
    }
    console.log(`[LOG] Usuário ${email} encontrado. Gerando token de reset...`);

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const tokenExpires = new Date(Date.now() + 3600000);

    await db.query(
      `UPDATE ${tabela} SET reset_token = $1, reset_token_expires = $2 WHERE ${colunaEmail} = $3`,
      [hashedToken, tokenExpires, email]
    );
    console.log(`[LOG] Token de reset salvo no banco de dados para ${email}.`);

    const resetUrl = `http://localhost:3000/resetar-senha/${resetToken}?tipo=${tipo}`;
    console.log(
      `[LOG] Preparando para enviar email para ${email} com o link: ${resetUrl}`
    );

    await enviarEmailReset(email, resetUrl); // A chamada para o nosso email.js

    console.log(
      `[LOG] Processo de /esqueci-senha concluído com sucesso para ${email}.`
    );
    res.status(200).json({
      message:
        "Se um usuário com este email existir, um link de recuperação será enviado.",
    });
  } catch (error) {
    console.error("ERRO CRÍTICO NA ROTA /esqueci-senha:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

// ROTA PARA EFETIVAMENTE RESETAR A SENHA
app.post("/resetar-senha", async (req, res) => {
  try {
    const { token, tipo, senha } = req.body;
    if (!token || !tipo || !senha) {
      return res
        .status(400)
        .json({ message: "Token, tipo e nova senha são obrigatórios." });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    let userResult;

    if (tipo === "profissional") {
      userResult = await db.query(
        `SELECT * FROM profissional WHERE reset_token = $1 AND reset_token_expires > NOW()`,
        [hashedToken]
      );
    } else if (tipo === "cliente") {
      userResult = await db.query(
        `SELECT * FROM cliente WHERE reset_token = $1 AND reset_token_expires > NOW()`,
        [hashedToken]
      );
    } else {
      return res.status(400).json({ message: "Tipo de usuário inválido." });
    }

    if (userResult.rows.length === 0) {
      return res
        .status(400)
        .json({ message: "Token de recuperação inválido ou expirado." });
    }
    const user = userResult.rows[0];

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);

    if (tipo === "profissional") {
      await db.query(
        `UPDATE profissional SET senha_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2`,
        [senhaHash, user.id]
      );
    } else {
      await db.query(
        `UPDATE cliente SET senha_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2`,
        [senhaHash, user.id]
      );
    }

    res.status(200).json({ message: "Senha atualizada com sucesso." });
  } catch (error) {
    console.error("ERRO DETALHADO EM /resetar-senha:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

// =================================================================
// --- INICIALIZAÇÃO DO SERVIDOR ---
// =================================================================
app.listen(port, () => {
  console.log(
    `🚀🚀🚀 SERVIDOR COM CORREÇÃO FINAL rodando na porta http://localhost:${port}`
  );
});
