import React, { useState } from "react";
import axios from "axios";

const CreateServiceForm = ({ onServiceCreated }) => {
  const [nome, setNome] = useState("");
  const [duracao, setDuracao] = useState("");
  const [preco, setPreco] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:3001/servicos",
        {
          nome_servico: nome,
          duracao_minutos: parseInt(duracao),
          preco: parseFloat(preco),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setNome("");
      setDuracao("");
      setPreco("");
      setSuccess("Serviço cadastrado com sucesso!");
      onServiceCreated(response.data);
    } catch (err) {
      setError("Erro ao cadastrar serviço. Verifique os dados.");
      console.error(err);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ marginTop: "20px", border: "1px solid #ccc", padding: "15px" }}
    >
      <h3>Cadastrar Novo Serviço</h3>
      <div>
        <label>Nome do Serviço:</label>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Duração (minutos):</label>
        <input
          type="number"
          value={duracao}
          onChange={(e) => setDuracao(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Preço (R$):</label>
        <input
          type="number"
          step="0.01"
          value={preco}
          onChange={(e) => setPreco(e.target.value)}
          required
        />
      </div>
      <button type="submit">Cadastrar Serviço</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>{success}</p>}
    </form>
  );
};

export default CreateServiceForm;
