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
  TextInput,
} from "@mantine/core";
import {
  IconBuildingStore,
  IconUser,
  IconPlus,
  IconCalendar,
  IconCheck,
} from "@tabler/icons-react";
import HorarioModal from "../components/HorarioModal";

function BookingPage() {
  // Estados para as listas de dados
  const [filiais, setFiliais] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [servicos, setServicos] = useState([]);

  // Estados para as seleções do usuário
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

  // --- FUNÇÕES DE CONTROLE DE SELEÇÃO (COM RESET) ---
  const handleSelectFilial = (filial) => {
    setSelectedFilial(filial);
    // Reseta todas as seleções seguintes
    setProfissionais([]);
    setServicos([]);
    setSelectedProfissional(null);
    setSelectedService(null);
    setSelectedSlot(null);
  };

  const handleSelectProfissional = (profissional) => {
    setSelectedProfissional(profissional);
    // Reseta as seleções seguintes
    setServicos([]);
    setSelectedService(null);
    setSelectedSlot(null);
  };

  const handleSelectService = (servico) => {
    setSelectedService(servico);
    setSelectedSlot(null);
  };

  // --- EFEITOS PARA BUSCAR DADOS EM CASCATA ---

  // Busca inicial de filiais
  useEffect(() => {
    setLoading((prev) => ({ ...prev, filiais: true }));
    axios
      .get("http://localhost:3001/publico/filiais")
      .then((response) => setFiliais(response.data))
      .catch(() => setError("Não foi possível carregar as filiais."))
      .finally(() => setLoading((prev) => ({ ...prev, filiais: false })));
  }, []);

  // Busca profissionais quando uma filial é selecionada
  useEffect(() => {
    if (selectedFilial) {
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
          if (response.data.length === 0) {
            console.warn(
              `Nenhum serviço retornado para o profissional ID: ${selectedProfissional.id}`
            );
          }
        })
        .catch(() => setError("Não foi possível carregar os serviços."))
        .finally(() => setLoading((prev) => ({ ...prev, servicos: false })));
    }
  }, [selectedProfissional]);

  // Submissão final do agendamento
  const handleBookingSubmit = async (e) => {
    /* ... (sem alterações) ... */
  };

  // Função chamada pelo modal
  const handleSlotSelected = (slot) => {
    setSelectedSlot(slot);
    setIsModalOpen(false);
  };

  if (bookingSuccess) {
    /* ... (tela de sucesso, sem alterações) ... */
  }

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
                onClick={() => handleSelectFilial(f)}
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
        title={
          selectedService
            ? `Serviço: ${selectedService.nome_servico}`
            : "Selecione os serviços"
        }
        isEnabled={!!selectedProfissional}
      >
        {loading.servicos ? (
          <Loader />
        ) : servicos.length > 0 ? (
          <Group>
            {servicos.map((s) => (
              <Button
                key={s.id}
                variant={selectedService?.id === s.id ? "filled" : "outline"}
                onClick={() => handleSelectService(s)}
              >
                {s.nome_servico}
              </Button>
            ))}
          </Group>
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

      <HorarioModal
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
