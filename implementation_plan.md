# Finly Pro+ - Gerenciador Financeiro Pessoal

SaaS mobile-first de gerenciamento financeiro pessoal, construído com **Next.js 15 (App Router)**, **Firebase** (Auth + Firestore + Storage), integrado com **Asaas** como gateway de pagamento e assinaturas, hospedado na **Vercel**.

> [!IMPORTANT]
> Este plano cobre a **Fase 1 (Fundação e MVP)** — o alicerce do projeto. As fases seguintes (Core Financeiro, Planejador, Open Finance) serão planejadas após a entrega desta fase.

## Stack Técnica

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router, Server Actions) |
| Linguagem | TypeScript |
| Estilização | CSS Modules + CSS Variables (design tokens) |
| Auth | Firebase Authentication (Google, Email) |
| Database | Cloud Firestore |
| Storage | Firebase Storage (upload de faturas) |
| Pagamentos | Asaas (webhooks + API REST) |
| Gráficos | Chart.js / Recharts |
| Deploy | Vercel |
| PWA | next-pwa |

## User Review Required

> [!WARNING]
> **Credenciais Firebase**: Você precisará criar um projeto no Firebase Console e fornecer as credenciais (apiKey, authDomain, projectId, etc.) para o arquivo `.env.local`.

> [!WARNING]
> **Asaas API**: Será necessário criar uma conta no Asaas, obter a API Key e configurar o webhook apontando para sua URL. Confirmar se o ambiente será sandbox ou produção.

> [!IMPORTANT]
> **Fluxo de Onboarding**: A compra via Asaas é o **primeiro passo**. O webhook do Asaas cria automaticamente o usuário no Firebase (Auth + Firestore) e envia um email com as credenciais de acesso. Não existe registro manual no app — o acesso é 100% controlado pela compra.

---

## Proposed Changes

### 1. Setup do Projeto Next.js

#### [NEW] Projeto Next.js via create-next-app

Criar o projeto com:
- TypeScript
- App Router
- CSS Modules (sem Tailwind)
- ESLint
- Alias `@/` para imports

```bash
npx -y create-next-app@latest ./ --typescript --app --eslint --no-tailwind --src-dir --import-alias "@/*"
```

#### [NEW] Dependências do projeto

```bash
npm install firebase recharts lucide-react date-fns
npm install -D @types/node
```

---

### 2. Design System (Mobile-First, Premium)

#### [NEW] `src/styles/globals.css`
Design tokens com CSS Variables:
- **Paleta de cores**: dark mode como padrão, tons de azul/roxo premium com gradientes
- **Tipografia**: Inter (Google Fonts) com escala modular
- **Espaçamentos**: sistema de 4px/8px
- **Bordas e sombras**: glassmorphism, blur effects
- **Breakpoints**: mobile-first (375px → 768px → 1024px → 1440px)
- **Animações**: transições suaves, micro-interações

#### [NEW] `src/styles/components.module.css`
Estilos globais de componentes reutilizáveis (cards, botões, inputs, badges).

---

### 3. Firebase Config

#### [NEW] `src/lib/firebase.ts`
Inicialização do Firebase App, Auth, Firestore e Storage com variáveis de ambiente.

#### [NEW] `src/lib/firebase-admin.ts`
Firebase Admin SDK para uso em Server Actions e API Routes (webhooks).

#### [NEW] `.env.local.example`
Template com todas as variáveis de ambiente necessárias:
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
ASAAS_API_KEY=
ASAAS_WEBHOOK_TOKEN=
ASAAS_ENVIRONMENT=sandbox
```

---

### 4. Autenticação (somente Login — sem registro manual)

> [!NOTE]
> O registro do usuário é feito **exclusivamente** pelo webhook do Asaas. Não existe fluxo de cadastro no app.

#### [NEW] `src/contexts/AuthContext.tsx`
Context de autenticação com React Context API:
- Estado do usuário (loading, authenticated, unauthenticated)
- Login com Email/Senha (credenciais geradas pelo webhook)
- Recuperação de senha ("esqueci minha senha")
- Logout
- Dados do perfil do Firestore (incluindo status de assinatura)

#### [NEW] `src/app/(auth)/login/page.tsx`
Página de login com design premium:
- Login com email/senha
- Link "Esqueci minha senha"
- Link para página de assinatura / checkout (para quem ainda não tem conta)
- Animações de entrada

#### [NEW] `src/app/(auth)/forgot-password/page.tsx`
Página de recuperação de senha via Firebase Auth.

#### [NEW] `src/app/(auth)/layout.tsx`
Layout para páginas de auth (sem sidebar/nav).

---

### 5. Integração Asaas (Webhooks — cria o usuário)

#### [NEW] `src/app/api/webhooks/asaas/route.ts`
API Route para receber webhooks do Asaas:
- Validação via header `asaas-access-token`
- **`PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED`**: Cria o usuário no Firebase Auth (email + senha temporária), cria documento no Firestore com dados da compra e assinatura ativa, envia link de primeiro acesso (password reset)
- **`PAYMENT_REFUNDED` / `PAYMENT_DELETED`**: Desativa a assinatura no Firestore
- **`PAYMENT_OVERDUE`**: Marca assinatura como pendente
- **`SUBSCRIPTION_INACTIVATED` / `SUBSCRIPTION_DELETED`**: Desativa a assinatura no Firestore

#### [NEW] `src/lib/asaas.ts`
Funções utilitárias para o Asaas:
- Validação de webhook (token no header)
- Tipos TypeScript para os eventos de pagamento e assinatura
- Criação de usuário no Firebase Auth via Admin SDK
- Geração de link de primeiro acesso (password reset link)
- Helper para verificar assinatura ativa
- Client HTTP para API REST do Asaas (criar cobranças, assinaturas)

---

### 6. Layout Principal do App

#### [NEW] `src/app/(app)/layout.tsx`
Layout protegido (requer auth + assinatura):
- **Mobile**: Bottom navigation bar fixa com ícones (Dashboard, Transações, Orçamento, Perfil)
- **Desktop**: Sidebar lateral com menu expandido
- Header com saudação, avatar e notificações
- Middleware-like de verificação de auth

#### [NEW] `src/components/BottomNav.tsx`
Navegação inferior mobile com:
- 4-5 itens com ícones (Lucide)
- Indicador de item ativo com animação
- Efeito de glassmorphism

#### [NEW] `src/components/Sidebar.tsx`
Sidebar para desktop:
- Logo e branding
- Menu de navegação com ícones
- Seção de usuário com avatar
- Transição suave show/hide

#### [NEW] `src/components/Header.tsx`
Header com:
- Saudação personalizada ("Bom dia, Eduardo!")
- Avatar do usuário
- Botão de notificações

---

### 7. Dashboard Financeiro

#### [NEW] `src/app/(app)/dashboard/page.tsx`
Dashboard principal com:
- **Card de saldo**: saldo total com visual premium (gradiente)
- **Receitas vs Despesas**: resumo do mês com gráfico de barras
- **Últimas transações**: lista com scroll das últimas 5 transações
- **Gráfico de evolução**: gráfico de linha (últimos 6 meses)
- **Cards de categorias top**: maiores gastos do mês
- Todos com dados mock inicialmente (dados reais na Fase 2)

#### [NEW] `src/components/BalanceCard.tsx`
Card de saldo com gradiente premium e animação de contagem.

#### [NEW] `src/components/TransactionList.tsx`
Lista de transações com ícones por categoria, valores coloridos e scroll suave.

#### [NEW] `src/components/Charts.tsx`
Componentes de gráficos usando Recharts (barras, linhas, pizza).

---

### 8. Middleware e Proteção de Rotas

#### [NEW] `src/middleware.ts`
Middleware do Next.js para:
- Redirecionar usuários não autenticados para `/login`
- Redirecionar usuários autenticados de `/login` para `/dashboard`

---

### 9. Estrutura de Dados Firestore

Coleções planejadas:

```
users/{userId}
  - name: string
  - email: string
  - photoURL: string
  - subscription: { active: boolean, plan: string, expiresAt: timestamp, asaasSubscriptionId: string }
  - asaas: { customerId: string, paymentId: string, purchaseDate: timestamp }
  - createdAt: timestamp  (data de criação via webhook)
  - createdBy: "asaas_webhook"
  - settings: { currency: "BRL", theme: "dark" }

transactions/{transactionId}
  - userId: string
  - type: "income" | "expense"
  - amount: number
  - category: string
  - description: string
  - date: timestamp
  - account: string
  - createdAt: timestamp

categories/{categoryId}
  - userId: string
  - name: string
  - icon: string
  - color: string
  - type: "income" | "expense"
  - budget: number (mensal)
```

---

## Estrutura de Arquivos (Fase 1)

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── layout.tsx
│   ├── (app)/
│   │   ├── dashboard/page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   └── webhooks/
│   │       └── asaas/route.ts
│   ├── layout.tsx
│   ├── page.tsx (redirect para /dashboard)
│   └── globals.css
├── components/
│   ├── BottomNav.tsx
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   ├── BalanceCard.tsx
│   ├── TransactionList.tsx
│   └── Charts.tsx
├── contexts/
│   └── AuthContext.tsx
├── lib/
│   ├── firebase.ts
│   ├── firebase-admin.ts
│   └── asaas.ts
├── styles/
│   └── components.module.css
└── types/
    └── index.ts
```

---

## Verification Plan

### Verificação Automatizada
1. **Build do Next.js**: `npm run build` — garantir que compila sem erros
2. **Lint**: `npm run lint` — sem warnings/errors
3. **Dev Server**: `npm run dev` — app sobe sem erros no console

### Verificação via Browser (subagent)
1. Acessar `http://localhost:3000` → deve redirecionar para `/login`
2. Verificar layout da tela de login (mobile-first, design premium)
3. Verificar tela de registro
4. Acessar `/dashboard` sem auth → deve redirecionar para `/login`
5. Verificar responsividade (mobile vs desktop)

### Verificação Manual (pelo usuário)
1. Configurar Firebase Console e adicionar credenciais no `.env.local`
2. Testar webhook do Asaas (via Postman) em `/api/webhooks/asaas` → deve criar usuário no Firebase
3. Verificar no Firebase Auth se o usuário foi criado
4. Verificar no Firestore se o documento do usuário foi criado com dados do Asaas
5. Testar login com email/senha (credenciais do webhook)
6. Testar fluxo "esqueci minha senha"
7. Verificar que o dashboard exibe dados mock corretamente
8. Verificar visual no celular real (PWA)
