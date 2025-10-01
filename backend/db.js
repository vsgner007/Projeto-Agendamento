// backend/db.js
require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

module.exports = {
  // Mantém a função query que já usávamos
  query: (text, params) => pool.query(text, params),
  // Adiciona um método para obter um cliente do pool para transações
  getClient: () => pool.connect(),
};
