const sgMail = require("@sendgrid/mail");

const apiKey = process.env.SENDGRID_API_KEY;

if (apiKey) {
  console.log("Chave de API do SendGrid encontrada e configurada!");
  sgMail.setApiKey(apiKey);
} else {
  console.error(
    "ERRO CRÍTICO: A variável SENDGRID_API_KEY não foi encontrada no arquivo .env!"
  );
}

async function enviarEmailReset(destinatario, link) {
  // Use diretamente o seu email verificado.
  const remetenteVerificado = "vsgner032@gmail.com";

  const msg = {
    to: destinatario,
    from: remetenteVerificado,
    subject: "Recuperação de Senha - Seu App de Agendamento",
    html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
            <h2>Recuperação de Senha</h2>
            <p>Olá,</p>
            <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
            <p>Clique no botão abaixo para criar uma nova senha. Se você não solicitou isso, pode ignorar este email com segurança.</p>
            <p style="margin: 20px 0;">
                <a href="${link}" target="_blank" style="padding: 12px 25px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-size: 16px;">
                    Redefinir Minha Senha
                </a>
            </p>
            <p>Este link é válido por 1 hora.</p>
        </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(
      "SUCESSO: Email de recuperação enviado via SendGrid para:",
      destinatario
    );
  } catch (error) {
    console.error("ERRO DETALHADO DO SENDGRID:", error);
    if (error.response) {
      console.error("Detalhes do corpo do erro:", error.response.body);
    }
    throw new Error("Falha ao se comunicar com a API do SendGrid.");
  }
}

module.exports = { enviarEmailReset };
