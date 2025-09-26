// frontend/src/components/AddAppointmentForm.js
import React, { useState, useEffect } from "react";
import axios from "axios";

const AddAppointmentForm = ({ onAppointmentCreated }) => {
  // Estado para os campos do formulário
  const [servicos, setServicos] = useState([]); // Para popular o dropdown
  const [servicoId, setServicoId] = useState("");
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefoneCliente, setTelefoneCliente] = useState("");
  const [dataHora, setDataHora] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // useEffect para buscar os serviços do profissional e popular o dropdown
  useEffect(() => {
    const fetchServicos = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("http://localhost:3001/servicos", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setServicos(response.data);
      } catch (err) {
        console.error("Erro ao buscar serviços para o formulário", err);
      }
    };
    fetchServicos();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        "http://localhost:3001/agendamentos",
        {
          servico_id: servicoId,
          nome_cliente: nomeCliente,
          telefone_cliente: telefoneCliente,
          data_hora_inicio: dataHora,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Limpa o formulário
      setServicoId("");
      setNomeCliente("");
      setTelefoneCliente("");
      setDataHora("");
      setSuccess("Agendamento criado com sucesso!");

      // Avisa o componente pai (AgendaPage) que um novo agendamento foi criado
      onAppointmentCreated(response.data);
    } catch (err) {
      setError("Erro ao criar agendamento. Verifique os dados.");
      console.error(err);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ margin: "20px 0", border: "1px solid #ccc", padding: "15px" }}
    >
      <h3>Adicionar Novo Agendamento</h3>
      <div>
        <label>Serviço:</label>
        <select
          value={servicoId}
          onChange={(e) => setServicoId(e.target.value)}
          required
        >
          <option value="">Selecione um serviço</option>
          {servicos.map((servico) => (
            <option key={servico.id} value={servico.id}>
              {servico.nome_servico}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label>Nome do Cliente:</label>
        <input
          type="text"
          value={nomeCliente}
          onChange={(e) => setNomeCliente(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Telefone do Cliente:</label>
        <input
          type="text"
          value={telefoneCliente}
          onChange={(e) => setTelefoneCliente(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Data e Hora:</label>
        <input
          type="datetime-local"
          value={dataHora}
          onChange={(e) => setDataHora(e.target.value)}
          required
        />
      </div>
      <button type="submit">Adicionar Agendamento</button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>{success}</p>}
    </form>
  );
};

export default AddAppointmentForm;
