// Starter rulebooks for the tournament wizard. Organizers edit freely.
export const ruleTemplates = [
  {
    id: "squad-padrao",
    label: "Squad padrão",
    content: `## Formato
- Squads de 4 jogadores titulares e até 1 reserva inscrito.
- Partidas em sala personalizada, modo Battle Royale.
- A quantidade de quedas e os mapas seguem o cronograma do campeonato.

## Check-in e salas
1. O ID e a senha da sala são liberados na aba Partidas, no horário definido.
2. Entre na sala em até 10 minutos após a liberação.
3. Squads ausentes no início da queda recebem 0 pontos naquela queda.

## Pontuação
A pontuação por colocação e por abate está descrita na aba Regulamento → Sistema de pontuação.

## Proibições
- Uso de programas ilegais, macros ou emuladores sem autorização.
- Jogadores que não constam na escalação inscrita.
- Combinação de resultados entre squads (teaming).

## Contestações
Envie a contestação pela plataforma dentro do prazo exibido após cada queda, com prints ou vídeo.

## Penalidades
O organizador pode advertir, retirar pontos ou desclassificar squads que descumprirem o regulamento. Todas as decisões ficam registradas.`,
  },
  {
    id: "liga-semanal",
    label: "Liga semanal",
    content: `## Liga semanal
- Etapas semanais com classificação acumulada na temporada.
- Os melhores squads de cada etapa somam pontos no ranking da temporada.

## Escalação
- Até 2 substituições na escalação durante a temporada, comunicadas ao organizador.

## Salas
- Credenciais publicadas 15 minutos antes de cada queda para equipes confirmadas.

## Conduta
Respeito entre jogadores e staff. Ofensas resultam em advertência ou exclusão da liga.`,
  },
  {
    id: "x1-duo",
    label: "Duo / Solo",
    content: `## Formato
- Modalidade duo (2 jogadores) ou solo, conforme configuração do campeonato.
- Sem reservas.

## Regras
1. Entrar na sala com o nick cadastrado no perfil.
2. Proibido trocar de dupla durante o campeonato.
3. Desconexões não dão direito a nova queda.

## Contestações
Somente pela plataforma, dentro do prazo exibido após cada queda.`,
  },
] as const;
