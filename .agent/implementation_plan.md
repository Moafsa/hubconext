# Conext Hub - Proposta de Arquitetura e Implementação

Este documento detalha o entendimento do **Conext Hub**, a plataforma B2B (Agência <-> Conext), englobando negociação ágil, integração financeira com o Asaas, e sistema de notificações White-Label para os clientes finais.

---

## 1. Visão Geral do Sistema (Modelo de Negócios)

O **Conext Hub** é um sistema de parceria B2B focado em gerenciar demandas técnicas com comunicação invisível (White-Label) para o cliente final. O sistema interliga:
- **Financeiro B2B:** Faturamentos, através do **Asaas**, são emitidos exclusivamente contra a Agência.
- **Comunicação Segregada:** As notificações por E-mail ou WhatsApp para o cliente final ocorrem, porém são sempre mascaradas com a marca e a identidade visual da Agência parceira.

O ecossistema é formado por 3 perfis de usuários:
1. **Conext (Painel Master/Kanban):** Visão administrativa total. Recebe leads das agências, negocia valores e recebe o dinheiro (via Asaas). Modifica os status dos projetos (Em Desenvolvimento, Homologação).
2. **Dashboard da Agência:** O parceiro gerencia seus clientes e projetos encomendados. Solicita novos sistemas, faz propostas de valor para a Conext, aceita contrapropostas, paga as faturas da Conext e acompanha o status de todas as suas entregas.

### [NEW] Kanban Administrativo (Conext Master)
Uma página exclusiva para o papel `CONEXT_ADMIN` onde todos os projetos de todas as agências são exibidos organizados por colunas de status.

### [NEW] Gerenciamento de Agências (Admin)
Página para o administrador da Conext cadastrar e gerenciar as agências parceiras.

#### [NEW] [agencies/page.tsx](file:///c:/Users/moaci/OneDrive/Documentos/Conext/White-label-SIS/src/app/(dashboard)/dashboard/agencies/page.tsx)
Listagem de agências com métricas básicas (projetos ativos, faturamento pendente).

### [NEW] Configurações e Perfil
Área para agências customizarem sua marca White-Label.

#### [NEW] [settings/page.tsx](file:///c:/Users/moaci/OneDrive/Documentos/Conext/White-label-SIS/src/app/(dashboard)/dashboard/settings/page.tsx)
Upload de logo da agência e definição da cor primária.

## Open Questions
- Devo criar um fluxo de convite de usuário para as agências ou o administrador cadastra os usuários manualmente?
- Para o upload de Logo na página de configurações, utilizaremos o mesmo bucket do MinIO?

3. **Portal do Cliente Final (White-Label):** Apenas uma visão de linha do tempo e um cofre de arquivos (Upload pro MinIO). O cliente NUNCA vê boletos e NUNCA vê menções à Conext. Quando ele recebe uma notificação de SMS ou E-mail dizendo "Etapa Concluída", o remetente é o nome da Agência.

**Stack Tecnológica:** Next.js, Shadcn UI, Prisma ORM, Asaas (Gateway), MinIO (Storage).

---

## 2. Fluxo Automático e Negociação (B2B)

A magia do sistema vive na velocidade de fechar acordos e garantir recebimentos automáticos:

1. **Abertura de Escopo (A Agência propõe):** 
   A agência cadastra "Clínica Sorriso", preenche o tipo de projeto e joga um **Valor Proposto** e um **Prazo Sugerido**.
   
2. **Rodada de Negociação:** 
   O projeto vai para status `AGUARDANDO CONEXT`. Você (Conext) analisa o escopo e pode:
   - **Aprovar diretamente**, ou;
   - Fazer comentários e retornar com uma **Contraproposta** de valor ou tempo de entrega.

3. **Aceite e Automação do Asaas (Fatura 50%):**
   Assim que a Agência clica em "De Acordo", o Contrato base é ativado para aquela OS. Imediatamente, o backend via **Asaas API** gera um boleto/PIX para o CNPJ da Agência correspondente aos 50% de entrada.

4. **Briefing White-Label (Portal do Cliente Final):**
   A agência aprova e manda o link pro cliente dela. O cliente entra lá (vê a logo da Agência), envia os textos e PDFs pesados. O sistema faz o upload seguro pra infra da Conext.
   - *Gatilho:* Quando o cliente final termina o upload, a Conext e a Agência são notificadas de que o "Material chegou".

5. **Acompanhamento (Desenvolvimento e Homologação):**
   Conforme a Conext move os cards de produção no "Kanban", dois eventos acontecem:
   - A Agência é notificada internamente das atualizações técnicas.
   - O Cliente Final recebe avisos bonitos no E-mail/WhatsApp (via Twilio/Sensedia) com a marca da Agência: *"Sua agência iniciou o Desenvolvimento do seu App!"*.

6. **Entrega e Asaas Parte 2:**
   O projeto chegou em "Homologado". Para liberar o código-fonte/servidor pro cliente final, a Conext arrasta o projeto pra "Aguardando Pagamento Final", que manda a cobrança final do **Asaas** de mais 50% para a Agência.

---

## 3. Padrão de Armazenamento Central

O MinIO será regido de forma que você não misture dados concorrentes (uma agência não pode ver arquivos de outra agência):
`bucket-conext/[slug-da-agencia]/[slug-do-cliente-final]/[id-do-projeto]/assets/`

---

## 4. Implementação Técnica Principal (Dropzone & Asaas)

Teremos 3 integrações vitais no Next.js (Server Actions):

1. **Upload S3:** Como detalhado antes, a Opção A via Presigned URLs do MinIO poupa sua banda e acelera envios.
2. **Transações API Asaas:** Módulo que gera integrações de boleto e puxa via Webhook quando foi aprovado pra liberar a Conext.
3. **Serviços de Múltiplos Remetentes de E-mail/SMS:** Alterações dinâmicas da variável de origem que chegam ao usuário final.

---

## 5. Modelagem Mestra de Banco de Dados (Prisma Schema)

Para basear este sistema perfeitamente, o esquema de dados deve refletir os isolamentos. 

```prisma
// schema.prisma

enum Role {
  CONEXT_ADMIN
  AGENCY_USER
}

enum ProjectStatus {
  DRAFT                 // Agência criando o Escopo
  NEGOTIATING           // Em negociação entre Conext e Agência
  WAITING_INITIAL_PAY   // Aprovado, esperando Agência pagar 50%
  WAITING_BRIEFING      // Esperando o Cliente Final subir os Assets
  IN_DEVELOPMENT        // Em Progresso (Trabalho na Conext)
  TESTING               // Em Homologação
  WAITING_FINAL_PAY     // Concluído, esperando Agência pagar 50% restantes
  DELIVERED             // Entregue / Migrado
  CANCELED
}

// Uma agência parceira do Conext Hub.
model Agency {
  id              String      @id @default(cuid())
  name            String
  cnpj            String      @unique
  asaasCustomerId String?     // ID deste cliente atrelado ao seu Asaas

  // Configurações White-Label (Aparência para o cliente final)
  logoUrl         String?
  primaryColor    String?     @default("#000000")
  customDomain    String?     // Opcional para o futuro

  users           User[]      // Quem acessa o dashboard pra essa agência
  clients         Client[]    // Clientes finais
  projects        Project[]   // Demandas geradas
}

// Pessoas faturadoras / usuários do sistema. Clientes finais não tem "User".
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  role      Role     @default(AGENCY_USER)
  
  agencyId  String?
  agency    Agency?  @relation(fields: [agencyId], references: [id])
}

// O cliente final da agência. Não loga, recebe links mágicos/tokens pra acessar a timeline.
model Client {
  id        String   @id @default(cuid())
  name      String
  email     String
  whatsapp  String?
  
  agencyId  String
  agency    Agency   @relation(fields: [agencyId], references: [id])
  
  projects  Project[]
}

// Coração do Sistema: A Ordem de Serviço / Projeto.
model Project {
  id              String   @id @default(cuid())
  title           String
  description     String   @db.Text
  status          ProjectStatus @default(DRAFT)
  
  // Valores financeiros
  proposedPrice   Float?   // Preço que a agência sugeriu
  agreedPrice     Float?   // Preço fechado na negociação com a Conext
  
  // Controle Asaas
  asaasInvoice1Id String?  // ID do Asaas dos 50% Iniciais
  asaasInvoice2Id String?  // ID do Asaas dos 50% Finais
  
  agencyId        String
  agency          Agency   @relation(fields: [agencyId], references: [id])

  clientId        String
  client          Client   @relation(fields: [clientId], references: [id])

  // Arquivos (MinIO) atrelados ao projeto
  files           File[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// Registro de um arquivo físico no Cofre
model File {
  id          String   @id @default(cuid())
  filename    String
  minioKey    String   @unique  // Ex: "agencia/cliente/proj-id/logo.png"
  fileType    String   // MimeType ou Categoria (Branding, Textos)
  sizeBytes   Int
  
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id])
  
  uploadedAt  DateTime @default(now())
}
```

---

## Próximo Passo

Como o **Plano Arquitetural B2B** agora tem sua fundação técnica em nível de Dados e Fluxo:

**Para executar**: Se isso estiver 100% aprovado, eu devo usar a ferramenta `run_command` para disparar a inicialização real deste repositório com o `npx create-next-app` ou prefere que a gente trabalhe num ambiente já configurado?
