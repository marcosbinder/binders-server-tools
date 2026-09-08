# 📋 Backlog de Funcionalidades Futuras — Binder's Server Tools

> **Aviso Importante**: Os itens listados neste documento representam ideias, solicitações do usuário e especificações arquiteturais planejadas para implementações futuras. **Nenhum destes itens deve ser implementado no momento**, conforme instrução expressa: *"LEMBRANDO QUE NO BACKLOG NÃO É PRA FAZER, É PRA FAZER DEPOIS"*.

---

## 🎯 Sumário Executivo do Planejamento

| ID | Módulo / Recurso | Complexidade | Prioridade | Status |
|---|---|---|---|---|
| **BK-01** | Menções Configuráveis em Tickets | Média | Alta | ⏳ Planejado |
| **BK-02** | Painel de Estatísticas de Comandos (`/developers stats` avançado) | Média | Alta | ⏳ Planejado |
| **BK-03** | Comando `/download` (Downloader de Mídias Sociais) | Alta | Média | ⏳ Planejado |
| **BK-04** | Disparador de JSON Bruto para Components V2 | Média | Alta | ⏳ Planejado |
| **BK-05** | Minigame Jogo da Velha (Tic-Tac-Toe) Interativo | Baixa | Média | ⏳ Planejado |
| **BK-06** | Perfil Customizado com Figurinhas, Badges & Inventário | Alta | Alta | ⏳ Planejado |
| **BK-07** | Visualizador de Grupos do Roblox (`/roblox grupo`) | Baixa | Média | ⏳ Planejado |
| **BK-08** | Sistema Automatizado de Aniversários | Média | Baixa | ⏳ Planejado |
| **BK-09** | Sistema de Sorteios / Giveaways com Botões | Média | Média | ⏳ Planejado |
| **BK-10** | Gerenciador Massivo de Cargos (`/cargo massivo`) | Média | Alta | ⏳ Planejado |
| **BK-11** | Sistema de AFK com Resposta Automática | Baixa | Média | ⏳ Planejado |
| **BK-12** | Visualizador Dedicado de Banner do Servidor (`/server banner`) | Baixa | Baixa | ⏳ Planejado |
| **BK-13** | Sistema de Reputação entre Usuários (`/rep`) | Média | Média | ⏳ Planejado |
| **BK-14** | Informações Detalhadas de Cargos (`/role info`) | Baixa | Média | ⏳ Planejado |
| **BK-15** | Visão de Perfil Exclusivo do Servidor (`/user info server`) | Média | Alta | ⏳ Planejado |
| **BK-16** | Central de Emojis e Expressões do Servidor (`/server emojis`) | Baixa | Média | ⏳ Planejado |

---

## 📌 Detalhamento dos Recursos

### 1. BK-01: Menções Configuráveis em Tickets
- **Descrição**: Permitir que servidores configurem quais cargos da equipe de moderação e/ou usuários específicos serão automaticamente mencionados ao abrir um novo ticket.
- **Arquitetura**:
  - Salvar lista de IDs de roles/users na tabela `ticket_configs` (`mention_roles`, `mention_users`).
  - Suporte a toggles: ping silencioso (sem quebrar privacidade) ou ping sonoro com mensagem de boas-vindas.
  - Interface com StringSelectMenuBuilder e RoleSelectMenuBuilder.

### 2. BK-02: Dashboard de Estatísticas de Comandos
- **Descrição**: Rastrear frequência de uso de cada slash command, subcomando e botão interativo ao longo do tempo.
- **Arquitetura**:
  - Tabela `command_analytics` (data, comando, contagem, tempo médio de execução, taxa de erros).
  - Subcomando `/developers analytics` com filtros por período (últimas 24h, 7 dias, 30 dias).
  - Exibição de gráficos ASCII ou barras de progresso (`B1` até `B11`).

### 3. BK-03: Comando `/download` (Downloader de Mídias)
- **Descrição**: Permitir que membros façam download direto de vídeos e áudios de redes sociais (YouTube, TikTok, Instagram, Twitter/X, Reddit).
- **Arquitetura**:
  - Integração com API de downstream resiliente ou subprocesso de extração com timeout rigoroso.
  - Validação de limite de upload do Discord (25MB para bots sem boost / streaming direto).
  - Sanitização rigorosa de links para evitar SSRF e download de executáveis maliciosos.

### 4. BK-04: Disparador de JSON Bruto para Components V2
- **Descrição**: Permitir que administradores e desenvolvedores enviem contêineres e componentes V2 passando um payload JSON completo diretamente via modal ou upload de arquivo `.json`.
- **Arquitetura**:
  - Comando `/v2json enviar [canal] [arquivo_ou_texto]`.
  - Validador de schema com JSON Schema para Discord Components V2 (Tipos 1, 9, 10, 11, 12, 14, 17).
  - Sanitização de campos legados para prevenir erro 50035.

### 5. BK-05: Minigame Jogo da Velha (Tic-Tac-Toe)
- **Descrição**: Minigame interativo baseado em 3 ActionRows de 3 botões cada (grade 3x3) para dois jogadores disputarem.
- **Arquitetura**:
  - Gerenciamento de turnos baseado no ID do desafiante e do oponente.
  - Renderização dos símbolos (X: ❌ ou emoji de customização, O: ⭕).
  - Algoritmo de verificação de vitória (linhas, colunas, diagonais) e empate (velha).

### 6. BK-06: Perfil Customizado com Figurinhas, Badges & Inventário
- **Descrição**: Evolução do `/user info` para um sistema rico de perfil gamificado.
- **Arquitetura**:
  - Colecionáveis e figurinhas que os membros podem equipar no card de perfil.
  - Personalização de plano de fundo do embed/card.
  - Tabela `user_collectibles` e `user_profile_customization`.
  - Loja interna com moedas ganhas por atividade e comandos de utilidade.

### 7. BK-07: Visualizador de Grupos do Roblox (`/roblox grupo`)
- **Descrição**: Subcomando `/roblox grupo` para consultar informações detalhadas de um grupo do Roblox (nome, membros, dono, descrição, emblema, rank do usuário no grupo).
- **Arquitetura**:
  - Endpoint `GET https://groups.roblox.com/v1/groups/{groupId}`.
  - Endpoint de ícone: `https://thumbnails.roblox.com/v1/groups/icons?groupIds={groupId}&size=420x420&format=Png`.
  - Botão com link direto para o grupo.

### 8. BK-08: Sistema Automatizado de Aniversários
- **Descrição**: Permitir que membros registrem sua data de nascimento (`/aniversario definir DD/MM`) e recebam parabéns automáticos em canal designado no servidor.
- **Arquitetura**:
  - Cron diário que busca aniversariantes do dia (`SELECT * FROM birthdays WHERE day = ? AND month = ?`).
  - Atribuição temporária do cargo de "Aniversariante do Dia" durante 24 horas.

### 9. BK-09: Sistema de Sorteios / Giveaways
- **Descrição**: Criação de sorteios rápidos com botões de participação, timer em tempo real e sorteio aleatório criptograficamente seguro.
- **Arquitetura**:
  - Comando `/sorteio criar [premio] [tempo] [ganhadores] [canal]`.
  - Armazenamento dos participantes na tabela `giveaway_participants`.
  - Seleção por Fisher-Yates shuffle com `crypto.randomInt`.

### 10. BK-10: Gerenciador Massivo de Cargos (`/cargo massivo`)
- **Descrição**: Adicionar ou remover um cargo de todos os membros humanos do servidor ou de quem possui outro cargo específico.
- **Arquitetura**:
  - Subcomandos `/cargo massivo adicionar [cargo] [filtro]` e `/cargo massivo remover [cargo] [filtro]`.
  - Fila com rate-limit e progresso dinâmico para não atingir a API do Discord com bans temporários (Cloudflare 429).
  - Trava de segurança: restrito a Administradores e nunca permite alterar cargos superiores ao do executor ou do bot.

### 11. BK-11: Sistema de AFK com Resposta Automática
- **Descrição**: Comando `/afk [motivo]`. Quando o usuário for mencionado no chat, o bot responde avisando que ele está ausente e há quanto tempo.
- **Arquitetura**:
  - Tabela `user_afk (user_id, guild_id, reason, start_timestamp)`.
  - Ouvinte de mensagens `messageCreate`: remove status de AFK quando o próprio usuário envia mensagem e avisa quando outro membro o menciona.

### 12. BK-12: Visualizador Dedicado de Banner do Servidor (`/server banner`)
- **Descrição**: Acesso direto e download das dimensões em alta resolução do banner de servidor e splash de convite.
- **Arquitetura**:
  - Subcomando dedicado ou botões aprimorados em `/server avatar`.
  - Suporte a GIF para servidores com boost nível 2/3.

### 13. BK-13: Sistema de Reputação entre Usuários (`/rep`)
- **Descrição**: Permitir que usuários elogiem uns aos outros concedendo 1 ponto de reputação diário (`/rep dar [usuario] [comentario]`).
- **Arquitetura**:
  - Cooldown de 24 horas por usuário no banco de dados.
  - Placar de líderes dos mais recomendados da comunidade (`/rep top`).

### 14. BK-14: Informações Detalhadas de Cargos (`/role info`)
- **Descrição**: Exibir ID, cor hexadecimal, lista de permissões ativas, contagem de membros que possuem o cargo e se é mencionável ou içado (hoisted).
- **Arquitetura**:
  - Subcomando `/server cargo [cargo]` ou comando `/role info [cargo]`.
  - Formatação com blocos de cor e resumo de permissões administrativas.

### 15. BK-15: Visão de Perfil Exclusivo do Servidor (`/user info server`)
- **Descrição**: Permitir alternar ou visualizar dados específicos do membro dentro do servidor atual (avatar do servidor, apelido local, data de entrada com timestamp dinâmico, tempo como booster, lista completa de cargos com cores e permissões chave no servidor).
- **Arquitetura**:
  - Opção no `/user info` ou botão interativo `Ver no Servidor` no payload de perfil.
  - Formatação adaptativa caso o bot esteja no servidor ou em contexto de User App.

### 16. BK-16: Central de Emojis e Expressões do Servidor (`/server emojis`)
- **Descrição**: Painel e botão no `/server info` para visualizar e baixar todas as expressões, figurinhas e emojis personalizados do servidor em alta resolução (PNG/GIF/WEBP).
- **Arquitetura**:
  - Botão no rodapé de `/server info` abrindo menu ou modal com listagem paginada dos emojis e links diretos para download.

---

## 🎨 Emojis Customizados Necessários & Faltantes (Catálogo para Criação)

> **Nota para o Desenvolvedor/Designer**: Lista detalhada dos emojis customizados que faltam no bot ou que substituiriam emojis provisórios para elevar o design visual a um padrão profissional moderno:

### 1. Minigames & Diversão
- `moeda` — Moeda dourada ou prateada em rotação/brilhante para a abertura do `/coinflip` (atualmente usando `orbita`).
- `cara` — Lado "Cara" da moeda detalhado para o resultado do `/coinflip` (atualmente usando `pessoa`).
- `coroa_moeda` — Lado "Coroa" de moeda para o resultado do `/coinflip` (atualmente usando coroa genérica).
- `jogodavelha` — Ícone de grade 3x3 do Jogo da Velha para o minigame BK-05.

### 2. Jogos & Comunidades (Minecraft & Roblox)
- `minecraft_bedrock` — Ícone do bloco ou logo da Bedrock Edition para diferenciar no `/minecraft jogador`.
- `namemc` — Ícone oficial com a letra "N" do NameMC para o botão de histórico de skins/nomes.
- `roblox_game` — Ícone de experiência/jogo Roblox (botão "Jogar no Roblox" e campo de experiência).
- `roblox_group` — Ícone de escudo/grupo para o futuro subcomando `/roblox grupo`.

### 3. Sistemas de Utilidade & Servidor
- `download` — Seta moderna apontando para baixo com bandeja para o futuro comando `/download` de mídias sociais.
- `expressoes` / `figurinhas` — Ícone de sticker/adesivo para o painel de `/server emojis` (BK-16).
- `afk_sono` — Ícone de "Zzz" ou lua com sono para o sistema `/afk` (BK-11).
- `bolo_aniversario` — Bolo com vela ou presente temático para o sistema de aniversários (BK-08).
- `sorteio_tada` — Trompete de festa ou caixa de presente festiva para o sistema de giveaways (BK-09).
- `reputacao` — Medalha de recomendação ou coração dourado com joinha para o sistema de `/rep` (BK-13).

### 4. Emojis Marcados com 'ARRUMAR' no Dicionário (`src/config/emojis.js`)
- `selo` (`<:selo:1397389746405114000>`) — Verificar renderização e ID.
- `safetybadge` (`<:safetybadge:1397390621441921106>`) — Atualizar para o selo de segurança com fundo transparente.
- `telegram` (`<:telegram:1546598951573262478>`) — Atualizar para ícone padrão circular azul.
- `play` (`<:play:1546598821713281194>`) — Atualizar para botão de reprodução musical limpo.
- `presenteaberto` (`<:presenteaberto:1546598639764242442>`) — Atualizar caixa de presente aberta com brilho.
- `coracaopixel` (`<:coracaopixel:1397391540535431198>`) — Atualizar coração pixelado rosa/roxo para agradecimentos.

