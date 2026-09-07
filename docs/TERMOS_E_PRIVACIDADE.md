# Binder's Server Tools • Termos de Serviço & Política de Privacidade

Versão: 2.0 (Atualizada em Setembro de 2026)  
Repositório Oficial: [https://github.com/marcaodosbots/binders-server-tools/](https://github.com/marcaodosbots/binders-server-tools/)  
Servidor Oficial de Suporte: [https://dsc.gg/bindersdc](https://dsc.gg/bindersdc)  

---

## 📋 TERMOS DE SERVIÇO (ToS)

### 1. Aceitação dos Termos
1.1. Estes Termos de Serviço ("ToS") regem o uso do aplicativo e bot para Discord **Binder's Server Tools**, projeto de código aberto licenciado sob a licença GNU GPL v3.  
1.2. Ao adicionar o bot ao seu servidor, interagir via comandos de barra (`/`), menus de contexto, botões ou seletores interativos, você declara que leu, compreendeu e concorda integralmente com estes Termos e com a Política de Privacidade associada.  
1.3. Caso você não concorde com qualquer disposição destes Termos, interrompa imediatamente o uso do bot e remova-o de seus servidores.

### 2. Licença e Propriedade Intelectual
2.1. O código-fonte oficial do bot está disponível publicamente no [GitHub](https://github.com/marcaodosbots/binders-server-tools/).  
2.2. O software é licenciado sob a **GNU General Public License v3.0 (GPL-3.0)**: você tem a liberdade de executar, estudar, modificar e distribuir o código, desde que qualquer trabalho derivado seja distribuído sob a mesma licença GPL v3, mantendo os avisos de copyright originais (© 2025–2026 Marcos Binder).

### 3. Funcionalidades, Hospedagem e Disponibilidade
3.1. O bot disponibiliza recursos categorizados em:
- **Discord Components V2 Studio (`/containerbuilder`)**: Criação e estruturação visual de contêineres, blocos de texto, divisores e botões.
- **Suíte de Moderação (`/moderacao`)**: Comandos de kick, ban, timeout (castigo), bloqueio e desbloqueio de canais e limpeza em massa de mensagens (`clear`), respeitando estritamente a hierarquia de cargos do Discord.
- **Lembretes Persistentes (`/reminder`)**: Agendamento de alertas com despacho simultâneo e paralelo no canal do servidor e na DM do usuário.
- **Utilidades & Gaming (`/roblox`, `/minecraft`, `/avatar`, `/enquete`)**: Consultas a perfis públicos, avatares, status de servidores e pesquisas.
- **Música & Metadados (`/musica`)**: Consulta de faixas musicais, capas em alta resolução e prévias sonoras via APIs públicas com múltiplos provedores de fallback.
- **Internacionalização**: Suporte nativo bilíngue (Português do Brasil `pt_BR` e Inglês `en_US`) com detecção automática do idioma do usuário.
3.2. **Hospedagem & Nuvem**: O bot é hospedado em ambiente de nuvem de alta disponibilidade na plataforma **Discloud**, conectado a banco de dados relacional distribuído **Supabase PostgreSQL** (região AWS us-west-2) com isolamento por *Row Level Security* (RLS) e fallback resiliente local em disco.  
3.3. **Disponibilidade**: Empregamos esforços razoáveis para manter alta disponibilidade, mas não garantimos operação ininterrupta (uptime de 100%). Janelas de manutenção preventiva, reinicializações ou instabilidades da API oficial do Discord podem ocorrer eventualmente.

### 4. Conduta Proibida e Diretrizes de Uso
4.1. É terminantemente proibido utilizar o bot para gerar, publicar ou propagar:
- Conteúdo sexualmente explícito, NSFW, pornografia ou violência extrema / gore;
- Discurso de ódio, assédio, discriminação, difamação ou ameaças a qualquer indivíduo ou grupo;
- Práticas de flood, envio massivo de mensagens ou tentativas deliberadas de burlar o sistema de rate limit e sobrecarregar a infraestrutura.  
4.2. O usuário concorda em obedecer integralmente aos [Termos de Serviço do Discord](https://discord.com/terms) e às [Diretrizes da Comunidade do Discord](https://discord.com/guidelines).  
4.3. O descumprimento destas regras poderá resultar no bloqueio imediato do usuário ou do servidor de acessar o bot, a critério exclusivo dos desenvolvedores.

### 5. Coleta e Tratamento de Dados
5.1. Coletamos exclusivamente os dados técnicos essenciais fornecidos pela API do Discord para o funcionamento das ferramentas:
- **Dados do Usuário**: ID do Discord, nome de exibição/tag, versão do ToS aceita, idioma preferencial e distintivos atribuídos;
- **Dados do Servidor**: ID do servidor, prefixo configurado e canais vinculados (boas-vindas, logs ou moderação);
- **Lembretes**: Mensagem informada, canal de envio e timestamp agendado.  
5.2. Os registros são armazenados no Supabase PostgreSQL protegido por criptografia e RLS. Não comercializamos nem compartilhamos dados com terceiros para fins publicitários.  
5.3. **Logs Operacionais**: Erros de execução e métricas de desempenho são transmitidos para canais privados de monitoramento da equipe técnica através de webhooks seguros, sem exposição de canais internos ou dados sensíveis.

### 6. Sistema de Rate Limiting & Proteção
6.1. O bot implementa um sistema de proteção contra spam com janela deslizante e limitação em memória com desalocação automática (LRU), garantindo que comandos e componentes interativos não sejam abusados.

### 7. Alterações nos Termos e Consentimento Interativo
7.1. Estes Termos podem ser atualizados periodicamente para refletir novos recursos ou exigências regulatórias.  
7.2. Quando houver alteração substantiva na versão dos Termos (`tosVersion`), o bot interceptará novos comandos e exibirá uma janela interativa solicitando que o usuário revise e confirme o novo aceite antes de continuar o uso.

---

## 🔒 POLÍTICA DE PRIVACIDADE

### 1. Objetivo e Escopo
Esta Política de Privacidade descreve como o **Binder's Server Tools** coleta, armazena, processa e protege os dados dos usuários e servidores que utilizam nossos serviços no Discord, em conformidade com as boas práticas de proteção de dados (incluindo LGPD e GDPR).

### 2. Dados Coletados e Sua Finalidade
2.1. **Identificação e Preferências**:
- *ID do Usuário*: Necessário para associar preferências (idioma escolhido, versão do ToS confirmada) e evitar pedidos repetitivos de configuração.
- *Locale / Idioma*: Para responder comandos e menus no idioma de preferência do usuário (`pt_BR` ou `en_US`).
2.2. **Lembretes Agendados (`/reminder`)**:
- O conteúdo da mensagem de lembrete, data/hora prevista e IDs do canal e usuário são salvos temporariamente na tabela `reminders` com a única finalidade de disparar o alerta no canal e na DM do usuário no momento correto.
- O lembrete é concluído e seus temporizadores são descartados imediatamente após o disparo, ou pelo cancelamento prévio via `/reminder cancelar`.
2.3. **Configurações de Servidores (`guilds`)**:
- Armazenamos o ID da guilda e configurações atribuídas pelos administradores (canais designados para mod-log, antiraid ou boas-vindas).
2.4. **Logs Técnicos de Diagnóstico (`bot_logs`)**:
- Em caso de exceção de software, capturamos o nome do comando invocado, tempo de resposta em milissegundos e o erro gerado, sem coletar conteúdo de mensagens privadas de servidores ou chats.

### 3. Integração com Serviços e APIs de Terceiros
3.1. Ao utilizar comandos como `/musica`, `/roblox` ou `/minecraft`, o bot encaminha apenas o termo de pesquisa público (nome do jogo, música ou nick de jogador) para as respectivas APIs oficiais (Roblox API, Mojang API, iTunes Search API, Deezer API). Nenhum identificador pessoal do Discord é transmitido a esses terceiros.  
3.2. Não realizamos rastreamento entre plataformas, publicidade direcionada ou monetização de perfis comportamentais.

### 4. Segurança do Armazenamento
4.1. Todos os dados em repouso são hospedados no **Supabase PostgreSQL** na região AWS us-west-2, com proteção de acesso restrito via Row Level Security (RLS) e conexões SSL/TLS obrigatórias.  
4.2. As conexões em tempo real com a API do Discord são protegidas pelo protocolo seguro do Discord (WebSockets com TLS).  
4.3. Dispomos de fallback com armazenamento local em disco caso ocorra instabilidade temporária na rede externa, garantindo a integridade dos dados sem exposição pública.

### 5. Retenção e Ciclo de Vida dos Dados
5.1. Os dados de perfil permanecem armazenados enquanto o usuário mantiver o bot ativo ou não revogar seu consentimento.  
5.2. Dados de lembretes entregues são marcados como concluídos e limpos de rotinas ativas.  
5.3. Logs de erro operacionais no banco são rotacionados periodicamente.

### 6. Direitos do Usuário (LGPD / GDPR)
Você possui controle total sobre suas informações. A qualquer momento, você pode exercer os seguintes direitos:
- **Acesso**: Saber quais dados estão registrados sob seu ID;
- **Correção**: Alterar suas preferências de idioma usando o seletor em `/ajuda` ou configurações de perfil;
- **Exclusão Definitiva**: Solicitar a remoção integral de qualquer dado vinculado ao seu ID de usuário;
- **Revogação de Consentimento**: Cancelar o aceite dos termos.

### 7. Canal de Contato e Exercício de Direitos
Para solicitar a exclusão de seus dados, tirar dúvidas legais ou reportar qualquer incidente de segurança, entre em contato através de:
- **Servidor Oficial de Suporte no Discord**: [https://dsc.gg/bindersdc](https://dsc.gg/bindersdc)
- **Abertura de Ticket ou Contato Direto**: Abrir um ticket na seção de suporte ou contatar o desenvolvedor responsável (@Binder).  
- **Prazo de Atendimento**: Todas as solicitações de exclusão de dados são atendidas em até **5 dias úteis**.
