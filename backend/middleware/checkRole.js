const checkRole = (rolesPermitidas) => {
  return (req, res, next) => {
    // Pega o papel do usuário que foi decodificado pelo authMiddleware
    const userRole = req.profissional?.role;

    if (userRole && rolesPermitidas.includes(userRole)) {
      // Se o papel do usuário está na lista de papéis permitidos, prossiga.
      next();
    } else {
      // Se não, acesso negado (403 Forbidden).
      res
        .status(403)
        .json({
          message: "Acesso negado. Você não tem permissão para este recurso.",
        });
    }
  };
};

module.exports = checkRole;
