import React, { useState, useEffect, useCallback } from "react";
import api from "../api";
import {
  Container,
  Title,
  Paper,
  Text,
  Loader,
  Center,
  Alert,
  Button,
  Group,
  TextInput,
  Checkbox,
  Stack,
  PasswordInput,
  Anchor,
  SegmentedControl,
  Card,
  Badge,
  SimpleGrid,
} from "@mantine/core";
import {
  IconUser,
  IconPlus,
  IconCalendar,
  IconCheck,
} from "@tabler/icons-react";
import HorarioModal from "./HorarioModal";
import ClienteLoginModal from "./ClienteLoginModal";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";

const SelectionBox = ({
  icon,
  title,
  children,
  isEnabled = true,
  onClick = () => {},
}) => (
  <Paper
    withBorder
    p="md"
    mt="md"
    radius="md"
    style={{
      opacity: isEnabled ? 1 : 0.5,
      cursor: isEnabled ? "pointer" : "default",
    }}
    onClick={isEnabled ? onClick : null}
  >
    <Group>
      {icon}
      <Text fw={500}>{title}</Text>
    </Group>
    {isEnabled && children && (
      <div style={{ marginTop: "10px" }}>{children}</div>
    )}
  </Paper>
);

const BookingFlow = ({ onBookingSuccess }) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [view, setView] = useState("novoAgendamento"); // Estado para alternar a visão

  // Estados da Filial e Agendamento
  const [filial, setFilial] = useState(null);
  const [profissionais, setProfissionais] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [selectedProfissional, setSelectedProfissional] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Estados de "Meus Agendamentos"
  const [agendamentos, setAgendamentos] = useState([]);
  const [loadingAgendamentos, setLoadingAgendamentos] = useState(true);

  // Estados de UI
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState({
    filial: true,
    profissionais: false,
    servicos: false,
    booking: false,
  });
  const [error, setError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Estados do Formulário
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefoneCliente, setTelefoneCliente] = useState("");
  const [emailCliente, setEmailCliente] = useState("");
  const [senhaCliente, setSenhaCliente] = useState("");

  // 1. Verifica autenticação
  useEffect(() => {
    const token = localStorage.getItem("clienteToken");
    const hostnameParts = window.location.hostname.split(".");
    const subdomain =
      hostnameParts[0] === "localhost" ? "principal" : hostnameParts[0];

    if (token) {
      try {
        jwtDecode(token);
        setIsAuthenticated(true);
      } catch (e) {
        localStorage.removeItem("clienteToken");
        navigate(`/cliente/login?redirectTo=${subdomain}`);
      }
    } else {
      navigate(`/cliente/login?redirectTo=${subdomain}`);
    }
  }, [navigate]);

  // 2. Busca dados da filial (se autenticado)
  useEffect(() => {
    if (!isAuthenticated) return;

    const hostnameParts = window.location.hostname.split(".");
    const subdomain =
      hostnameParts[0] === "localhost" ? "principal" : hostnameParts[0];

    setLoading((prev) => ({ ...prev, filial: true }));
    api
      .get(`/publico/filial/${subdomain}`)
      .then((response) => {
        setFilial(response.data);
      })
      .catch(() => {
        setError(
          `O salão "${subdomain}" não foi encontrado ou está indisponível.`
        );
      })
      .finally(() => {
        setLoading((prev) => ({ ...prev, filial: false }));
      });
  }, [isAuthenticated]);

  // 3. Busca agendamentos do cliente (se a visão mudar)
  const fetchAgendamentos = async () => {
    setLoadingAgendamentos(true);
    try {
      const token = localStorage.getItem("clienteToken");
      const response = await api.get("/clientes/meus-agendamentos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAgendamentos(response.data);
    } catch (err) {
      setError("Não foi possível carregar seus agendamentos.");
    } finally {
      setLoadingAgendamentos(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && view === "meusAgendamentos") {
      fetchAgendamentos();
    }
  }, [isAuthenticated, view]);

  // --- LÓGICA RESTAURADA ---
  // 4. Busca profissionais quando a filial é carregada
  useEffect(() => {
    if (filial) {
      setLoading((prev) => ({ ...prev, profissionais: true }));
      api
        .get(`/publico/profissionais/${filial.id}`)
        .then((response) => setProfissionais(response.data))
        .catch(() => setError("Não foi possível carregar os profissionais."))
        .finally(() =>
          setLoading((prev) => ({ ...prev, profissionais: false }))
        );
    }
  }, [filial]);

  // --- LÓGICA RESTAURADA ---
  // 5. Busca serviços quando um profissional é selecionado
  useEffect(() => {
    if (selectedProfissional) {
      setLoading((prev) => ({ ...prev, servicos: true }));
      api
        .get(`/publico/servicos/${selectedProfissional.id}`)
        .then((response) => {
          setServicos(response.data);
        })
        .catch(() => setError("Não foi possível carregar os serviços."))
        .finally(() => setLoading((prev) => ({ ...prev, servicos: false })));
    }
  }, [selectedProfissional]);

  // 6. Pré-preenche dados do cliente logado
  useEffect(() => {
    const token = localStorage.getItem("clienteToken");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setNomeCliente(decoded.nome || "");
        setEmailCliente(decoded.email || "");
        setTelefoneCliente(decoded.telefone || "");
        setIsLoggedIn(true);
      } catch (e) {
        localStorage.removeItem("clienteToken");
      }
    }
  }, []);

  const handleSelectProfissional = (profissional) => {
    setSelectedProfissional(profissional);
    setServicos([]);
    setSelectedServices([]);
    setSelectedSlot(null);
  };

  const handleServiceToggle = (servico) => {
    setSelectedServices((currentServices) =>
      currentServices.some((s) => s.id === servico.id)
        ? currentServices.filter((s) => s.id !== servico.id)
        : [...currentServices, servico]
    );
    setSelectedSlot(null);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setLoading((prev) => ({ ...prev, booking: true }));
    setError("");
    try {
      await api.post(
        `/publico/agendamentos-carrinho/${selectedProfissional.id}`,
        {
          servicos_ids: selectedServices.map((s) => s.id),
          nome_cliente: nomeCliente,
          telefone_cliente: telefoneCliente,
          email_cliente: emailCliente,
          senha_cliente: senhaCliente,
          data_hora_inicio: selectedSlot.toISOString(),
        }
      );
      setBookingSuccess(true);
      if (onBookingSuccess) onBookingSuccess();
      setView("meusAgendamentos"); // Muda para a aba de agendamentos após o sucesso
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Ocorreu um erro ao confirmar seu agendamento."
      );
    } finally {
      setLoading((prev) => ({ ...prev, booking: false }));
    }
  };

  const handleLoginSuccess = (user) => {
    setNomeCliente(user.nome || "");
    setEmailCliente(user.email || "");
    setTelefoneCliente(user.telefone || "");
    setIsLoggedIn(true);
    setIsLoginModalOpen(false);
  };

  const handleSlotSelected = useCallback((slot) => {
    setSelectedSlot(slot);
    setIsModalOpen(false);
  }, []);

  const duracaoTotal = selectedServices.reduce(
    (acc, s) => acc + (s.duracao_minutos || 0),
    0
  );
  const precoTotal = selectedServices.reduce(
    (acc, s) => acc + parseFloat(s.preco || 0),
    0
  );

  const handleLogout = () => {
    localStorage.removeItem("clienteToken");
    navigate(0);
  };

  const handleCancelAgendamento = async (agendamentoId) => {
    if (
      !window.confirm("Você tem certeza que deseja cancelar este agendamento?")
    )
      return;
    try {
      const token = localStorage.getItem("clienteToken");
      await api.delete(`/clientes/agendamentos/${agendamentoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchAgendamentos();
    } catch (err) {
      setError("Não foi possível cancelar o agendamento.");
    }
  };

  const hoje = new Date();
  const proximosAgendamentos = agendamentos.filter(
    (ag) => new Date(ag.data_hora_inicio) >= hoje
  );
  const historicoAgendamentos = agendamentos.filter(
    (ag) => new Date(ag.data_hora_inicio) < hoje
  );

  // Renderização principal
  if (!isAuthenticated || loading.filial) {
    return (
      <Center style={{ height: "100vh" }}>
        <Loader />
      </Center>
    );
  }

  if (error) {
    return (
      <Container my="xl">
        <Center>
          <Alert color="red" title="Erro">
            {error}
          </Alert>
        </Center>
      </Container>
    );
  }

  if (bookingSuccess) {
    return (
      <Container my="xl">
        <Paper withBorder shadow="md" p="xl" radius="md">
          <Center>
            <IconCheck size={48} color="green" />
          </Center>
          <Title order={2} ta="center" mt="md">
            Agendamento Confirmado!
          </Title>
          <Text ta="center" mt="sm" c="dimmed">
            Olá, {nomeCliente}! Seu horário foi agendado com sucesso.
          </Text>
          <Paper withBorder p="md" mt="lg" radius="sm" bg="gray.0">
            <Text>
              <strong>Serviços:</strong>
            </Text>
            <ul>
              {selectedServices.map((s) => (
                <li key={s.id}>{s.nome_servico}</li>
              ))}
            </ul>
            <Text>
              <strong>Profissional:</strong> {selectedProfissional.nome}
            </Text>
            <Text>
              <strong>Unidade:</strong> {filial.nome_filial}
            </Text>
            <Text>
              <strong>Data:</strong>{" "}
              {selectedSlot.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </Text>
            <Text>
              <strong>Horário:</strong>{" "}
              {selectedSlot.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </Paper>
          <Button
            fullWidth
            mt="xl"
            onClick={() => {
              setBookingSuccess(false);
              setView("meusAgendamentos");
              fetchAgendamentos();
            }}
          >
            Ver Meus Agendamentos
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="md" my="xl">
      <Group justify="space-between" mb="lg">
        <Title order={1} ta="center">
          {filial ? filial.nome_filial : "Carregando..."}
        </Title>
        <Button variant="outline" onClick={handleLogout}>
          Sair
        </Button>
      </Group>

      <SegmentedControl
        value={view}
        onChange={setView}
        data={[
          { label: "Novo Agendamento", value: "novoAgendamento" },
          { label: "Meus Agendamentos", value: "meusAgendamentos" },
        ]}
        fullWidth
        mb="xl"
      />

      {view === "novoAgendamento" && (
        <>
          <SelectionBox
            icon={<IconUser />}
            title={
              selectedProfissional
                ? `Profissional: ${selectedProfissional.nome}`
                : "1. Selecione um profissional"
            }
            isEnabled={!!filial}
          >
            {loading.profissionais ? (
              <Loader />
            ) : (
              <Group>
                {profissionais.map((p) => (
                  <Button
                    key={p.id}
                    variant={
                      selectedProfissional?.id === p.id ? "filled" : "outline"
                    }
                    onClick={() => handleSelectProfissional(p)}
                  >
                    {p.nome}
                  </Button>
                ))}
              </Group>
            )}
          </SelectionBox>

          <SelectionBox
            icon={<IconPlus />}
            title="2. Selecione os serviços"
            isEnabled={!!selectedProfissional}
          >
            {loading.servicos ? (
              <Loader />
            ) : servicos.length > 0 ? (
              <Stack>
                {servicos.map((s) => (
                  <Checkbox
                    key={s.id}
                    label={`${s.nome_servico} (${
                      s.duracao_minutos
                    } min) - R$ ${parseFloat(s.preco).toFixed(2)}`}
                    checked={selectedServices.some((sel) => sel.id === s.id)}
                    onChange={() => handleServiceToggle(s)}
                  />
                ))}
              </Stack>
            ) : (
              <Text size="sm" c="dimmed">
                Este profissional não tem serviços disponíveis.
              </Text>
            )}
          </SelectionBox>

          <SelectionBox
            icon={<IconCalendar />}
            title={
              selectedSlot
                ? `3. Horário: ${selectedSlot.toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}`
                : "3. Selecione um horário"
            }
            isEnabled={selectedServices.length > 0}
            onClick={() => setIsModalOpen(true)}
          >
            {selectedServices.length > 0 && (
              <Text size="sm" c="dimmed">
                {" "}
                Duração total: {duracaoTotal} min | Preço total: R${" "}
                {precoTotal.toFixed(2)}{" "}
              </Text>
            )}
          </SelectionBox>

          {selectedSlot && (
            <Paper withBorder p="md" mt="md" radius="md">
              <Title order={4}>4. Confirme seus dados</Title>
              {!isLoggedIn && (
                <Text size="sm" c="dimmed" mb="md">
                  Já tem uma conta?{" "}
                  <Anchor
                    component="button"
                    type="button"
                    onClick={() => setIsLoginModalOpen(true)}
                  >
                    Faça o login
                  </Anchor>{" "}
                  para preencher seus dados.
                </Text>
              )}
              <form onSubmit={handleBookingSubmit}>
                <Stack mt="md">
                  <TextInput
                    label="Seu Nome Completo"
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.currentTarget.value)}
                    required
                    readOnly={isLoggedIn}
                  />
                  <TextInput
                    label="Seu Email"
                    value={emailCliente}
                    onChange={(e) => setEmailCliente(e.currentTarget.value)}
                    required
                    type="email"
                    readOnly={isLoggedIn}
                  />
                  <TextInput
                    label="Seu Telefone (WhatsApp)"
                    value={telefoneCliente}
                    onChange={(e) => setTelefoneCliente(e.currentTarget.value)}
                    required
                  />
                  {!isLoggedIn && (
                    <PasswordInput
                      label="Crie uma Senha"
                      description="Para acessar seus agendamentos no futuro."
                      value={senhaCliente}
                      onChange={(e) => setSenhaCliente(e.currentTarget.value)}
                      required
                    />
                  )}
                  <Button
                    fullWidth
                    mt="md"
                    type="submit"
                    loading={loading.booking}
                  >
                    Confirmar Agendamento
                  </Button>
                </Stack>
              </form>
            </Paper>
          )}
        </>
      )}

      {view === "meusAgendamentos" && (
        <>
          {loadingAgendamentos ? (
            <Center>
              <Loader />
            </Center>
          ) : (
            <>
              <Title order={3}>Próximos Compromissos</Title>
              {proximosAgendamentos.length > 0 ? (
                <SimpleGrid cols={{ base: 1, sm: 2 }} mt="md">
                  {proximosAgendamentos.map((ag) => (
                    <Card
                      shadow="sm"
                      padding="lg"
                      radius="md"
                      withBorder
                      key={ag.id}
                    >
                      <Text fw={500}>{ag.nome_servico}</Text>
                      <Text size="sm" c="dimmed">
                        com {ag.nome_profissional} ({ag.nome_filial})
                      </Text>
                      <Text mt="sm">
                        Data:{" "}
                        {new Date(ag.data_hora_inicio).toLocaleString("pt-BR", {
                          dateStyle: "full",
                          timeStyle: "short",
                        })}
                      </Text>
                      <Badge
                        color={ag.status === "agendado" ? "blue" : "gray"}
                        mt="md"
                      >
                        {ag.status}
                      </Badge>
                      <Button
                        variant="light"
                        color="red"
                        fullWidth
                        mt="md"
                        radius="md"
                        onClick={() => handleCancelAgendamento(ag.id)}
                      >
                        Cancelar Agendamento
                      </Button>
                    </Card>
                  ))}
                </SimpleGrid>
              ) : (
                <Text>Você não tem nenhum agendamento futuro.</Text>
              )}

              <Title order={3} mt="xl">
                Histórico
              </Title>
              <Stack mt="md">
                {historicoAgendamentos.length > 0 ? (
                  historicoAgendamentos.map((ag) => (
                    <Card
                      shadow="sm"
                      padding="lg"
                      radius="md"
                      withBorder
                      key={ag.id}
                    >
                      <Group justify="space-between">
                        <div>
                          <Text fw={500}>{ag.nome_servico}</Text>
                          <Text size="sm" c="dimmed">
                            com {ag.nome_profissional}
                          </Text>
                          <Text size="sm" c="dimmed">
                            em{" "}
                            {new Date(ag.data_hora_inicio).toLocaleDateString(
                              "pt-BR"
                            )}
                          </Text>
                        </div>
                        <Badge
                          color={ag.status === "concluido" ? "green" : "red"}
                          variant="light"
                        >
                          {ag.status}
                        </Badge>
                      </Group>
                    </Card>
                  ))
                ) : (
                  <Text>Nenhum agendamento no seu histórico.</Text>
                )}
              </Stack>
            </>
          )}
        </>
      )}

      <HorarioModal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectSlot={handleSlotSelected}
        profissionalId={selectedProfissional?.id}
        service={{ duracao_minutos: duracaoTotal }}
      />
      <ClienteLoginModal
        opened={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </Container>
  );
};

export default BookingFlow;
