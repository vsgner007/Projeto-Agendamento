// backend/middleware/checkPlan.js
const checkPlan = (planosPermitidos) => {
  return (req, res, next) => {
    const userPlan = req.profissional?.plano;

    if (userPlan && planosPermitidos.includes(userPlan)) {
      // Se o plano do usuário está na lista de planos permitidos, prossiga.
      next();
    } else {
      // Se não, acesso negado.
      res
        .status(403)
        .json({
          message:
            "Funcionalidade não disponível no seu plano. Considere fazer um upgrade.",
        });
    }
  };
};

module.exports = checkPlan;
