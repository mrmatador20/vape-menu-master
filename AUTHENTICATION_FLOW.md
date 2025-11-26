# 🔒 Fluxo de Autenticação com 2FA - Documentação Técnica

## 📋 Visão Geral

Este documento descreve o fluxo completo de autenticação do sistema, incluindo verificação 2FA obrigatória e gerenciamento de dispositivos confiáveis.

## 🎯 Princípios de Segurança

### REGRA DE OURO
**Para contas com 2FA ativado, o login SÓ é considerado completo se:**

✅ **OPÇÃO A:** Usuário passou pelo 2FA nesta sessão
- Email/senha corretos ✓
- Código 2FA verificado ✓

✅ **OPÇÃO B:** Dispositivo confiável válido encontrado
- Token de dispositivo existe ✓
- Token não expirado (máximo 30 dias) ✓
- Token vinculado ao usuário correto ✓
- Token criado após últimas mudanças de segurança ✓

❌ **Se nenhuma condição for satisfeita → 2FA é OBRIGATÓRIO**

## 🏗️ Arquitetura do Sistema

### Componentes de Segurança

```
┌─────────────────────────────────────────────────────────┐
│                    AuthInterceptor                       │
│  (Camada principal de segurança - intercepta TODAS      │
│   as rotas e força verificação 2FA quando necessário)   │
└────────────────┬────────────────────────────────────────┘
                 │
                 ├──► useAuthGuard Hook
                 │    ├─ checkAuthRequires2FA()
                 │    ├─ rememberDevice()
                 │    └─ checkCurrentDevice()
                 │
                 ├──► useTrustedDevices Hook
                 │    ├─ registerDevice()
                 │    ├─ checkCurrentDevice()
                 │    ├─ revokeDevice()
                 │    └─ Database: trusted_devices table
                 │
                 └──► MFAVerificationGate Component
                      ├─ Verificação código TOTP
                      ├─ Opção "Lembrar dispositivo"
                      └─ Elevação sessão para AAL2
```

### 1. AuthInterceptor (`src/components/AuthInterceptor.tsx`)

**Função:** Interceptor de autenticação que protege TODAS as rotas da aplicação.

**Estados:**
- `checking`: Verificando requisitos de autenticação
- `requires_2fa`: 2FA necessário, mostrando gate de verificação
- `authenticated`: Autenticação completa, permitindo acesso

**Fluxo de Verificação:**

```typescript
1. Rota acessada
   ├─ É rota pública? → Permitir acesso
   └─ É rota protegida?
      ├─ Tem sessão? 
      │  └─ NÃO → Redirecionar para /auth
      └─ SIM
         ├─ Tem 2FA habilitado?
         │  └─ NÃO → Permitir acesso
         └─ SIM
            ├─ Dispositivo confiável?
            │  └─ SIM → Permitir acesso
            └─ NÃO
               └─ Criar challenge 2FA → Mostrar gate
```

**Logs de Debug:**
- `🛡️ AuthInterceptor: Starting authentication check`
- `🛡️ AuthInterceptor: Session found, checking 2FA requirements`
- `🛡️ AuthInterceptor: 2FA required, creating challenge`
- `🛡️ AuthInterceptor: Device is trusted, allowing access`

### 2. useAuthGuard Hook (`src/hooks/useAuthGuard.ts`)

**Função:** Hook que verifica requisitos de autenticação e gerencia dispositivos.

**Métodos Principais:**

#### `checkAuthRequires2FA(): Promise<AuthGuardResult>`

Verifica se 2FA é necessário para o usuário atual.

**Retorno:**
```typescript
{
  requires2FA: boolean,      // 2FA é obrigatório?
  has2FAEnabled: boolean,    // Usuário tem 2FA habilitado?
  isDeviceRemembered: boolean, // Dispositivo é confiável?
  factors?: any[]            // Fatores MFA configurados
}
```

**Lógica de Decisão:**
```typescript
has2FAEnabled = !!supabase.auth.mfa.listFactors()?.totp?.length
isDeviceRemembered = await checkCurrentDevice()
requires2FA = has2FAEnabled && !isDeviceRemembered
```

**Comportamento Conservador em Erros:**
- Se erro ao listar fatores MFA → `requires2FA = true` (segurança)
- Se erro inesperado → `requires2FA = true` (segurança)

**Logs de Debug:**
- `🔒 No user session found`
- `🔒 Checking 2FA requirements for user`
- `🔒 User has 2FA enabled: true/false`
- `🔒 Device is remembered: true/false`
- `🔒 Final decision - Requires 2FA: true/false`

#### `rememberDevice(userId: string): Promise<void>`

Registra o dispositivo atual como confiável após verificação 2FA bem-sucedida.

**Implementação:**
```typescript
- Gera fingerprint único do dispositivo
- Salva no banco de dados (trusted_devices)
- Associa ao user_id
- Define validade de 30 dias
- Registra log de atividade
- Envia notificação por email
```

### 3. useTrustedDevices Hook (`src/hooks/useTrustedDevices.ts`)

**Função:** Gerencia dispositivos confiáveis no banco de dados.

#### `checkCurrentDevice(): Promise<boolean>`

Verifica se o dispositivo atual é confiável e válido.

**Validações Realizadas:**
1. ✅ Usuário autenticado existe?
2. ✅ Device fingerprint match no banco?
3. ✅ Dispositivo marcado como `is_trusted = true`?
4. ✅ Token não expirou (< 30 dias)?

**Tratamento de Expiração:**
```typescript
daysSinceLastUse = (now - last_used_at) / (1000 * 60 * 60 * 24)

if (daysSinceLastUse > 30) {
  // Revoga dispositivo expirado automaticamente
  UPDATE trusted_devices SET is_trusted = false
  return false
}

// Atualiza last_used_at para resetar contador
UPDATE trusted_devices SET last_used_at = now()
```

**Logs de Debug:**
- `🔐 checkCurrentDevice: Starting device check`
- `🔐 checkCurrentDevice: Generated fingerprint`
- `🔐 checkCurrentDevice: Days since last use`
- `🔐 checkCurrentDevice: Device token expired (>30 days)`
- `🔐 checkCurrentDevice: Device is trusted and valid`

#### `generateDeviceFingerprint(): string`

Gera fingerprint único baseado em:
- User Agent
- Screen resolution
- Timezone offset
- Platform
- Language
- Color depth
- Hardware concurrency

**Hash:** SHA-256 dos dados concatenados

### 4. MFAVerificationGate (`src/components/MFAVerificationGate.tsx`)

**Função:** Interface de verificação do código TOTP.

**Props:**
- `showRememberOption`: Mostrar checkbox "Lembrar dispositivo"
- `presetRememberDevice`: Valor inicial da checkbox (vinda do login)

**Fluxo:**
1. Usuário digita código 6 dígitos
2. Valida via `verifyTOTPCode(factorId, challengeId, code)`
3. Se checkbox marcada → registra dispositivo
4. Chama `onVerified(deviceRemembered)`
5. AuthInterceptor permite acesso

## 🔄 Fluxos de Uso

### Fluxo 1: Login Novo (Sem 2FA)

```
1. Usuário acessa /auth
2. Digita email/senha
3. signInWithPassword() → Sessão AAL1 criada
4. checkAuthRequires2FA() → has2FAEnabled = false
5. AuthInterceptor: "2FA not enabled, allowing access"
6. Redireciona para /
```

### Fluxo 2: Login com 2FA (Dispositivo Novo)

```
1. Usuário acessa /auth
2. Digita email/senha
3. Marca checkbox "Lembrar este dispositivo" ☑️
4. signInWithPassword() → Sessão AAL1 criada
5. checkAuthRequires2FA() → requires2FA = true
6. Cria MFA challenge
7. Mostra MFAVerificationGate
8. Usuário digita código 2FA
9. Código verificado ✅
10. rememberDevice() → Salva no banco
11. AuthInterceptor: "authenticated"
12. Redireciona para /
```

### Fluxo 3: Login com 2FA (Dispositivo Confiável)

```
1. Usuário acessa /auth
2. Digita email/senha
3. signInWithPassword() → Sessão AAL1 criada
4. checkAuthRequires2FA()
   ├─ has2FAEnabled = true
   ├─ checkCurrentDevice() = true ✅
   └─ requires2FA = false
5. AuthInterceptor: "Device is trusted, allowing access"
6. Redireciona para /
```

### Fluxo 4: Usuário Autenticado Navega para Rota Protegida

```
1. Usuário com sessão acessa /profile
2. AuthInterceptor intercepta
3. checkAuthRequires2FA()
   ├─ Tem 2FA? SIM
   ├─ Dispositivo confiável? NÃO
   └─ requires2FA = true ⚠️
4. Cria MFA challenge
5. Mostra MFAVerificationGate
6. Usuário verifica 2FA
7. Permite acesso à rota
```

### Fluxo 5: Token de Dispositivo Expirado

```
1. Usuário faz login (30+ dias depois)
2. signInWithPassword() → Sessão criada
3. checkAuthRequires2FA()
   └─ checkCurrentDevice()
      ├─ Encontra dispositivo no banco
      ├─ daysSinceLastUse = 35 dias
      ├─ UPDATE is_trusted = false ❌
      └─ return false
4. requires2FA = true
5. Exige 2FA novamente
```

## 🔐 Tabela: trusted_devices

```sql
CREATE TABLE trusted_devices (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT,
  ip_address TEXT,
  user_agent TEXT,
  is_trusted BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  last_used_at TIMESTAMP DEFAULT now()
);
```

**Índices:**
- `(user_id, device_fingerprint)` - Busca rápida de dispositivo
- `(user_id, is_trusted)` - Listagem de dispositivos ativos

**RLS Policies:**
- Users can SELECT/UPDATE/DELETE only their own devices
- Admin can view all devices

## 📊 Logs de Segurança

### Atividades Registradas (user_activity_logs)

- `device_trusted` - Dispositivo registrado como confiável
- `device_revoked` - Dispositivo revogado
- `device_renamed` - Dispositivo renomeado
- `all_devices_revoked` - Todos dispositivos revogados
- `login` - Login bem-sucedido (com metadata 2FA)
- `login_failed` - Tentativa de login falhou

### Formato de Log

```typescript
{
  activity_type: 'device_trusted',
  user_id: 'uuid',
  metadata: {
    device_fingerprint: 'sha256...',
    device_name: 'Chrome on Windows',
    deviceRemembered: true
  },
  created_at: '2025-11-26T20:00:00Z'
}
```

## 🚨 Cenários de Segurança

### ✅ Cenário Protegido: Tentativa de Bypass via Cookie Falso

**Ataque:** Atacante cria cookie manualmente tentando se passar por dispositivo confiável.

**Defesa:**
1. Sistema NÃO usa cookies no cliente para validação
2. Validação é feita no BANCO DE DADOS via fingerprint
3. Fingerprint é gerado com dados únicos do navegador
4. Mesmo fingerprint falso → não encontra registro no banco → 2FA exigido

**Resultado:** ❌ Ataque falha

### ✅ Cenário Protegido: Token Roubado

**Ataque:** Atacante rouba token de sessão Supabase.

**Defesa:**
1. AuthInterceptor verifica 2FA em TODA navegação
2. Token apenas cria sessão AAL1 (não completa)
3. Sem dispositivo confiável registrado → 2FA exigido
4. Atacante não tem acesso ao app autenticador da vítima

**Resultado:** ❌ Ataque bloqueado no AuthInterceptor

### ✅ Cenário Protegido: Race Condition no Login

**Ataque:** Usuário tenta navegar para rota protegida antes de completar 2FA.

**Defesa:**
1. AuthInterceptor intercepta TODAS as rotas
2. Mesmo com sessão AAL1 → verifica 2FA obrigatório
3. Bloqueia navegação e força verificação 2FA

**Resultado:** ❌ Impossível navegar sem 2FA

### ✅ Cenário Protegido: Token Expirado

**Situação:** Usuário retorna após 30+ dias.

**Defesa:**
1. checkCurrentDevice() verifica expiração
2. Calcula dias desde last_used_at
3. Se > 30 dias → revoga automaticamente
4. Exige novo 2FA

**Resultado:** ✅ Token expirado corretamente

## 🧪 Casos de Teste

### Teste 1: Login com 2FA Habilitado (Sem Dispositivo Confiável)

```typescript
// ARRANGE
usuário.has2FA = true
dispositivo.isConfiável = false

// ACT
login(email, senha)

// ASSERT
expect(MFAVerificationGate).toBeVisible()
expect(checkAuthRequires2FA()).toEqual({
  requires2FA: true,
  has2FAEnabled: true,
  isDeviceRemembered: false
})
```

### Teste 2: Login com 2FA Habilitado (Dispositivo Confiável Válido)

```typescript
// ARRANGE
usuário.has2FA = true
dispositivo.isConfiável = true
dispositivo.last_used_at = hoje - 10 dias

// ACT
login(email, senha)

// ASSERT
expect(MFAVerificationGate).not.toBeVisible()
expect(navigate).toHaveBeenCalledWith('/')
```

### Teste 3: Dispositivo Confiável Expirado

```typescript
// ARRANGE
dispositivo.last_used_at = hoje - 31 dias

// ACT
const isConfiável = await checkCurrentDevice()

// ASSERT
expect(isConfiável).toBe(false)
expect(dispositivo.is_trusted).toBe(false) // Revogado
```

### Teste 4: Tentativa de Bypass via Navegação Direta

```typescript
// ARRANGE
usuário.has2FA = true
dispositivo.isConfiável = false
sessao.aal = 'aal1'

// ACT
navigate('/profile') // Tenta acessar diretamente

// ASSERT
expect(MFAVerificationGate).toBeVisible() // Interceptado
expect(location.pathname).toBe('/profile') // Mantém rota
```

## 📈 Métricas de Segurança

### Indicadores de Saúde do Sistema

1. **Taxa de 2FA Exigido vs Bypassado**
   - Objetivo: 100% dos usuários com 2FA devem passar por verificação quando dispositivo não é confiável
   - Monitorar: logs com `requires2FA = true`

2. **Tempo Médio de Validação 2FA**
   - Objetivo: < 5 segundos
   - Monitorar: timestamp entre `MFA challenge created` e `2FA verification successful`

3. **Taxa de Tokens Expirados**
   - Objetivo: Todos tokens > 30 dias devem ser revogados
   - Monitorar: `Device token expired` logs

4. **Tentativas de Acesso Sem 2FA (Suspeitas)**
   - Objetivo: 0
   - Monitorar: Acessos a rotas protegidas com `requires2FA=true` mas sem MFAVerificationGate

## 🔧 Manutenção

### Limpeza de Dispositivos Antigos

Executar periodicamente (cron job):

```sql
-- Revogar dispositivos não usados há mais de 60 dias
UPDATE trusted_devices 
SET is_trusted = false 
WHERE last_used_at < NOW() - INTERVAL '60 days'
  AND is_trusted = true;

-- Deletar dispositivos revogados há mais de 90 dias
DELETE FROM trusted_devices 
WHERE is_trusted = false 
  AND last_used_at < NOW() - INTERVAL '90 days';
```

### Auditoria de Segurança

Perguntas para verificação periódica:

1. ✅ Usuários com 2FA conseguem bypass sem dispositivo confiável?
2. ✅ Tokens expirados são invalidados corretamente?
3. ✅ AuthInterceptor está ativo em todas as rotas?
4. ✅ Logs de segurança estão sendo registrados?
5. ✅ Notificações de novos dispositivos estão funcionando?

## 🎓 Referências

- [Supabase MFA Documentation](https://supabase.com/docs/guides/auth/auth-mfa)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [NIST Digital Identity Guidelines](https://pages.nist.gov/800-63-3/)

---

**Última Atualização:** 2025-11-26  
**Versão:** 2.0  
**Autor:** Sistema de Segurança NebulaVape
