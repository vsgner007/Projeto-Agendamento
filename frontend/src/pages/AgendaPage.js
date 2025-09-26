// frontend/src/pages/AgendaPage.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import AddAppointmentForm from "../components/AddAppointmentForm";

function AgendaPage() {
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Função para buscar os agendamentos, agora separada para poder ser reutilizada
  const fetchAgendamentos = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:3001/agendamentos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Ordena por data para garantir a ordem correta
      const sortedData = response.data.sort(
        (a, b) => new Date(a.data_hora_inicio) - new Date(b.data_hora_inicio)
      );
      setAgendamentos(sortedData);
    } catch (err) {
      setError("Não foi possível carregar os agendamentos.");
      console.error("Erro ao buscar agendamentos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgendamentos();
  }, []);

  const handleAppointmentCreated = (novoAgendamento) => {
    // Adiciona o novo agendamento e reordena a lista
    const novaLista = [...agendamentos, novoAgendamento];
    novaLista.sort(
      (a, b) => new Date(a.data_hora_inicio) - new Date(b.data_hora_inicio)
    );
    setAgendamentos(novaLista);
  };

  // --- NOVAS FUNÇÕES ---
  const handleCancelAppointment = async (agendamentoId) => {
    if (
      !window.confirm(
        "Tem certeza que deseja cancelar (excluir) este agendamento?"
      )
    )
      return;
    try {
      setError("");
      const token = localStorage.getItem("token");
      await axios.delete(
        `http://localhost:3001/agendamentos/${agendamentoId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      // Remove da lista no frontend
      setAgendamentos(agendamentos.filter((ag) => ag.id !== agendamentoId));
    } catch (err) {
      setError("Erro ao cancelar o agendamento.");
    }
  };

  const handleUpdateStatus = async (agendamentoId, novoStatus) => {
    try {
      setError("");
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:3001/agendamentos/${agendamentoId}`,
        { status: novoStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Atualiza a lista no frontend para refletir a mudança de status
      fetchAgendamentos(); // A forma mais fácil é recarregar a lista
    } catch (err) {
      setError("Erro ao atualizar o status.");
    }
  };

  if (loading) return <p>Carregando agenda...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div>
      <h2>Minha Agenda</h2>
      <AddAppointmentForm onAppointmentCreated={handleAppointmentCreated} />

      <h3 style={{ marginTop: "30px" }}>Próximos Compromissos</h3>
      {agendamentos.length > 0 ? (
        <ul>
          {agendamentos.map((ag) => (
            <li
              key={ag.id}
              style={{
                backgroundColor:
                  ag.status === "concluido" ? "#e0ffe0" : "transparent",
              }}
            >
              <strong>
                {new Date(ag.data_hora_inicio).toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </strong>{" "}
              -{ag.nome_cliente} -<em>{ag.nome_servico}</em> -
              <span> Status: {ag.status}</span>
              {/* --- NOVOS BOTÕES --- */}
              {ag.status === "agendado" && (
                <button
                  onClick={() => handleUpdateStatus(ag.id, "concluido")}
                  style={{ marginLeft: "10px" }}
                >
                  Marcar como Concluído
                </button>
              )}
              <button
                onClick={() => handleCancelAppointment(ag.id)}
                style={{ marginLeft: "10px" }}
              >
                Cancelar Agendamento
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>Você não tem nenhum agendamento futuro.</p>
      )}
    </div>
  );
}

export default AgendaPage;
