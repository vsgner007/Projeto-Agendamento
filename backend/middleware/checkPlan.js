// backend/middleware/checkPlan.js

const checkPlan = (planosPermitidos) => {
  return (req, res, next) => {
    const userPlan = req.profissional?.plano;
    const vencimento = req.profissional?.assinatura_vence_em;
    const hoje = new Date();

    // 1. Bloqueia contas pendentes
    if (userPlan === "pendente_pagamento") {
      return res
        .status(403)
        .json({
          message:
            "Seu pagamento está pendente. Por favor, conclua o cadastro.",
        });
    }

    // 2. Bloqueia contas com assinatura vencida
    if (!vencimento || new Date(vencimento) < hoje) {
      return res
        .status(403)
        .json({
          message:
            "Sua assinatura está vencida. Por favor, verifique seu email para pagar a fatura e reativar sua conta.",
        });
    }

    // 3. Bloqueia funcionalidades do plano
    if (planosPermitidos && planosPermitidos.includes(userPlan)) {
      next(); // Tudo certo, pode passar
    } else {
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
