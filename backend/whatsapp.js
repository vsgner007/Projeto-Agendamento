// backend/whatsapp.js
const twilio = require("twilio");

// Pega as credenciais do nosso arquivo .env
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;

let client;
if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
  console.log("Cliente Twilio configurado com sucesso.");
} else {
  console.error(
    "ERRO CRÍTICO: Credenciais do Twilio (ACCOUNT_SID ou AUTH_TOKEN) não encontradas no .env!"
  );
}

/**
 * Envia uma mensagem de lembrete via WhatsApp.
 * @param {string} telefoneDestino - O número do cliente no formato 'whatsapp:+55XXYYYYYZZZZ'
 * @param {string} mensagem - O corpo da mensagem a ser enviada.
 */
async function enviarLembreteWhatsApp(telefoneDestino, mensagem) {
  if (!client) {
    console.error(
      "O cliente Twilio não está configurado. O envio de WhatsApp está desabilitado."
    );
    return false;
  }

  // O número do Twilio Sandbox precisa do prefixo 'whatsapp:'
  const from = `whatsapp:${twilioWhatsAppNumber}`;

  try {
    await client.messages.create({
      body: mensagem,
      from: from,
      to: telefoneDestino,
    });
    console.log(
      `Mensagem de lembrete enviada com sucesso para ${telefoneDestino}`
    );
    return true;
  } catch (error) {
    console.error(
      `Falha ao enviar mensagem para ${telefoneDestino}. Erro do Twilio:`,
      error.message
    );
    return false;
  }
}

module.exports = { enviarLembreteWhatsApp };
