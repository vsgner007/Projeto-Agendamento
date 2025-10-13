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
} from "@mantine/core";
import {
  IconUser,
  IconPlus,
  IconCalendar,
  IconCheck,
} from "@tabler/icons-react";
import HorarioModal from "./HorarioModal";
import { jwtDecode } from "jwt-decode";

// Componente interno para as caixas de seleção
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
  // Estados para os dados
  const [filial, setFilial] = useState(null);
  const [profissionais, setProfissionais] = useState([]);
  const [servicos, setServicos] = useState([]);

  // Estados para as seleções do usuário
  const [selectedProfissional, setSelectedProfissional] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Estados de UI e formulário final
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState({
    filial: true,
    profissionais: false,
    servicos: false,
    booking: false,
  });
  const [error, setError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefoneCliente, setTelefoneCliente] = useState("");
  const [emailCliente, setEmailCliente] = useState("");

  // --- LÓGICA DE SUBDOMÍNIO (RESTAURADA) ---
  useEffect(() => {
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
  }, []);

  // Busca profissionais automaticamente quando a filial é carregada
  useEffect(() => {
    if (filial) {
      setLoading((prev) => ({ ...prev, profissionais: true }));
      axios
        .get(`http://localhost:3001/publico/profissionais/${filial.id}`)
        .then((response) => setProfissionais(response.data))
        .catch(() => setError("Não foi possível carregar os profissionais."))
        .finally(() =>
          setLoading((prev) => ({ ...prev, profissionais: false }))
        );
    }
  }, [filial]);

  // Busca serviços quando um profissional é selecionado
  useEffect(() => {
    if (selectedProfissional) {
      setLoading((prev) => ({ ...prev, servicos: true }));
      axios
        .get(
          `http://localhost:3001/publico/servicos/${selectedProfissional.id}`
        )
        .then((response) => {
          setServicos(response.data);
        })
        .catch(() => setError("Não foi possível carregar os serviços."))
        .finally(() => setLoading((prev) => ({ ...prev, servicos: false })));
    }
  }, [selectedProfissional]);

  // Pré-preenche dados se o cliente estiver logado
  useEffect(() => {
    const token = localStorage.getItem("clienteToken");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setNomeCliente(decoded.nome || "");
        setEmailCliente(decoded.email || "");
        setTelefoneCliente(decoded.telefone || "");
      } catch (e) {
        console.error("Token de cliente inválido", e);
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
      await axios.post(
        `http://localhost:3001/publico/agendamentos-carrinho/${selectedProfissional.id}`,
        {
          servicos_ids: selectedServices.map((s) => s.id),
          nome_cliente: nomeCliente,
          telefone_cliente: telefoneCliente,
          email_cliente: emailCliente,
          data_hora_inicio: selectedSlot.toISOString(),
        }
      );
      setBookingSuccess(true);
      if (onBookingSuccess) onBookingSuccess();
    } catch (err) {
      setError("Ocorreu um erro ao confirmar seu agendamento.");
    } finally {
      setLoading((prev) => ({ ...prev, booking: false }));
    }
  };

  // --- CORREÇÃO DO CLIQUE NO MODAL (RESTAURADA) ---
  const handleSlotSelected = useCallback((slot) => {
    setSelectedSlot(slot);
    setIsModalOpen(false);
  }, []);

  const duracaoTotal = selectedServices.reduce(
    (acc, s) => acc + s.duracao_minutos,
    0
  );
  const precoTotal = selectedServices.reduce(
    (acc, s) => acc + parseFloat(s.preco),
    0
  );

  // Renderização inicial enquanto a filial carrega
  if (loading.filial) {
    return (
      <Center style={{ height: "100vh" }}>
        <Loader />
      </Center>
    );
  }

  // Renderização de erro se a filial não for encontrada
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

  // Tela de Sucesso
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
              onBookingSuccess ? onBookingSuccess() : window.location.reload();
            }}
          >
            {onBookingSuccess
              ? "Ver Meus Agendamentos"
              : "Fazer um Novo Agendamento"}
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container size="md" my="xl">
      <Title order={1} ta="center">
        {filial ? filial.nome_filial : "Carregando..."}
      </Title>
      <Text c="dimmed" ta="center" mt={5}>
        Bem-vindo! Siga os passos para agendar seu horário.
      </Text>

      {/* A caixa de seleção de filial foi REMOVIDA, como esperado */}

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
          <form onSubmit={handleBookingSubmit}>
            <Stack mt="md">
              <TextInput
                label="Seu Nome Completo"
                placeholder="Nome Sobrenome"
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.currentTarget.value)}
                required
              />
              <TextInput
                label="Seu Email"
                placeholder="email@exemplo.com"
                value={emailCliente}
                onChange={(e) => setEmailCliente(e.currentTarget.value)}
                required
                type="email"
              />
              <TextInput
                label="Seu Telefone (WhatsApp)"
                placeholder="(XX) XXXXX-XXXX"
                value={telefoneCliente}
                onChange={(e) => setTelefoneCliente(e.currentTarget.value)}
                required
              />
              <Button fullWidth mt="md" type="submit" loading={loading.booking}>
                Confirmar Agendamento
              </Button>
            </Stack>
          </form>
        </Paper>
      )}

      <HorarioModal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectSlot={handleSlotSelected}
        profissionalId={selectedProfissional?.id}
        service={{ duracao_minutos: duracaoTotal }}
      />
    </Container>
  );
};

export default BookingFlow;
