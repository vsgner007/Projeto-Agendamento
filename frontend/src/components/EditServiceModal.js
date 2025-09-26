// frontend/src/components/EditServiceModal.js
import React, { useState, useEffect } from "react";
import axios from "axios";

// Este componente recebe 3 "props":
// service: O objeto do serviço que estamos editando.
// onClose: Uma função para fechar o modal.
// onServiceUpdated: Uma função para avisar o Dashboard que um serviço foi atualizado.
const EditServiceModal = ({ service, onClose, onServiceUpdated }) => {
  // Estados para os campos do formulário
  const [nome, setNome] = useState("");
  const [duracao, setDuracao] = useState("");
  const [preco, setPreco] = useState("");
  const [error, setError] = useState("");

  // useEffect para preencher o formulário quando o serviço a ser editado muda.
  useEffect(() => {
    if (service) {
      setNome(service.nome_servico);
      setDuracao(service.duracao_minutos);
      setPreco(service.preco);
    }
  }, [service]); // Roda sempre que a prop 'service' mudar

  //   const handleSubmit = async (e) => {
  //     e.preventDefault();
  //     try {
  //       const token = localStorage.getItem("token");
  //       const response = await axios.put(
  //         `http://localhost:3001/servicos/${service.id}`,
  //         {
  //           nome_servico: nome,
  //           duracao_minutos: parseInt(duracao),
  //           preco: parseFloat(preco),
  //         },

  //         {
  //           headers: { Authorization: `Bearer ${token}` },
  //         }
  //       );

  //       onServiceUpdated(response.data); // Avisa o componente pai sobre a atualização
  //       onClose(); // Fecha o modal
  //     } catch (err) {
  //       setError("Erro ao atualizar o serviço.");
  //       console.error(err);
  //     }
  //   };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const servicoId = service.id;
      const url = `http://localhost:3001/servicos/${servicoId}`;
      const payload = {
        nome_servico: nome,
        duracao_minutos: parseInt(duracao),
        preco: parseFloat(preco),
      };

      const response = await axios.put(url, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      onServiceUpdated(response.data);
      onClose();
    } catch (err) {
      setError("Erro ao atualizar o serviço.");
      console.error("ERRO DETALHADO DO AXIOS:", err); // Adicione este log para mais detalhes
    }
  };

  // Se não houver serviço para editar, não renderiza nada.
  if (!service) {
    return null;
  }

  // Estilos para o modal (efeito de sobreposição)
  const modalStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  };

  const modalContentStyle = {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "8px",
    width: "400px",
  };

  return (
    <div style={modalStyle}>
      <div style={modalContentStyle}>
        <h2>Editar Serviço</h2>
        <form onSubmit={handleSubmit}>
          {/* Campos do formulário são similares ao de criação */}
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
          {error && <p style={{ color: "red" }}>{error}</p>}
          <div style={{ marginTop: "10px" }}>
            <button type="submit">Salvar Alterações</button>
            <button
              type="button"
              onClick={onClose}
              style={{ marginLeft: "10px" }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditServiceModal;
