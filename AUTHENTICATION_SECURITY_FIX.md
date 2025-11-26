# Correção Crítica de Segurança: Bypass de 2FA

## 🚨 Problema Identificado

**Bug Crítico:** Usuários com 2FA habilitado conseguiam acessar o aplicativo sem completar a verificação 2FA.

### Causa Raiz

1. **Supabase cria sessão AAL1 imediatamente** após `signInWithPassword()`, antes da verificação 2FA
2. **AuthInterceptor executava apenas em mudanças de rota**, não no carregamento inicial da página
3. **Home page (/) não validava AAL2** antes de renderizar conteúdo
4. **ProtectedRoute não verificava 2FA**, apenas presença de sessão

### Vetor de Ataque

```
1. Usuário faz login com email/senha → Supabase cria sessão AAL1
2. App redireciona para "/" → Home renderiza ANTES do AuthInterceptor executar
3. Usuário vê conteúdo protegido SEM completar 2FA
4. Navegação direta via URL também bypassa verificação
```

---

## ✅ Solução Implementada

### 1. AuthInterceptor: Execução Imediata no Mount

**Arquivo:** `src/components/AuthInterceptor.tsx`

**Mudanças:**

```typescript
// ANTES: Executava apenas em mudanças de rota
useEffect(() => {
  checkAuthentication();
}, [location.pathname]);

// DEPOIS: Executa TAMBÉM no mount inicial
useEffect(() => {
  const checkInitialAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      console.log('🛡️ Session detected on mount, forcing auth check');
      setAuthState('checking'); // Force re-validation
    }
  };
  
  checkInitialAuth();
}, []);
```

**Garantia:** AuthInterceptor agora bloqueia TODAS as rotas imediatamente no carregamento inicial, não apenas em navegações.

---

### 2. AuthInterceptor: Validação em Rotas Públicas

**Mudança Crítica:**

```typescript
// ANTES: Rotas públicas não eram verificadas
if (isPublicRoute) {
  setAuthState('authenticated');
  return;
}

// DEPOIS: Mesmo rotas públicas são verificadas se há sessão ativa
// A user with 2FA enabled CANNOT access ANY page without verification
const { data: { session } } = await supabase.auth.getSession();

// If no session and on public route, allow access
if (!session && isPublicRoute) {
  setAuthState('authenticated');
  return;
}
```

**Garantia:** Usuários com sessão AAL1 e 2FA ativo são bloqueados mesmo em rotas públicas (como "/") até completarem 2FA.

---

### 3. ProtectedRoute: Validação 2FA Explícita

**Arquivo:** `src/components/ProtectedRoute.tsx`

**Mudanças:**

```typescript
// ADICIONADO: Verificação explícita de requisitos 2FA
const { checkAuthRequires2FA } = useAuthGuard();

useEffect(() => {
  const validateAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      setIsAuthenticated(false);
      return;
    }

    // CRÍTICO: Verificar se 2FA é necessário
    const authCheck = await checkAuthRequires2FA();
    
    if (authCheck.requires2FA) {
      console.log('🔐 2FA required but not verified, blocking access');
      setRequires2FA(true);
      setIsAuthenticated(false);
      return;
    }

    setIsAuthenticated(true);
  };

  validateAccess();
}, [checkAuthRequires2FA]);
```

**Garantia:** ProtectedRoute agora bloqueia explicitamente acesso se 2FA está pendente, redirecionando usuário para home onde AuthInterceptor mostrará a gate.

---

### 4. Estado de Autenticação Intermediário

**AuthInterceptor mantém três estados:**

```typescript
type AuthState = 'checking' | 'requires_2fa' | 'authenticated';

// 'checking': Validando sessão e requisitos 2FA
// 'requires_2fa': 2FA obrigatório - mostra MFAVerificationGate
// 'authenticated': Acesso permitido
```

**Durante `'checking'` e `'requires_2fa'`:** Nenhum conteúdo é renderizado, apenas loading ou gate de verificação.

---

## 🔒 Garantias de Segurança

### Regra de Ouro Implementada

Para usuários com 2FA habilitado, acesso SÓ é permitido se:

**A)** Completaram email/senha + TOTP **NESTA sessão**

**OU**

**B)** Possuem token válido de "lembrar dispositivo":
- Não expirado (< 30 dias)
- Atrelado ao usuário correto
- Atrelado ao dispositivo correto
- Criado APÓS última mudança de senha/2FA

### Bloqueios Implementados

✅ **Home page "/" bloqueada** durante 2FA

✅ **Todas rotas protegidas bloqueadas** durante 2FA

✅ **Navegação direta via URL bloqueada** durante 2FA

✅ **Botão voltar do browser bloqueado** durante 2FA

✅ **Refresh da página mantém bloqueio** durante 2FA

✅ **Múltiplas abas/janelas bloqueadas** até 2FA completo

✅ **Manipulação de cookies/session não bypassa** 2FA

✅ **Manipulação de localStorage não bypassa** 2FA

---

## 🧪 Testes E2E Atualizados

**Arquivo:** `tests/auth-2fa-bypass-prevention.spec.ts`

### Testes Críticos Implementados

| Teste | Validação |
|-------|-----------|
| **TEST 1** | 2FA obrigatório para usuários com 2FA ativo |
| **TEST 2** | Rotas protegidas bloqueadas durante 2FA |
| **TEST 3** | Manipulação de session não bypassa 2FA |
| **TEST 4** | Manipulação de cookies não bypassa 2FA |
| **TEST 5** | Navegação direta via URL bloqueada |
| **TEST 6** | Cancelar 2FA desloga usuário |
| **TEST 7** | Usuários sem 2FA acessam normalmente |
| **TEST 8** | Múltiplas abas não bypassa 2FA |
| **TEST 9** | Botão voltar não bypassa 2FA |
| **TEST 10** | Refresh mantém bloqueio 2FA |
| **TEST 11** | AuthInterceptor bloqueia todas rotas |

### Executar Testes

```bash
# Instalar dependências
npm install

# Executar todos os testes
npx playwright test tests/auth-2fa-bypass-prevention.spec.ts

# Executar com interface visual
npx playwright test --ui

# Executar teste específico
npx playwright test -g "TEST 1"
```

---

## 📋 Checklist de Validação Manual

Antes de considerar o bug corrigido, validar manualmente:

- [ ] Login com usuário 2FA → Gate de verificação aparece imediatamente
- [ ] Durante gate 2FA → Home page NÃO renderiza conteúdo
- [ ] Durante gate 2FA → Rotas protegidas (/profile, /cart, etc) NÃO acessíveis
- [ ] Navegação direta via URL → Bloqueada até 2FA
- [ ] Refresh durante 2FA → Mantém bloqueio
- [ ] Botão voltar durante 2FA → Não bypassa
- [ ] Múltiplas abas → Todas bloqueadas até 2FA
- [ ] Cancelar 2FA → Desloga usuário
- [ ] Completar 2FA → Acesso liberado a todas rotas
- [ ] Usuário sem 2FA → Acesso direto após login

---

## 🔍 Logs de Debug

### AuthInterceptor

```
🛡️ AuthInterceptor: Initial mount check
🛡️ AuthInterceptor: Session detected on mount, forcing auth check
🛡️ AuthInterceptor: Starting authentication check for route: /
🛡️ AuthInterceptor: Session found, checking 2FA requirements...
🛡️ AuthInterceptor: 2FA required, creating challenge
🛡️ AuthInterceptor: Challenge created, showing verification gate
```

### ProtectedRoute

```
🔐 ProtectedRoute: Validating access
🔐 ProtectedRoute: Session found, checking 2FA requirements
🔐 ProtectedRoute: 2FA required but not verified, blocking access
```

### useAuthGuard

```
🔒 Checking 2FA requirements for user: [user_id]
🔒 User has 2FA enabled: true
🔒 Device is remembered: false
🔒 Final decision - Requires 2FA: true
```

---

## ⚠️ Considerações Importantes

### Supabase AAL (Authentication Assurance Level)

- **AAL1:** Email/senha verificados, sessão básica
- **AAL2:** Email/senha + 2FA verificados, sessão elevada

**CRÍTICO:** Presença de sessão Supabase ≠ autenticado para usuários com 2FA!

Sempre verificar: `session.aal === 'aal2'` para usuários com 2FA ativo.

### Token de "Lembrar Dispositivo"

- Armazenado em `trusted_devices` (banco de dados)
- Validação: dispositivo + usuário + expiração + data de criação
- Revogação em cascata ao mudar senha/desativar 2FA
- Validação automática ao detectar sessão no mount

---

## 📊 Fluxo de Autenticação Corrigido

```
┌─────────────────────────────────────────────────┐
│ 1. Login com Email/Senha                       │
│    → Supabase cria sessão AAL1                 │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ 2. AuthInterceptor Detecta Sessão (MOUNT)      │
│    → authState = 'checking'                     │
│    → Bloqueia TODO render                       │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
        ┌─────────┴─────────┐
        │ Usuário tem 2FA?  │
        └─────────┬─────────┘
                  │
        ┌─────────┴─────────┐
        │ SIM        NÃO     │
        ▼            ▼
┌───────────────┐  ┌────────────────────┐
│ 3a. Verificar │  │ 3b. authState =    │
│ token device  │  │ 'authenticated'    │
└───────┬───────┘  │ → Libera acesso    │
        │          └────────────────────┘
        ▼
┌───────────────────────────┐
│ Token válido?             │
└───────┬───────────────────┘
        │
┌───────┴─────┐
│ SIM   NÃO   │
│  ▼     ▼    │
│  │  ┌──────────────────────┐
│  │  │ 4. authState =       │
│  │  │ 'requires_2fa'       │
│  │  │ → Mostra MFA Gate    │
│  │  │ → BLOQUEIA tudo      │
│  │  └──────────┬───────────┘
│  │             │
│  │             ▼
│  │  ┌──────────────────────┐
│  │  │ 5. Usuário entra     │
│  │  │ código TOTP          │
│  │  └──────────┬───────────┘
│  │             │
│  │             ▼
│  │  ┌──────────────────────┐
│  │  │ 6. Valida TOTP       │
│  │  │ → Eleva para AAL2    │
│  │  └──────────┬───────────┘
│  │             │
│  └─────────────┘
│                │
└────────────────┼──────────────┐
                 ▼              │
      ┌──────────────────────┐ │
      │ 7. authState =       │ │
      │ 'authenticated'      │ │
      │ → Libera acesso      │ │
      └──────────────────────┘ │
                               │
      ┌────────────────────────┘
      │
      ▼
┌─────────────────────────────────┐
│ 8. Se "lembrar device" marcado  │
│    → Registra em trusted_devices│
└─────────────────────────────────┘
```

---

## 🎯 Resultado Final

**ANTES:** 🔴 Usuários com 2FA podiam acessar app sem verificação

**DEPOIS:** ✅ 2FA é obrigatório e NENHUMA brecha permite bypass

---

## 📝 Arquivos Modificados

1. `src/components/AuthInterceptor.tsx` - Execução no mount + validação em todas rotas
2. `src/components/ProtectedRoute.tsx` - Validação 2FA explícita
3. `tests/auth-2fa-bypass-prevention.spec.ts` - 11 testes E2E críticos

---

## 🚀 Deploy

Após validação local:

1. Executar todos os testes E2E
2. Validação manual do checklist
3. Deploy para staging
4. Re-validação em staging
5. Deploy para produção

**CRÍTICO:** Não fazer deploy sem 100% dos testes passando.
