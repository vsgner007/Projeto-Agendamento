// backend/middleware/checkPlan.js
const checkPlan = (planosPermitidos) => {
  return (req, res, next) => {
    // Pega o plano que foi colocado no token durante o login
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
