require("dotenv").config();
const { Pool } = require("pg");

let pool;

// A variável NODE_ENV é definida automaticamente por plataformas como a Render como 'production'
if (process.env.NODE_ENV === "production" && process.env.DATABASE_URL) {
  // Se estiver em produção (Render), usa a DATABASE_URL com SSL obrigatório.
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false, // Configuração necessária para conexões com a Render
    },
  });
  console.log("Banco de dados: Modo de PRODUÇÃO ativado (Render).");
} else {
  // Caso contrário, usa as configurações locais do arquivo .env para desenvolvimento.
  pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  });
  console.log("Banco de dados: Modo de DESENVOLVIMENTO ativado (Local).");
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
};
