const jwt = require("jsonwebtoken");

function authFuncionarioMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Acesso negado." });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "funcionario") {
      return res.status(403).json({ message: "Permissão insuficiente." });
    }
    req.profissional = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Token inválido." });
  }
}

module.exports = authFuncionarioMiddleware;
