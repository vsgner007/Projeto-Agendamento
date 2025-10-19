const sgMail = require("@sendgrid/mail");

const apiKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.SENDGRID_FROM_EMAIL;

// Verificação de inicialização
if (apiKey && fromEmail) {
  sgMail.setApiKey(apiKey);
  console.log("SendGrid configurado com sucesso. Remetente:", fromEmail);
} else {
  console.error(
    "ERRO CRÍTICO: As variáveis SENDGRID_API_KEY e SENDGRID_FROM_EMAIL devem ser definidas no arquivo .env!"
  );
}

/**
 * Função genérica para enviar qualquer email.
 * @param {string} to - O email do destinatário.
 * @param {string} subject - O assunto do email.
 * @param {string} html - O conteúdo HTML do email.
 */
async function sendEmail(to, subject, html) {
  if (!apiKey || !fromEmail) {
    console.error(
      "O envio de email está desativado por falta de configuração."
    );
    throw new Error("O serviço de email não está configurado.");
  }

  const msg = {
    to,
    from: fromEmail,
    subject,
    html,
  };

  try {
    await sgMail.send(msg);
    console.log(`Email enviado com sucesso para: ${to}`);
  } catch (error) {
    console.error(`ERRO DETALHADO DO SENDGRID ao enviar para ${to}:`, error);
    if (error.response) {
      console.error(error.response.body);
    }
    throw new Error("Falha ao se comunicar com a API do SendGrid.");
  }
}

// Função específica que USA a função genérica
async function enviarEmailReset(destinatario, link) {
  const subject = "Recuperação de Senha - Seu App de Agendamento";
  const html = `
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
    `;

  // Chama a função genérica com os dados específicos
  await sendEmail(destinatario, subject, html);
}

async function enviarEmailCobranca(destinatario, linkPagamento, nomePlano) {
  const subject = `Sua fatura do plano ${nomePlano} está pronta!`;
  const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Sua Fatura Chegou!</h2>
          <p>Olá,</p>
          <p>Este é um lembrete de que sua assinatura do <strong>Plano ${nomePlano}</strong> está prestes a vencer.</p>
          <p>Para garantir que você não perca o acesso às suas ferramentas, por favor, realize o pagamento clicando no botão abaixo:</p>
          <p style="margin: 20px 0;">
              <a href="${linkPagamento}" target="_blank" style="padding: 12px 25px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-size: 16px;">
                  Pagar Agora com Mercado Pago
              </a>
          </p>
          <p>Se você já realizou o pagamento, por favor, desconsidere este email.</p>
      </div>
  `;

  // Chama a sua função de envio de email genérica (se você a criou) ou a lógica do sgMail
  // Assumindo que você tem uma função genérica 'sendEmail':
  // await sendEmail(destinatario, subject, html);

  // Se não, adaptamos a lógica do sendgrid:
  const sgMail = require("@sendgrid/mail");
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;

  const msg = {
    to: destinatario,
    from: fromEmail,
    subject: subject,
    html: html,
  };
  await sgMail.send(msg);
}

module.exports = { enviarEmailReset, sendEmail }; // Exportamos ambas
