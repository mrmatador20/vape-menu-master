# E2E Security Tests - 2FA Bypass Prevention

## Overview

Testes automatizados end-to-end usando Playwright para verificar que o sistema de autenticação 2FA não pode ser bypassado em nenhum cenário.

## Configuração

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Usuários de Teste

Antes de executar os testes, você precisa criar usuários de teste no seu banco de dados:

**Usuário COM 2FA:**
- Email: `test-2fa-user@example.com`
- Senha: `TestPassword123!@#`
- 2FA: Habilitado (guarde o TOTP secret)

**Usuário SEM 2FA:**
- Email: `test-no-2fa-user@example.com`
- Senha: `TestPassword123!@#`
- 2FA: Desabilitado

### 3. Atualizar Credenciais no Teste

Edite `tests/auth-2fa-bypass-prevention.spec.ts` e atualize:

```typescript
const TEST_USER_WITH_2FA = {
  email: 'test-2fa-user@example.com',
  password: 'TestPassword123!@#',
  totpSecret: 'SEU_TOTP_SECRET_AQUI',
};
```

### 4. Implementar Geração de TOTP

Instale uma biblioteca TOTP:

```bash
npm install --save-dev otpauth
```

Atualize a função `generateTOTPCode()` em `tests/auth-2fa-bypass-prevention.spec.ts`:

```typescript
import { TOTP } from 'otpauth';

function generateTOTPCode(secret: string): string {
  const totp = new TOTP({
    secret: secret,
    digits: 6,
    period: 30,
  });
  return totp.generate();
}
```

## Executar Testes

### Todos os Testes

```bash
npx playwright test
```

### Testes Específicos

```bash
# Apenas testes de bypass prevention
npx playwright test auth-2fa-bypass-prevention

# Um teste específico
npx playwright test -g "TEST 1"
```

### Modo Debug

```bash
npx playwright test --debug
```

### Com UI

```bash
npx playwright test --ui
```

## Cobertura de Testes

### ✅ Testes Automatizados Implementados

1. **TEST 1**: Usuário com 2FA não pode acessar sem verificação
2. **TEST 2**: Rotas protegidas inacessíveis durante desafio 2FA
3. **TEST 3**: Manipulação de session storage não bypassa 2FA
4. **TEST 4**: Manipulação de cookies não bypassa 2FA
5. **TEST 5**: Navegação direta por URL é bloqueada durante 2FA
6. **TEST 6**: Cancelar 2FA desloga o usuário
7. **TEST 7**: Usuário sem 2FA acessa normalmente
8. **TEST 8**: Múltiplas abas não bypassam 2FA
9. **TEST 9**: Botão voltar não bypassa 2FA
10. **TEST 10**: Refresh de página mantém segurança 2FA
11. **TEST 11**: AuthInterceptor bloqueia todas as rotas até 2FA completo
12. **TEST 12**: Checkbox "lembrar dispositivo" cria token válido

### 📋 Testes Manuais Necessários

Estes cenários requerem estados específicos no banco de dados:

1. ✅ Token expirado (30+ dias) deve exigir 2FA novamente
2. ✅ Token invalidado após mudança de senha
3. ✅ Token invalidado após desabilitar/reabilitar 2FA
4. ✅ Token funciona apenas no dispositivo/navegador específico
5. ✅ Usuários admin com 2FA também requerem verificação
6. ✅ Sessões concorrentes requerem 2FA independentemente

## Cenários Críticos de Segurança

### 🔴 CRÍTICO: Nunca Permitir

- ❌ Acesso a rotas protegidas sem 2FA completo
- ❌ Bypass via manipulação de storage/cookies
- ❌ Bypass via navegação direta por URL
- ❌ Bypass via múltiplas abas/janelas
- ❌ Bypass via botão voltar ou refresh
- ❌ Acesso a dados sensíveis (perfil, pedidos) durante desafio 2FA

### 🟢 PERMITIDO: Comportamentos Esperados

- ✅ Usuários sem 2FA acessam diretamente
- ✅ Token "lembrar dispositivo" válido permite bypass
- ✅ Cancelar 2FA desloga completamente
- ✅ Rotas públicas (/auth, /forgot-password) sempre acessíveis

## Relatórios

Após executar os testes:

```bash
npx playwright show-report
```

## CI/CD Integration

Adicione ao seu pipeline:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run E2E Tests
  run: npx playwright test

- name: Upload Test Results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

## Troubleshooting

### Testes Falhando

1. **Verifique credenciais dos usuários de teste**
2. **Certifique-se que o app está rodando** (`npm run dev`)
3. **Limpe cookies/storage** antes dos testes
4. **Verifique os logs do console** com `--debug`

### Performance

- Testes rodam com `workers: 1` para evitar conflitos de autenticação
- Timeout padrão: 30s por teste
- Considere ajustar `fullyParallel: false` se necessário

## Manutenção

### Adicionar Novos Testes

1. Crie um novo `test()` em `auth-2fa-bypass-prevention.spec.ts`
2. Use os helpers existentes (`attemptAccessProtectedRoute`)
3. Siga o padrão de logging: `console.log('🔐 TEST X: ...')`
4. Sempre limpe estado antes: `beforeEach` hook

### Atualizar Após Mudanças de Segurança

- ✅ Novos endpoints protegidos → Adicione ao `allProtectedRoutes`
- ✅ Nova lógica de token → Adicione teste específico
- ✅ Mudanças no fluxo 2FA → Atualize testes existentes

---

**IMPORTANTE**: Estes testes são críticos para segurança. Todos devem passar antes de deploy para produção.
