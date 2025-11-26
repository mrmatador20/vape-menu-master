# E2E Security Tests - 2FA Bypass Prevention

## 📋 Arquivos de Teste

### ⭐ `auth-2fa-comprehensive-security.spec.ts` (PRINCIPAL)
**Suite completa de 11 seções de segurança 2FA** - USE ESTE

Cobre TODAS as seções críticas do manual de teste:
- ✅ SECTION 1: Fluxo normal com 2FA
- ✅ SECTION 2: Race condition durante "Processando..."
- ✅ SECTION 3: Navegação direta via URL
- ✅ SECTION 4: Acesso multi-aba
- ✅ SECTION 5: Refresh (F5) durante 2FA
- ✅ SECTION 6: Manipulação de cookies (lembrar dispositivo)
- ✅ SECTION 7: Bypass via estado extremo
- ✅ SECTION 8: Usuários sem 2FA
- ✅ SECTION 9: Usuários admin com 2FA
- ✅ SECTION 10: Testes de tempo/demora (40s)
- ✅ SECTION 11: Acesso pós-verificação 2FA

### `auth-2fa-bypass-prevention.spec.ts`
Suite original de testes (mantida para compatibilidade)

---

## 🚀 Pré-requisitos

### 1. Instalar dependências
```bash
npm install
```

### 2. Instalar navegadores Playwright
```bash
npx playwright install
```

### 3. Instalar biblioteca TOTP
```bash
npm install otplib
```

### 4. Criar usuários de teste no Supabase

Você precisa criar usuários de teste com as seguintes credenciais:

#### ✅ Usuário COM 2FA:
```
Email: test-2fa@example.com
Password: TestPassword123!
2FA: ATIVADO (você precisará do secret TOTP)
```

#### ✅ Usuário SEM 2FA:
```
Email: test-no-2fa@example.com
Password: TestPassword123!
2FA: DESATIVADO
```

#### ✅ Usuário Admin COM 2FA:
```
Email: admin-2fa@example.com
Password: AdminPassword123!
Role: admin
2FA: ATIVADO (você precisará do secret TOTP)
```

---

## 🔧 Configurar 2FA para usuários de teste

Para obter o secret TOTP dos usuários de teste:

1. Faça login na conta do usuário de teste
2. Vá para **Perfil → Configurações de Segurança**
3. Ative o 2FA
4. Quando o QR code for exibido, o secret TOTP estará na URI do QR code:
   ```
   otpauth://totp/Vape-Menu-Express:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Vape-Menu-Express
   ```
5. Copie o valor `secret=` (ex: `JBSWY3DPEHPK3PXP`)
6. Atualize o arquivo de teste com esse secret:
   ```typescript
   const TEST_USERS = {
     with2FA: {
       email: 'test-2fa@example.com',
       password: 'TestPassword123!',
       totpSecret: 'JBSWY3DPEHPK3PXP', // ⬅️ Seu secret real aqui
     }
   };
   ```

---

## 🏃 Executar os Testes

### 🎯 Executar a suite completa (RECOMENDADO):
```bash
npx playwright test tests/auth-2fa-comprehensive-security.spec.ts
```

### Executar TODOS os testes:
```bash
npm run test:e2e
```

### Executar suite original:
```bash
npx playwright test tests/auth-2fa-bypass-prevention.spec.ts
```

### 🎨 Modo UI (interativo):
```bash
npx playwright test --ui
```

### 👀 Com navegador visível:
```bash
npx playwright test --headed
```

### 🔍 Executar um teste específico:
```bash
npx playwright test -g "SECTION 2"
```

### 🐛 Modo debug:
```bash
npx playwright test --debug
```

---

## 📊 Cobertura Completa de Testes

### 🔵 SECTION 1: Fluxo Normal com 2FA
- ✅ **1.1**: Login → tela de 2FA (não home/profile/admin)
- ✅ **1.2**: Após 2FA correto → acesso completo

### 🔵 SECTION 2: Race Condition Durante "Processando..."
- ✅ **2.1**: Clicar perfil durante "Processando..." → bloqueado
- ✅ **2.2**: Clicar admin durante "Processando..." → bloqueado

### 🔵 SECTION 3: Navegação Direta via URL
- ✅ **3.1**: Acessar `/profile` via URL → bloqueado
- ✅ **3.2**: Acessar `/admin` via URL → bloqueado
- ✅ **3.3**: Acessar `/orders`, `/settings` via URL → bloqueado

### 🔵 SECTION 4: Multi-aba
- ✅ **4.1**: Abrir `/` em nova aba → bloqueado
- ✅ **4.2**: Abrir `/admin` em nova aba → bloqueado

### 🔵 SECTION 5: Refresh (F5)
- ✅ **5.1**: F5 durante 2FA → mantém segurança
- ✅ **5.2**: Shift+F5 (hard reload) → mantém segurança

### 🔵 SECTION 6: Manipulação de Cookies
- ✅ **6.1**: "Lembrar dispositivo" cria token válido
- ✅ **6.2**: Cookie falso/corrompido → 2FA obrigatório

### 🔵 SECTION 7: Bypass via Estado Extremo
- ✅ **7.1**: Clicar logo durante 2FA → bloqueado
- ✅ **7.2**: Botão voltar durante 2FA → bloqueado

### 🔵 SECTION 8: Usuários SEM 2FA
- ✅ **8.1**: Usuário sem 2FA → acesso direto

### 🔵 SECTION 9: Usuários Admin com 2FA
- ✅ **9.1**: Admin com 2FA → bloqueado durante processamento

### 🔵 SECTION 10: Testes de Tempo/Demora
- ✅ **10.1**: Esperar 40s na tela de 2FA → tentar todos os bypasses → bloqueado

### 🔵 SECTION 11: Pós-verificação 2FA
- ✅ **11.1**: Após código correto → navbar, perfil, admin funcionam

---

## ✅ Resultados Esperados

**TODOS os testes devem PASSAR.**

Qualquer falha de teste indica uma **🚨 VULNERABILIDADE CRÍTICA DE SEGURANÇA**.

### O que os testes validam:

- **🔐 Segurança de Autenticação**: 2FA não pode ser bypassado por nenhum método
- **🛡️ Proteção de Rotas**: Todas as rotas protegidas exigem verificação 2FA
- **🚫 Manipulação de Sessão**: Sessões e tokens falsos são rejeitados
- **⛔ Bypass de Estado**: Nenhum estado intermediário permite acesso não autorizado
- **✅ Lembrar Dispositivo**: Skip de 2FA baseado em token funciona quando válido
- **⏱️ Race Conditions**: Cliques durante "Processando..." são bloqueados
- **🔄 Persistência**: Refresh/reload mantém requisitos de 2FA

---

## 🐛 Troubleshooting

### ❌ Testes falham com "element not found"
- Verifique que o app está rodando em `http://localhost:5173`
- Verifique que os seletores correspondem à estrutura real dos componentes
- Aumente valores de timeout se necessário

### ❌ Códigos TOTP não funcionam
- Verifique que o secret TOTP está correto (Base32 encoded)
- Certifique-se da sincronização de tempo entre máquina de teste e servidor
- Verifique que a biblioteca `otplib` está corretamente instalada:
  ```bash
  npm install otplib
  ```

### ❌ Testes dão timeout
Aumente o timeout em `playwright.config.ts`:
```typescript
use: {
  timeout: 120000, // 120 segundos
}
```

### ❌ Testes passam localmente mas falham no CI
- Certifique-se de instalar dependências: `npx playwright install --with-deps`
- Verifique se variáveis de ambiente estão configuradas
- Aumente timeouts para ambientes CI/CD

---

## 📝 Checklist de Testes Manuais

Alguns cenários requerem teste manual com estados específicos no banco:

1. ✅ Token remember device expirado → 2FA obrigatório novamente
2. ✅ Token invalidado após mudança de senha
3. ✅ Token invalidado após desabilitar/reabilitar 2FA
4. ✅ Token funciona apenas no dispositivo/navegador específico
5. ✅ Usuários admin com 2FA também exigem verificação 2FA
6. ✅ Sessões concorrentes todas exigem 2FA independentemente

---

## 🔴 Cenários Críticos - NUNCA PERMITIR

- ❌ Acesso a rotas protegidas sem 2FA completo
- ❌ Bypass via cliques durante "Processando..."
- ❌ Bypass via manipulação de storage/cookies
- ❌ Bypass via navegação direta por URL
- ❌ Bypass via múltiplas abas/janelas
- ❌ Bypass via botão voltar ou refresh
- ❌ Acesso a dados sensíveis (perfil, pedidos) durante desafio 2FA

## 🟢 Comportamentos Permitidos

- ✅ Usuários sem 2FA acessam diretamente
- ✅ Token "lembrar dispositivo" válido permite skip de 2FA
- ✅ Cancelar 2FA desloga completamente
- ✅ Rotas públicas (/auth, /forgot-password) sempre acessíveis

---

## 📊 Relatórios

Após executar os testes:

```bash
npx playwright show-report
```

---

## 🔄 CI/CD Integration

Adicione ao seu pipeline:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E Security Tests
  run: npx playwright test tests/auth-2fa-comprehensive-security.spec.ts

- name: Upload Test Results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

---

## 🛠️ Manutenção

### Adicionar Novos Testes

1. Adicione um novo `test()` no arquivo de teste
2. Use os helpers existentes (`verifyRouteBlocked`, `complete2FA`)
3. Siga o padrão de logging: `console.log('🔐 TEST X.Y: ...')`
4. Sempre limpe estado: `beforeEach` hook

### Atualizar Após Mudanças de Segurança

- ✅ Novos endpoints protegidos → Adicione aos arrays de rotas
- ✅ Nova lógica de token → Adicione teste específico
- ✅ Mudanças no fluxo 2FA → Atualize testes existentes

---

**⚠️ IMPORTANTE**: Estes testes são críticos para segurança. **TODOS devem passar** antes de deploy para produção.
