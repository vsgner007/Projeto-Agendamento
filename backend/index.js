const express = require("express");
const db = require("./db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const authMiddleware = require("./middleware/auth");

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// --- ROTAS PÚBLICAS (PARA A PÁGINA DE AGENDAMENTO DO CLIENTE) ---

// ROTA PÚBLICA PARA BUSCAR OS SERVIÇOS DE UM PROFISSIONAL
app.get("/publico/servicos/:profissionalId", async (req, res) => {
  try {
    const { profissionalId } = req.params;
    const result = await db.query(
      "SELECT id, nome_servico, duracao_minutos, preco FROM Servico WHERE profissional_id = $1",
      [profissionalId]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Erro ao buscar serviços públicos:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

// ROTA PÚBLICA PARA BUSCAR A AGENDA DE UM DIA (HORÁRIOS JÁ OCUPADOS)
app.get("/publico/agenda/:profissionalId", async (req, res) => {
  try {
    const { profissionalId } = req.params;
    const { data } = req.query;

    if (!data) {
      return res.status(400).json({ message: "A data é obrigatória." });
    }

    // Busca os agendamentos do dia
    const agendamentosQuery = `
            SELECT data_hora_inicio, data_hora_fim 
            FROM Agendamento 
            WHERE profissional_id = $1 AND data_hora_inicio::date = $2
        `;
    const agendamentosResult = await db.query(agendamentosQuery, [
      profissionalId,
      data,
    ]);

    // Busca o horário de trabalho do profissional
    const profissionalQuery =
      "SELECT config_horarios FROM Profissional WHERE id = $1";
    const profissionalResult = await db.query(profissionalQuery, [
      profissionalId,
    ]);

    if (profissionalResult.rows.length === 0) {
      return res.status(404).json({ message: "Profissional não encontrado." });
    }

    res.status(200).json({
      horariosOcupados: agendamentosResult.rows,
      horarioTrabalho: profissionalResult.rows[0].config_horarios,
    });
  } catch (error) {
    console.error("Erro ao buscar agenda pública:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

// ROTA PÚBLICA PARA CRIAR UM AGENDAMENTO
app.post("/publico/agendamentos/:profissionalId", async (req, res) => {
  try {
    const { profissionalId } = req.params;
    const { servico_id, nome_cliente, telefone_cliente, data_hora_inicio } =
      req.body;

    if (
      !servico_id ||
      !nome_cliente ||
      !telefone_cliente ||
      !data_hora_inicio
    ) {
      return res
        .status(400)
        .json({ message: "Todos os campos são obrigatórios." });
    }

    // A lógica aqui é idêntica à da rota protegida,
    // mas usamos o profissionalId da URL em vez do token.

    // 1. Encontrar ou Criar o Cliente
    let cliente;
    const clienteExistente = await db.query(
      "SELECT * FROM Cliente WHERE telefone_contato = $1 AND profissional_id = $2",
      [telefone_cliente, profissionalId]
    );

    if (clienteExistente.rows.length > 0) {
      cliente = clienteExistente.rows[0];
    } else {
      const novoCliente = await db.query(
        "INSERT INTO Cliente (nome_cliente, telefone_contato, profissional_id) VALUES ($1, $2, $3) RETURNING *",
        [nome_cliente, telefone_cliente, profissionalId]
      );
      cliente = novoCliente.rows[0];
    }

    // 2. Buscar a duração do serviço
    const servicoInfo = await db.query(
      "SELECT duracao_minutos FROM Servico WHERE id = $1",
      [servico_id]
    );
    if (servicoInfo.rows.length === 0) {
      return res.status(404).json({ message: "Serviço não encontrado." });
    }
    const duracao = servicoInfo.rows[0].duracao_minutos;

    // 3. Calcular data_hora_fim
    const dataInicio = new Date(data_hora_inicio);
    const dataFim = new Date(dataInicio.getTime() + duracao * 60000);

    // 4. Criar o Agendamento
    const queryText = `
            INSERT INTO Agendamento (data_hora_inicio, data_hora_fim, profissional_id, cliente_id, servico_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
    const values = [
      dataInicio.toISOString(),
      dataFim.toISOString(),
      profissionalId,
      cliente.id,
      servico_id,
    ];
    const result = await db.query(queryText, values);

    // No futuro, aqui você poderia enviar um email/SMS de confirmação

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Erro ao criar agendamento público:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

// Rotas de Autenticação
app.post("/profissionais", async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha)
      return res
        .status(400)
        .json({ message: "Todos os campos são obrigatórios." });
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);
    const queryText = `INSERT INTO Profissional (nome, email, senha_hash) VALUES ($1, $2, $3) RETURNING id, nome, email;`;
    const result = await db.query(queryText, [nome, email, senhaHash]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505")
      return res
        .status(409)
        .json({ message: "Este email já está cadastrado." });
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha)
      return res
        .status(400)
        .json({ message: "Email e senha são obrigatórios." });
    const result = await db.query(
      "SELECT * FROM Profissional WHERE email = $1",
      [email]
    );
    if (result.rows.length === 0)
      return res.status(401).json({ message: "Credenciais inválidas." });
    const profissional = result.rows[0];
    const senhaCorreta = await bcrypt.compare(senha, profissional.senha_hash);
    if (!senhaCorreta)
      return res.status(401).json({ message: "Credenciais inválidas." });
    const token = jwt.sign(
      { id: profissional.id, nome: profissional.nome },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    res.status(200).json({ token: token });
  } catch (error) {
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

// Rotas de Serviços (Protegidas)
app.post("/servicos", authMiddleware, async (req, res) => {
  try {
    const { id: profissional_id } = req.profissional;
    const { nome_servico, duracao_minutos, preco } = req.body;
    const queryText = `INSERT INTO Servico (nome_servico, duracao_minutos, preco, profissional_id) VALUES ($1, $2, $3, $4) RETURNING *;`;
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

app.put("/servicos/:id", authMiddleware, async (req, res) => {
  try {
    const { id: servico_id } = req.params;
    const { id: profissional_id } = req.profissional;
    const { nome_servico, duracao_minutos, preco } = req.body;

    if (!nome_servico || !duracao_minutos || !preco) {
      return res
        .status(400)
        .json({ message: "Todos os campos são obrigatórios." });
    }
    const queryText = `
      UPDATE Servico
      SET nome_servico = $1, duracao_minutos = $2, preco = $3, atualizado_em = NOW()
      WHERE id = $4 AND profissional_id = $5
      RETURNING *;
    `;
    const values = [
      nome_servico,
      duracao_minutos,
      preco,
      servico_id,
      profissional_id,
    ];
    const result = await db.query(queryText, values);
    if (result.rowCount === 0) {
      console.log(
        "UPDATE falhou: O serviço não foi encontrado ou não pertence ao profissional."
      );
      return res
        .status(404)
        .json({ message: "Serviço não encontrado ou não pertence a você." });
    }
    console.log("UPDATE bem-sucedido!");
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Erro GERAL na rota PUT /servicos/:id :", error);
    return res.status(500).json({ message: "Erro interno do servidor." });
  }
});

app.get("/servicos", authMiddleware, async (req, res) => {
  try {
    const { id: profissional_id } = req.profissional;
    const result = await db.query(
      "SELECT * FROM Servico WHERE profissional_id = $1 ORDER BY criado_em DESC",
      [profissional_id]
    );
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

app.delete("/servicos/:id", authMiddleware, async (req, res) => {
  try {
    const { id: servico_id } = req.params;
    const { id: profissional_id } = req.profissional;
    const result = await db.query(
      "DELETE FROM Servico WHERE id = $1 AND profissional_id = $2",
      [servico_id, profissional_id]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ message: "Serviço não encontrado." });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

// --- ROTAS DE RELATÓRIOS (PROTEGIDAS) ---
app.get("/relatorios/servicos-realizados", authMiddleware, async (req, res) => {
  try {
    const { id: profissional_id } = req.profissional;

    // Query que busca agendamentos concluídos, juntando dados do cliente e do serviço (incluindo o preço)
    const queryText = `
            SELECT 
                a.id, a.data_hora_inicio,
                c.nome_cliente,
                s.nome_servico, s.preco
            FROM Agendamento a
            JOIN Cliente c ON a.cliente_id = c.id
            JOIN Servico s ON a.servico_id = s.id
            WHERE a.profissional_id = $1 AND a.status = 'concluido'
            ORDER BY a.data_hora_inicio DESC;
        `;

    const result = await db.query(queryText, [profissional_id]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Erro ao gerar relatório de serviços realizados:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

// --- ROTAS DE AGENDAMENTOS (PROTEGIDAS) ---

// ROTA PARA LISTAR AGENDAMENTOS DE UM PROFISSIONAL
app.get("/agendamentos", authMiddleware, async (req, res) => {
  try {
    const { id: profissional_id } = req.profissional;

    const queryText = `
            SELECT 
                a.id, a.data_hora_inicio, a.data_hora_fim, a.status,
                c.nome_cliente,
                s.nome_servico
            FROM Agendamento a
            JOIN Cliente c ON a.cliente_id = c.id
            JOIN Servico s ON a.servico_id = s.id
            WHERE a.profissional_id = $1
            ORDER BY a.data_hora_inicio ASC;
        `;

    const result = await db.query(queryText, [profissional_id]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Erro ao listar agendamentos:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

// ROTA PARA CRIAR UM NOVO AGENDAMENTO
app.post("/agendamentos", authMiddleware, async (req, res) => {
  try {
    const { id: profissional_id } = req.profissional;
    const { servico_id, nome_cliente, telefone_cliente, data_hora_inicio } =
      req.body;

    if (
      !servico_id ||
      !nome_cliente ||
      !telefone_cliente ||
      !data_hora_inicio
    ) {
      return res
        .status(400)
        .json({ message: "Todos os campos são obrigatórios." });
    }

    let cliente;
    const clienteExistente = await db.query(
      "SELECT * FROM Cliente WHERE telefone_contato = $1 AND profissional_id = $2",
      [telefone_cliente, profissional_id]
    );

    if (clienteExistente.rows.length > 0) {
      cliente = clienteExistente.rows[0];
    } else {
      const novoCliente = await db.query(
        "INSERT INTO Cliente (nome_cliente, telefone_contato, profissional_id) VALUES ($1, $2, $3) RETURNING *",
        [nome_cliente, telefone_cliente, profissional_id]
      );
      cliente = novoCliente.rows[0];
    }

    const servicoInfo = await db.query(
      "SELECT duracao_minutos FROM Servico WHERE id = $1",
      [servico_id]
    );
    if (servicoInfo.rows.length === 0) {
      return res.status(404).json({ message: "Serviço não encontrado." });
    }
    const duracao = servicoInfo.rows[0].duracao_minutos;

    const dataInicio = new Date(data_hora_inicio);
    const dataFim = new Date(dataInicio.getTime() + duracao * 60000);

    const queryText = `
            INSERT INTO Agendamento (data_hora_inicio, data_hora_fim, profissional_id, cliente_id, servico_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
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
    console.error("Erro ao criar agendamento:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

// ROTA PARA DELETAR UM AGENDAMENTO
app.delete("/agendamentos/:id", authMiddleware, async (req, res) => {
  try {
    const { id: agendamento_id } = req.params;
    const { id: profissional_id } = req.profissional;

    // Garante que o profissional só pode deletar o próprio agendamento
    const result = await db.query(
      "DELETE FROM Agendamento WHERE id = $1 AND profissional_id = $2",
      [agendamento_id, profissional_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Agendamento não encontrado ou não pertence a você.",
      });
    }

    res.status(204).send(); // Sucesso, sem conteúdo
  } catch (error) {
    console.error("Erro ao deletar agendamento:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

// ROTA PARA ATUALIZAR UM AGENDAMENTO (ex: status ou data/hora)
app.put("/agendamentos/:id", authMiddleware, async (req, res) => {
  try {
    const { id: agendamento_id } = req.params;
    const { id: profissional_id } = req.profissional;
    const { data_hora_inicio, status } = req.body; // Campos que permitiremos editar por enquanto

    // Lógica para recalcular data_hora_fim se a data de início mudar
    // (Esta é uma versão simplificada. Uma versão completa exigiria mais validações)
    // Por agora, focaremos em permitir a mudança de status.

    // Vamos focar em permitir a atualização do STATUS por enquanto
    if (!status) {
      return res
        .status(400)
        .json({ message: "O campo status é obrigatório para atualização." });
    }

    const queryText = `
            UPDATE Agendamento
            SET status = $1, atualizado_em = NOW()
            WHERE id = $2 AND profissional_id = $3
            RETURNING *;
        `;
    const result = await db.query(queryText, [
      status,
      agendamento_id,
      profissional_id,
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Agendamento não encontrado ou não pertence a você.",
      });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Erro ao atualizar agendamento:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
});

app.listen(port, () => {
  console.log(`Backend reconstruído rodando na porta http://localhost:${port}`);
});
