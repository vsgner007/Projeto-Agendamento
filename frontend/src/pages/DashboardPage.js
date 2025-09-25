import React, { useState, useEffect } from "react";
import axios from "axios";
import CreateServiceForm from "../components/CreateServiceForm";

function DashboardPage() {
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
  }, []);

  const handleServiceCreated = (novoServico) => {
    setServicos([novoServico, ...servicos]);
  };

  const handleDeleteService = async (servicoId) => {
    const confirmDelete = window.confirm(
      "Você tem certeza que deseja deletar este serviço?"
    );
    if (!confirmDelete) {
      return;
    }
    try {
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

  if (loading) return <p>Carregando serviços...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div>
      <h1>Bem-vindo ao seu Dashboard!</h1>
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
    </div>
  );
}

export default DashboardPage;
