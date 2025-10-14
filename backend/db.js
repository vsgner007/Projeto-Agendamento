require("dotenv").config();
const { Pool } = require("pg");

let pool;

// Verifica se estamos no ambiente de produção (Render)
if (process.env.DATABASE_URL) {
  // Se DATABASE_URL existe, usa a conexão de produção com SSL
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, // Necessário para conexões com a Render
    },
  });
  console.log("Conectando ao banco de dados de PRODUÇÃO (Render)...");
} else {
  // Se não, usa as configurações locais do arquivo .env
  pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });
  console.log("Conectando ao banco de dados LOCAL...");
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};
