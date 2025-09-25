const jwt = require("jsonwebtoken");
function authMiddleware(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res
      .status(401)
      .json({ message: "Acesso negado. Token não fornecido." });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.profissional = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Token inválido." });
  }
}
module.exports = authMiddleware;
