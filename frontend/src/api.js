// frontend/src/api.js
import axios from "axios";

// Cria uma instância do axios que usa a URL base da nossa variável de ambiente
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

export default api;
