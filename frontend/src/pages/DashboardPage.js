import React, { useState, useEffect } from "react";
import axios from "axios";
import CreateServiceForm from "../components/CreateServiceForm";
import EditServiceModal from "../components/EditServiceModal";

function DashboardPage() {
  // --- ESTADOS DO COMPONENTE ---
  const [servicos, setServicos] = useState([]); // Guarda a lista de serviços
  const [loading, setLoading] = useState(true); // Controla a mensagem de "Carregando..."
  const [error, setError] = useState(""); // Guarda mensagens de erro
  const [editingService, setEditingService] = useState(null); // Controla o modal de edição

  // --- BUSCA INICIAL DE DADOS ---
  useEffect(() => {
    const fetchServicos = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Nenhum token encontrado. Faça login novamente.");
          setLoading(false);
          return;
        }
        const response = await axios.get("http://localhost:3001/servicos", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setServicos(response.data);
      } catch (err) {
        setError("Não foi possível carregar os serviços.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchServicos();
  }, []); // O array vazio [] garante que isso só roda uma vez

  // --- FUNÇÕES DE MANIPULAÇÃO DE DADOS ---

  // Chamada pelo CreateServiceForm após sucesso
  const handleServiceCreated = (novoServico) => {
    setError(""); // Limpa erros antigos
    setServicos([novoServico, ...servicos]);
  };

  // Chamada pelo botão de deletar
  const handleDeleteService = async (servicoId) => {
    const confirmDelete = window.confirm(
      "Você tem certeza que deseja deletar este serviço?"
    );
    if (!confirmDelete) return;

    try {
      setError("");
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:3001/servicos/${servicoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setServicos(servicos.filter((servico) => servico.id !== servicoId));
    } catch (err) {
      setError("Erro ao deletar o serviço.");
      console.error("Erro ao deletar:", err);
    }
  };

  // Chamada pelo EditServiceModal após sucesso na atualização
  const handleServiceUpdated = (servicoAtualizado) => {
    setError("");
    setServicos(
      servicos.map((s) =>
        s.id === servicoAtualizado.id ? servicoAtualizado : s
      )
    );
  };

  // Funções para controlar o modal de edição
  const handleEditClick = (servico) => setEditingService(servico);
  const handleCloseModal = () => setEditingService(null);

  // --- RENDERIZAÇÃO ---

  if (loading) return <p>Carregando serviços...</p>;

  return (
    <div>
      <h1>Gestão de Serviços</h1>

      {error && (
        <p style={{ color: "red", border: "1px solid red", padding: "10px" }}>
          {error}
        </p>
      )}

      <CreateServiceForm onServiceCreated={handleServiceCreated} />

      <h2 style={{ marginTop: "30px" }}>Seus Serviços Cadastrados</h2>

      {servicos.length > 0 ? (
        <ul>
          {servicos.map((servico) => (
            <li key={servico.id}>
              <strong>{servico.nome_servico}</strong> - Duração:{" "}
              {servico.duracao_minutos} min - Preço: R${" "}
              {parseFloat(servico.preco).toFixed(2)}
              <button
                onClick={() => handleEditClick(servico)}
                style={{ marginLeft: "10px" }}
              >
                Editar
              </button>
              <button
                onClick={() => handleDeleteService(servico.id)}
                style={{ marginLeft: "10px" }}
              >
                Deletar
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>Você ainda não tem nenhum serviço cadastrado.</p>
      )}

      <EditServiceModal
        service={editingService}
        onClose={handleCloseModal}
        onServiceUpdated={handleServiceUpdated}
      />
    </div>
  );
}

export default DashboardPage;
