# Tarefas de Implementação: Conext Hub

- `[x]` 1. Configuração do Projeto e Banco de Dados
- `[x]` 2. Instalação e Estruturação de Pacotes
- `[x]` 3. Desenvolvimento Inicial (Dropzone & S3 MinIO)
- `[x]` 4. Setup do Sistema de Login (NextAuth)

**Fase 3: Kanban Admin e Integração Asaas (EM ANDAMENTO)**

- `[/]` 5. Configuração de Bibliotecas e Serviços
  - `[/]` Instalar @dnd-kit/core e sortable
  - `[ ]` Criar serviço `src/services/asaas.ts`
  - `[ ]` Configurar Webhooks (Mock/Sandbox)

- `[ ]` 6. Kanban Administrativo (Conext Master)
  - `[ ]` Criar componente `KanbanBoard` (Client Component)
  - `[ ]` Criar `KanbanColumn` e `KanbanCard`
  - `[ ]` Implementar lógica de drag-and-drop para troca de status
  - `[ ]` Criar Server Action `updateProjectStatus`

- `[ ]` 7. Módulo de Negociação e Faturamento
  - `[ ]` Criar modal de negociação no Card do Kanban
  - `[ ]` Implementar gatilho: Mover para `WAITING_INITIAL_PAY` -> Gerar Fatura Asaas
  - `[ ]` Criar Server Action `negotiateProject`

- `[ ]` 8. Dashboard da Agência (Melhorias)
  - `[ ]` Exibir status de pagamento (link do boleto/pix do Asaas)
  - `[ ]` Notificações visuais de alteração de status
