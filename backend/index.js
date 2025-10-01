const express = require("express");
const db = require("./db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const authMiddleware = require("./middleware/auth");
const checkRole = require("./middleware/checkRole");

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// =================================================================
// --- ROTAS PÚBLICAS (Acessíveis sem login) ---
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
      "SELECT id, nome FROM profissional WHERE filial_id = $1 ORDER BY nome",
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

    // Primeiro, descobrimos o papel (role) do profissional solicitado
    const roleResult = await db.query(
      "SELECT role FROM profissional WHERE id = $1",
      [profissionalId]
    );
    if (roleResult.rows.length === 0) {
      return res.status(404).json({ message: "Profissional não encontrado." });
    }
    const role = roleResult.rows[0].role;

    let queryText;
    const values = [profissionalId];

    // Agora, a lógica é condicional
    if (role === "dono") {
      // Se for dono, busca todos os serviços que ele mesmo criou
      queryText =
        "SELECT id, nome_servico, duracao_minutos, preco FROM servico WHERE profissional_id = $1";
    } else {
      // Se for funcionário, busca apenas os serviços associados a ele
      queryText = `
            SELECT s.id, s.nome_servico, s.duracao_minutos, s.preco 
            FROM servico s
            JOIN profissional_servico ps ON s.id = ps.servico_id
            WHERE ps.profissional_id = $1;
        `;
    }

    const result = await db.query(queryText, values);
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
    if (!data)
      return res.status(400).json({ message: "A data é obrigatória." });
    const agendamentosResult = await db.query(
      `SELECT data_hora_inicio, data_hora_fim FROM agendamento WHERE profissional_id = $1 AND data_hora_inicio::date = $2`,
      [profissionalId, data]
    );
    const profissionalResult = await db.query(
      "SELECT config_horarios FROM profissional WHERE id = $1",
      [profissionalId]
    );
    if (profissionalResult.rows.length === 0)
      return res.status(404).json({ message: "Profissional não encontrado." });
    res.status(200).json({
      horariosOcupados: agendamentosResult.rows,
      horarioTrabalho: profissionalResult.rows[0].config_horarios,
    });
  } catch (error) {
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

app.post("/publico/agendamentos/:profissionalId", async (req, res) => {
  try {
    const { profissionalId } = req.params;
    const { servico_id, nome_cliente, telefone_cliente, data_hora_inicio } =
      req.body;
    if (!servico_id || !nome_cliente || !telefone_cliente || !data_hora_inicio)
      return res
        .status(400)
        .json({ message: "Todos os campos são obrigatórios." });
    let cliente;
    const clienteExistente = await db.query(
      "SELECT * FROM cliente WHERE telefone_contato = $1 AND profissional_id = $2",
      [telefone_cliente, profissionalId]
    );
    if (clienteExistente.rows.length > 0) {
      cliente = clienteExistente.rows[0];
    } else {
      const novoCliente = await db.query(
        "INSERT INTO cliente (nome_cliente, telefone_contato, profissional_id) VALUES ($1, $2, $3) RETURNING *",
        [nome_cliente, telefone_cliente, profissionalId]
      );
      cliente = novoCliente.rows[0];
    }
    const servicoInfo = await db.query(
      "SELECT duracao_minutos FROM servico WHERE id = $1",
      [servico_id]
    );
    if (servicoInfo.rows.length === 0)
      return res.status(404).json({ message: "Serviço não encontrado." });
    const duracao = servicoInfo.rows[0].duracao_minutos;
    const dataInicio = new Date(data_hora_inicio);
    const dataFim = new Date(dataInicio.getTime() + duracao * 60000);
    const queryText = `INSERT INTO agendamento (data_hora_inicio, data_hora_fim, profissional_id, cliente_id, servico_id) VALUES ($1, $2, $3, $4, $5) RETURNING *;`;
    const values = [
      dataInicio.toISOString(),
      dataFim.toISOString(),
      profissionalId,
      cliente.id,
      servico_id,
    ];
    const result = await db.query(queryText, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Erro interno do servidor." });
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
  checkRole(["dono"]),
  async (req, res) => {
    try {
      const donoId = req.profissional.id;
      const filialResult = await db.query(
        "SELECT filial_id FROM profissional WHERE id = $1",
        [donoId]
      );
      if (!filialResult.rows[0]?.filial_id)
        return res
          .status(400)
          .json({ message: "Administrador não está associado a uma filial." });
      const filial_id = filialResult.rows[0].filial_id;
      const queryText = `SELECT id, nome, email, role FROM profissional WHERE filial_id = $1 AND id != $2 ORDER BY nome;`;
      const result = await db.query(queryText, [filial_id, donoId]);
      res.status(200).json(result.rows);
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

// =================================================================
// --- ROTAS PROTEGIDAS DO PAINEL ---
// =================================================================

// --- Serviços ---
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

app.get("/servicos", authMiddleware, async (req, res) => {
  try {
    const { id: profissional_id, role } = req.profissional;
    let queryText;
    const values = [profissional_id];
    if (role === "dono") {
      queryText =
        "SELECT * FROM servico WHERE profissional_id = $1 ORDER BY criado_em DESC";
    } else {
      queryText = `SELECT s.* FROM servico s JOIN profissional_servico ps ON s.id = ps.servico_id WHERE ps.profissional_id = $1 ORDER BY s.nome_servico;`;
    }
    const result = await db.query(queryText, values);
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

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
    const { id: profissional_id } = req.profissional;
    const { data } = req.query;
    let agendamentosResult;
    if (data) {
      const queryText = `SELECT data_hora_inicio, data_hora_fim FROM agendamento WHERE profissional_id = $1 AND data_hora_inicio::date = $2`;
      agendamentosResult = await db.query(queryText, [profissional_id, data]);
    } else {
      const queryText = `SELECT a.id, a.data_hora_inicio, a.data_hora_fim, a.status, c.nome_cliente, s.nome_servico FROM agendamento a JOIN cliente c ON a.cliente_id = c.id JOIN servico s ON a.servico_id = s.id WHERE a.profissional_id = $1 ORDER BY a.data_hora_inicio ASC;`;
      agendamentosResult = await db.query(queryText, [profissional_id]);
    }
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
  try {
    const { id: profissional_id } = req.profissional;
    const { servico_id, nome_cliente, telefone_cliente, data_hora_inicio } =
      req.body;
    if (!servico_id || !nome_cliente || !telefone_cliente || !data_hora_inicio)
      return res
        .status(400)
        .json({ message: "Todos os campos são obrigatórios." });
    let cliente;
    const clienteExistente = await db.query(
      "SELECT * FROM cliente WHERE telefone_contato = $1 AND profissional_id = $2",
      [telefone_cliente, profissional_id]
    );
    if (clienteExistente.rows.length > 0) {
      cliente = clienteExistente.rows[0];
    } else {
      const novoCliente = await db.query(
        "INSERT INTO cliente (nome_cliente, telefone_contato, profissional_id) VALUES ($1, $2, $3) RETURNING *",
        [nome_cliente, telefone_cliente, profissional_id]
      );
      cliente = novoCliente.rows[0];
    }
    const servicoInfo = await db.query(
      "SELECT duracao_minutos FROM servico WHERE id = $1",
      [servico_id]
    );
    if (servicoInfo.rows.length === 0)
      return res.status(404).json({ message: "Serviço não encontrado." });
    const duracao = servicoInfo.rows[0].duracao_minutos;
    const dataInicio = new Date(data_hora_inicio);
    const dataFim = new Date(dataInicio.getTime() + duracao * 60000);
    const queryText = `INSERT INTO agendamento (data_hora_inicio, data_hora_fim, profissional_id, cliente_id, servico_id) VALUES ($1, $2, $3, $4, $5) RETURNING *;`;
    const values = [
      dataInicio.toISOString(),
      dataFim.toISOString(),
      profissional_id,
      cliente.id,
      servico_id,
    ];
    const result = await db.query(queryText, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

app.delete("/agendamentos/:id", authMiddleware, async (req, res) => {
  try {
    const { id: agendamento_id } = req.params;
    const { id: profissional_id } = req.profissional;
    const result = await db.query(
      "DELETE FROM agendamento WHERE id = $1 AND profissional_id = $2",
      [agendamento_id, profissional_id]
    );
    if (result.rowCount === 0)
      return res.status(404).json({
        message: "Agendamento não encontrado ou não pertence a você.",
      });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

app.put("/agendamentos/:id", authMiddleware, async (req, res) => {
  try {
    const { id: agendamento_id } = req.params;
    const { id: profissional_id } = req.profissional;
    const { status } = req.body;
    if (!status)
      return res
        .status(400)
        .json({ message: "O campo status é obrigatório para atualização." });
    const queryText = `UPDATE agendamento SET status = $1, atualizado_em = NOW() WHERE id = $2 AND profissional_id = $3 RETURNING *;`;
    const result = await db.query(queryText, [
      status,
      agendamento_id,
      profissional_id,
    ]);
    if (result.rowCount === 0)
      return res.status(404).json({
        message: "Agendamento não encontrado ou não pertence a você.",
      });
    res.status(200).json(result.rows[0]);
  } catch (error) {
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
      const result = await db.query(
        "SELECT config_horarios FROM profissional WHERE id = $1",
        [profissional_id]
      );
      if (result.rows.length === 0)
        return res
          .status(404)
          .json({ message: "Profissional não encontrado." });
      res.status(200).json(result.rows[0].config_horarios);
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
      const novosHorarios = req.body;
      if (typeof novosHorarios !== "object" || novosHorarios === null)
        return res.status(400).json({ message: "Formato de dados inválido." });
      const queryText = `UPDATE profissional SET config_horarios = $1 WHERE id = $2 RETURNING config_horarios;`;
      const result = await db.query(queryText, [
        novosHorarios,
        profissional_id,
      ]);
      res.status(200).json(result.rows[0].config_horarios);
    } catch (error) {
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
      const { id: profissional_id } = req.profissional;
      const { mes, ano } = req.query;
      let queryText = `SELECT a.id, a.data_hora_inicio, c.nome_cliente, s.nome_servico, s.preco FROM agendamento a JOIN cliente c ON a.cliente_id = c.id JOIN servico s ON a.servico_id = s.id WHERE a.profissional_id = $1 AND a.status = 'concluido'`;
      const values = [profissional_id];
      if (mes && ano) {
        queryText += ` AND EXTRACT(MONTH FROM a.data_hora_inicio) = $2 AND EXTRACT(YEAR FROM a.data_hora_inicio) = $3`;
        values.push(mes, ano);
      }
      queryText += ` ORDER BY a.data_hora_inicio DESC;`;
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
      const { id: profissional_id } = req.profissional;
      const { mes, ano } = req.query;
      if (!mes || !ano)
        return res.status(400).json({ message: "Mês e ano são obrigatórios." });
      const queryText = `SELECT s.nome_servico, SUM(s.preco) as faturamento_total, COUNT(a.id) as quantidade FROM agendamento a JOIN servico s ON a.servico_id = s.id WHERE a.profissional_id = $1 AND a.status = 'concluido' AND EXTRACT(MONTH FROM a.data_hora_inicio) = $2 AND EXTRACT(YEAR FROM a.data_hora_inicio) = $3 GROUP BY s.nome_servico ORDER BY faturamento_total DESC;`;
      const result = await db.query(queryText, [profissional_id, mes, ano]);
      res.status(200).json(result.rows);
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor." });
    }
  }
);

// =================================================================
// --- INICIALIZAÇÃO DO SERVIDOR ---
// =================================================================
app.listen(port, () => {
  console.log(
    `🚀🚀🚀 SERVIDOR ATUALIZADO (com ROLE no token) rodando na porta http://localhost:${port}`
  );
});
