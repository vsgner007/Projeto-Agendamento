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

app.listen(port, () => {
  console.log(`Backend reconstruído rodando na porta http://localhost:${port}`);
});
