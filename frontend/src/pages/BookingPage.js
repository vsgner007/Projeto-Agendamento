// frontend/src/pages/BookingPage.js
import React, { useState, useEffect } from "react";
import axios from "axios";
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
  SimpleGrid,
  TextInput,
} from "@mantine/core";
import { Calendar } from "@mantine/dates";
import {
  IconBuildingStore,
  IconUser,
  IconPlus,
  IconCalendar,
  IconCheck,
} from "@tabler/icons-react";
import DateTimePickerModal from "../components/DateTimePickerModal";

function BookingPage() {
  // Estados para as listas e seleções
  const [filiais, setFiliais] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [selectedFilial, setSelectedFilial] = useState(null);
  const [selectedProfissional, setSelectedProfissional] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Estados de UI e formulário final
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState({
    filiais: true,
    profissionais: false,
    servicos: false,
    booking: false,
  });
  const [error, setError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefoneCliente, setTelefoneCliente] = useState("");

  // UseEffects para buscar dados em cascata (sem alterações)
  useEffect(() => {
    axios
      .get("http://localhost:3001/publico/filiais")
      .then((response) => setFiliais(response.data))
      .catch(() => setError("Não foi possível carregar as filiais."))
      .finally(() => setLoading((prev) => ({ ...prev, filiais: false })));
  }, []);
  useEffect(() => {
    if (selectedFilial) {
      setProfissionais([]);
      setSelectedProfissional(null);
      setLoading((prev) => ({ ...prev, profissionais: true }));
      axios
        .get(`http://localhost:3001/publico/profissionais/${selectedFilial.id}`)
        .then((response) => setProfissionais(response.data))
        .catch(() => setError("Não foi possível carregar os profissionais."))
        .finally(() =>
          setLoading((prev) => ({ ...prev, profissionais: false }))
        );
    }
  }, [selectedFilial]);
  useEffect(() => {
    if (selectedProfissional) {
      setServicos([]);
      setSelectedService(null);
      setLoading((prev) => ({ ...prev, servicos: true }));
      axios
        .get(
          `http://localhost:3001/publico/servicos/${selectedProfissional.id}`
        )
        .then((response) => setServicos(response.data))
        .catch(() => setError("Não foi possível carregar os serviços."))
        .finally(() => setLoading((prev) => ({ ...prev, servicos: false })));
    }
  }, [selectedProfissional]);

  // Função para submeter o agendamento final
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setLoading((prev) => ({ ...prev, booking: true }));
    try {
      await axios.post(
        `http://localhost:3001/publico/agendamentos/${selectedProfissional.id}`,
        {
          servico_id: selectedService.id,
          nome_cliente: nomeCliente,
          telefone_cliente: telefoneCliente,
          data_hora_inicio: selectedSlot.toISOString(),
        }
      );
      setBookingSuccess(true);
    } catch (err) {
      setError(
        "Ocorreu um erro ao confirmar seu agendamento. Tente novamente."
      );
    } finally {
      setLoading((prev) => ({ ...prev, booking: false }));
    }
  };

  // Função que o modal vai chamar quando um horário for selecionado
  const handleSlotSelected = (slot) => {
    setSelectedSlot(slot);
    setIsModalOpen(false); // Fecha o modal
  };

  // --- TELA DE CONFIRMAÇÃO ATUALIZADA ---
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
            Olá, {nomeCliente}! Seu horário foi agendado com sucesso. Mal
            podemos esperar para te ver.
          </Text>
          <Paper withBorder p="md" mt="lg" radius="sm" bg="gray.0">
            <Text>
              <strong>Serviço:</strong> {selectedService.nome_servico}
            </Text>
            <Text>
              <strong>Profissional:</strong> {selectedProfissional.nome}
            </Text>
            <Text>
              <strong>Unidade:</strong> {selectedFilial.nome_filial}
            </Text>
            <Text>
              <strong>Data:</strong>{" "}
              {selectedSlot.toLocaleDateString("pt-BR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
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
          <Button fullWidth mt="xl" onClick={() => window.location.reload()}>
            Fazer um Novo Agendamento
          </Button>
        </Paper>
      </Container>
    );
  }

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

  return (
    <Container size="md" my="xl">
      <Title order={2} ta="center">
        Selecione os detalhes do seu agendamento
      </Title>

      <SelectionBox
        icon={<IconBuildingStore />}
        title={
          selectedFilial
            ? `Filial: ${selectedFilial.nome_filial}`
            : "Selecione a filial"
        }
      >
        {loading.filiais ? (
          <Loader />
        ) : (
          <Group>
            {filiais.map((f) => (
              <Button
                key={f.id}
                variant={selectedFilial?.id === f.id ? "filled" : "outline"}
                onClick={() => setSelectedFilial(f)}
              >
                {f.nome_filial}
              </Button>
            ))}
          </Group>
        )}
      </SelectionBox>

      <SelectionBox
        icon={<IconUser />}
        title={
          selectedProfissional
            ? `Profissional: ${selectedProfissional.nome}`
            : "Selecione um profissional"
        }
        isEnabled={!!selectedFilial}
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
                onClick={() => setSelectedProfissional(p)}
              >
                {p.nome}
              </Button>
            ))}
          </Group>
        )}
      </SelectionBox>

      <SelectionBox
        icon={<IconPlus />}
        title={
          selectedService
            ? `Serviço: ${selectedService.nome_servico}`
            : "Selecione os serviços"
        }
        isEnabled={!!selectedProfissional}
      >
        {loading.servicos ? (
          <Loader />
        ) : (
          <Group>
            {servicos.map((s) => (
              <Button
                key={s.id}
                variant={selectedService?.id === s.id ? "filled" : "outline"}
                onClick={() => setSelectedService(s)}
              >
                {s.nome_servico}
              </Button>
            ))}
          </Group>
        )}
      </SelectionBox>

      <SelectionBox
        icon={<IconCalendar />}
        title={
          selectedSlot
            ? `Horário: ${selectedSlot.toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              })}`
            : "Selecione um horário"
        }
        isEnabled={!!selectedService}
        onClick={() => setIsModalOpen(true)}
      />

      {selectedSlot && (
        <Paper withBorder p="md" mt="md" radius="md">
          <Title order={4}>Confirme seus dados</Title>
          <form onSubmit={handleBookingSubmit}>
            <TextInput
              label="Seu Nome Completo"
              placeholder="Nome Sobrenome"
              value={nomeCliente}
              onChange={(e) => setNomeCliente(e.currentTarget.value)}
              required
              mt="md"
            />
            <TextInput
              label="Seu Telefone (WhatsApp)"
              placeholder="(XX) XXXXX-XXXX"
              value={telefoneCliente}
              onChange={(e) => setTelefoneCliente(e.currentTarget.value)}
              required
              mt="md"
            />
            <Button fullWidth mt="xl" type="submit" loading={loading.booking}>
              Confirmar Agendamento
            </Button>
          </form>
        </Paper>
      )}

      {error && (
        <Alert color="red" title="Erro" mt="md">
          {error}
        </Alert>
      )}

      <DateTimePickerModal
        opened={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectSlot={handleSlotSelected}
        profissionalId={selectedProfissional?.id}
        service={selectedService}
      />
    </Container>
  );
}

export default BookingPage;
