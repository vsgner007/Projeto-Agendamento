// backend/middleware/authCliente.js
const jwt = require("jsonwebtoken");

function authClienteMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Acesso negado. Token não fornecido." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verificação crucial: garante que o token é do tipo 'cliente'
    if (decoded.tipo !== "cliente") {
      return res
        .status(403)
        .json({ message: "Acesso negado. Permissão insuficiente." });
    }

    req.cliente = decoded; // Adiciona os dados do cliente à requisição
    next();
  } catch (error) {
    return res.status(403).json({ message: "Token inválido." });
  }
}

module.exports = authClienteMiddleware;
