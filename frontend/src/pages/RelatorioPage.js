// frontend/src/pages/RelatorioPage.js
import React, { useState, useEffect } from "react";
import axios from "axios";

function RelatorioPage() {
  const [relatorioData, setRelatorioData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRelatorio = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          "http://localhost:3001/relatorios/servicos-realizados",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        // Processa e agrupa os dados recebidos por mês
        const groupedData = response.data.reduce((acc, servico) => {
          const data = new Date(servico.data_hora_inicio);
          // Cria uma chave "Mês de Ano" (ex: "Setembro de 2025")
          const monthYear = data.toLocaleString("pt-BR", {
            month: "long",
            year: "numeric",
          });

          if (!acc[monthYear]) {
            acc[monthYear] = {
              servicos: [],
              total: 0,
            };
          }

          acc[monthYear].servicos.push(servico);
          acc[monthYear].total += parseFloat(servico.preco);

          return acc;
        }, {});

        setRelatorioData(groupedData);
      } catch (err) {
        setError("Não foi possível carregar o relatório.");
      } finally {
        setLoading(false);
      }
    };

    fetchRelatorio();
  }, []);

  if (loading) return <p>Gerando relatório...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div>
      <h2>Relatório de Serviços Realizados</h2>

      {Object.keys(relatorioData).length > 0 ? (
        Object.keys(relatorioData).map((mes) => (
          <div key={mes} style={{ marginBottom: "30px" }}>
            <h3>{mes.charAt(0).toUpperCase() + mes.slice(1)}</h3>
            <table
              border="1"
              cellPadding="5"
              style={{ width: "100%", borderCollapse: "collapse" }}
            >
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Cliente</th>
                  <th>Serviço</th>
                  <th>Valor (R$)</th>
                </tr>
              </thead>
              <tbody>
                {relatorioData[mes].servicos.map((servico) => (
                  <tr key={servico.id}>
                    <td>
                      {new Date(servico.data_hora_inicio).toLocaleDateString(
                        "pt-BR"
                      )}
                    </td>
                    <td>{servico.nome_cliente}</td>
                    <td>{servico.nome_servico}</td>
                    <td>{parseFloat(servico.preco).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ textAlign: "right", fontWeight: "bold" }}>
              Total do Mês: R$ {relatorioData[mes].total.toFixed(2)}
            </p>
          </div>
        ))
      ) : (
        <p>Nenhum serviço concluído encontrado para gerar o relatório.</p>
      )}
    </div>
  );
}

export default RelatorioPage;
