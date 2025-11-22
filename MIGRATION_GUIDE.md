# Guia Completo de Migração - Nebula Vape

Este guia detalha como migrar seu projeto do Lovable Cloud para outras plataformas de hospedagem.

## 📋 Índice

1. [Cenários de Migração](#cenários-de-migração)
2. [Preparação: Backup dos Dados](#preparação-backup-dos-dados)
3. [Cenário 1: Migrar Apenas Frontend](#cenário-1-migrar-apenas-frontend)
4. [Cenário 2: Migração Completa (Frontend + Backend)](#cenário-2-migração-completa-frontend--backend)
5. [Checklist Final](#checklist-final)
6. [Troubleshooting](#troubleshooting)

---

## Cenários de Migração

### Cenário 1: Frontend Apenas (RECOMENDADO)
- ✅ Mais simples e rápido
- ✅ Zero mudanças no código
- ✅ Backend continua funcionando
- ✅ Menor risco
- **Ideal para:** Ter controle da hospedagem do site mantendo o backend estável

### Cenário 2: Migração Completa
- ⚠️ Mais complexo
- ⚠️ Requer migração de dados
- ⚠️ Mais tempo de setup
- ✅ Controle total da infraestrutura
- **Ideal para:** Necessidade de gerenciar banco de dados diretamente

---

## Preparação: Backup dos Dados

### 1. Exportar Estrutura do Banco (Migrations)

```bash
# As migrations já estão em supabase/migrations/
# Copie todo o conteúdo da pasta supabase/ para backup
cp -r supabase/ backup-supabase/
```

**Migrations existentes:**
- `supabase/migrations/` - Contém toda estrutura de tabelas, RLS, triggers, functions

### 2. Exportar Dados das Tabelas

**Via Interface Lovable:**
1. Abra Cloud → Database → Tables
2. Para cada tabela importante, clique em "Export"
3. Salve os arquivos CSV/JSON

**Tabelas Críticas para Backup:**
- ✅ `profiles` - Perfis de usuários
- ✅ `products` - Produtos
- ✅ `flavors` - Sabores
- ✅ `categories` - Categorias
- ✅ `orders` - Pedidos
- ✅ `order_items` - Itens dos pedidos
- ✅ `reviews` - Avaliações
- ✅ `review_responses` - Respostas às avaliações
- ✅ `banners` - Banners do site
- ✅ `discounts` - Cupons de desconto
- ✅ `discount_usage` - Uso dos cupons
- ✅ `shipping_rates` - Taxas de frete
- ✅ `user_roles` - Papéis dos usuários (admin, user)
- ✅ `user_activity_logs` - Logs de atividade
- ✅ `mfa_backup_codes` - Códigos de backup MFA
- ✅ `security_questions` - Perguntas de segurança
- ⚠️ `account_recovery_tokens` - Tokens de recuperação (podem ser recriados)

### 3. Backup de Arquivos do Storage

**Buckets existentes:**
- `avatars` - Fotos de perfil dos usuários
- `banners` - Imagens dos banners

**Como baixar:**
```javascript
// Script para baixar todos os avatares (executar no console do navegador na página do app)
const { data: files } = await supabase.storage.from('avatars').list();
for (const file of files) {
  const { data } = await supabase.storage.from('avatars').download(file.name);
  // Salvar localmente ou usar um script Node.js para automatizar
}
```

---

## Cenário 1: Migrar Apenas Frontend

### Passo 1: Conectar ao GitHub

1. No Lovable, clique em **GitHub** → **Connect to GitHub**
2. Autorize o Lovable GitHub App
3. Clique em **Create Repository**
4. Anote o nome do repositório criado

### Passo 2: Escolher Plataforma de Hospedagem

#### Opção A: Vercel (Recomendado para React)

1. Acesse [vercel.com](https://vercel.com)
2. Clique em **Add New** → **Project**
3. Importe seu repositório GitHub
4. Configure:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

5. **Adicione as Variáveis de Ambiente:**
   ```
   VITE_SUPABASE_URL=https://bupbucfdisqedteazifs.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1cGJ1Y2ZkaXNxZWR0ZWF6aWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NTkzOTUsImV4cCI6MjA3ODUzNTM5NX0.SiVZWcU8N5NaIvWA5REzkcjm5UzQvoP6LPpLwG4vBc8
   VITE_SUPABASE_PROJECT_ID=bupbucfdisqedteazifs
   ```

6. Clique em **Deploy**

#### Opção B: Netlify

1. Acesse [netlify.com](https://netlify.com)
2. **Add new site** → **Import from Git**
3. Conecte seu repositório GitHub
4. Configure:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`

5. **Environment Variables:**
   - Vá em Site settings → Environment variables
   - Adicione as mesmas variáveis do Vercel acima

6. Clique em **Deploy site**

#### Opção C: AWS Amplify

1. Acesse AWS Console → Amplify
2. **New app** → **Host web app**
3. Conecte repositório GitHub
4. Configure build settings:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm install
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: dist
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```

5. Adicione variáveis de ambiente na console

### Passo 3: Verificar Funcionamento

✅ **Checklist:**
- [ ] Site carrega corretamente
- [ ] Login funciona
- [ ] Produtos aparecem
- [ ] Carrinho funciona
- [ ] Checkout funciona
- [ ] Upload de avatar funciona
- [ ] Painel admin funciona (se você for admin)

### Passo 4: Configurar Domínio (Opcional)

**Na Vercel/Netlify:**
1. Vá em Settings → Domains
2. Adicione seu domínio customizado
3. Configure DNS conforme instruções

---

## Cenário 2: Migração Completa (Frontend + Backend)

### Fase 1: Criar Novo Projeto Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Crie uma conta (se não tiver)
3. **New Project**:
   - Nome: `nebula-vape-production`
   - Database Password: (anote com segurança!)
   - Region: South America (São Paulo) - mais próximo do Brasil
   - Pricing Plan: Free ou Pro (conforme necessidade)

4. Aguarde 2-3 minutos para o projeto ser criado

### Fase 2: Recriar Estrutura do Banco

#### 1. Executar Migrations

1. No Supabase Dashboard → SQL Editor
2. Abra cada arquivo de migration em `supabase/migrations/` **na ordem**
3. Execute um por um:

```sql
-- Ordem de execução (do mais antigo para o mais recente)
-- Copie e execute o conteúdo de cada arquivo
```

**⚠️ IMPORTANTE:** Execute na ordem cronológica (nome do arquivo)!

#### 2. Verificar Estrutura

No Supabase Dashboard → Table Editor, verifique se todas as tabelas foram criadas:
- ✅ profiles
- ✅ products
- ✅ flavors
- ✅ categories
- ✅ orders
- ✅ order_items
- ✅ reviews
- ✅ review_responses
- ✅ banners
- ✅ discounts
- ✅ discount_usage
- ✅ shipping_rates
- ✅ user_roles
- ✅ user_activity_logs
- ✅ mfa_backup_codes
- ✅ security_questions
- ✅ account_recovery_tokens
- ✅ settings

### Fase 3: Importar Dados

#### Via SQL Editor (Recomendado para volumes pequenos)

```sql
-- Exemplo: Importar produtos
INSERT INTO products (id, name, category, price, stock, image, description)
VALUES 
  ('uuid-1', 'Pod 1', 'Pods', 50.00, 100, 'url', 'Descrição'),
  ('uuid-2', 'Pod 2', 'Pods', 45.00, 50, 'url', 'Descrição');
```

#### Via CSV Import (Para volumes grandes)

1. Supabase Dashboard → Table Editor
2. Selecione a tabela
3. Clique em **Insert** → **Import from CSV**
4. Faça upload do CSV exportado

**⚠️ ORDEM DE IMPORTAÇÃO (importante para foreign keys):**
1. `categories` (independente)
2. `products` (depende de categories)
3. `flavors` (depende de products)
4. `profiles` (independente, mas precisa existir antes de orders)
5. `user_roles` (depende de profiles)
6. `orders` (depende de profiles)
7. `order_items` (depende de orders e products)
8. `reviews` (depende de products e profiles)
9. `review_responses` (depende de reviews)
10. `banners` (independente)
11. `discounts` (independente)
12. `discount_usage` (depende de discounts, orders, profiles)
13. `shipping_rates` (independente)
14. `settings` (independente)
15. `user_activity_logs` (depende de profiles)
16. `mfa_backup_codes` (depende de profiles)
17. `security_questions` (depende de profiles)

### Fase 4: Recriar Storage Buckets

1. Supabase Dashboard → Storage
2. **Create bucket** → `avatars`
   - Public: ✅ Yes
3. **Create bucket** → `banners`
   - Public: ✅ Yes

#### Configurar RLS Policies do Storage

No SQL Editor:

```sql
-- Policies para bucket avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policies para bucket banners
CREATE POLICY "Banner images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'banners');

CREATE POLICY "Admins can upload banners"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'banners'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can update banners"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'banners'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete banners"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'banners'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);
```

#### Fazer Upload dos Arquivos

**Via Interface:**
1. Storage → avatars → Upload files
2. Faça upload dos avatares salvos anteriormente

**Via Script (Node.js):**
```javascript
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  'SUA_NOVA_URL',
  'SUA_NOVA_SERVICE_ROLE_KEY' // Pegar no dashboard Settings → API
);

async function uploadFiles() {
  const files = fs.readdirSync('./backup-avatars');
  
  for (const file of files) {
    const fileBuffer = fs.readFileSync(path.join('./backup-avatars', file));
    
    const { error } = await supabase.storage
      .from('avatars')
      .upload(file, fileBuffer);
      
    if (error) console.error(`Error uploading ${file}:`, error);
    else console.log(`Uploaded ${file}`);
  }
}

uploadFiles();
```

### Fase 5: Migrar Edge Function (create-order)

1. Supabase Dashboard → Edge Functions
2. **New Function** → `create-order`
3. Copie o código de `supabase/functions/create-order/index.ts`
4. **Deploy**

**Ou via CLI (recomendado):**

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link ao projeto
supabase link --project-ref SEU_PROJECT_REF

# Deploy edge function
supabase functions deploy create-order
```

### Fase 6: Configurar Autenticação

1. Supabase Dashboard → Authentication → Settings
2. **Email Auth:**
   - Enable Email provider: ✅
   - Confirm email: ❌ (para testes) ou ✅ (para produção)
   - **Redirect URLs:** Adicione a URL do seu site

3. **URL Configuration:**
   - Site URL: `https://seu-dominio.com`
   - Redirect URLs: `https://seu-dominio.com/**`

### Fase 7: Atualizar Código

#### 1. Obter Novas Credenciais

No Supabase Dashboard → Settings → API:
- `Project URL` - Será seu novo `VITE_SUPABASE_URL`
- `anon/public key` - Será seu novo `VITE_SUPABASE_PUBLISHABLE_KEY`
- `Project Reference ID` - Será seu novo `VITE_SUPABASE_PROJECT_ID`

#### 2. Criar arquivo .env.local (para desenvolvimento)

```env
VITE_SUPABASE_URL=https://seu-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...sua-nova-chave
VITE_SUPABASE_PROJECT_ID=seu-project-ref
```

#### 3. Configurar no GitHub

1. Vá no repositório GitHub → Settings → Secrets and variables → Actions
2. Adicione secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`

#### 4. Configurar na Vercel/Netlify

Adicione as mesmas variáveis nas configurações de ambiente da plataforma.

### Fase 8: Testar Migração Localmente

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/seu-repo.git
cd seu-repo

# Instalar dependências
npm install

# Criar .env.local com novas credenciais
echo "VITE_SUPABASE_URL=https://seu-project.supabase.co" > .env.local
echo "VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave" >> .env.local
echo "VITE_SUPABASE_PROJECT_ID=seu-project-ref" >> .env.local

# Rodar localmente
npm run dev
```

**Testes Críticos:**
- [ ] Login com usuário existente funciona
- [ ] Criar novo usuário funciona
- [ ] Produtos aparecem
- [ ] Fazer pedido funciona
- [ ] Upload de avatar funciona
- [ ] Admin consegue gerenciar produtos

### Fase 9: Deploy Final

1. Commit e push das mudanças (se houver)
2. Deploy na Vercel/Netlify com novas env vars
3. Testar tudo em produção

---

## Checklist Final

### Validação Completa

#### Funcionalidades Públicas
- [ ] Site carrega
- [ ] Produtos listam corretamente
- [ ] Busca de produtos funciona
- [ ] Filtros de categoria funcionam
- [ ] Visualizar detalhes do produto
- [ ] Reviews aparecem
- [ ] Banners rodam

#### Autenticação
- [ ] Signup com email/senha
- [ ] Login com email/senha
- [ ] Logout funciona
- [ ] Recuperação de senha
- [ ] MFA funciona (se habilitado)

#### Usuário Logado
- [ ] Ver perfil
- [ ] Editar perfil
- [ ] Upload de foto de perfil
- [ ] Ver meus pedidos
- [ ] Fazer novo pedido
- [ ] Aplicar cupom de desconto
- [ ] Deixar review
- [ ] Editar minha review
- [ ] Ver logs de atividade

#### Admin (se você tiver role admin)
- [ ] Acessar painel admin
- [ ] Gerenciar produtos (criar, editar, deletar)
- [ ] Gerenciar sabores
- [ ] Gerenciar categorias
- [ ] Gerenciar pedidos
- [ ] Gerenciar banners
- [ ] Gerenciar cupons
- [ ] Gerenciar taxas de frete
- [ ] Responder reviews
- [ ] Ver estatísticas

#### Performance e Segurança
- [ ] Imagens carregam corretamente
- [ ] Site responsivo (mobile, tablet, desktop)
- [ ] RLS policies funcionando (usuários só veem seus dados)
- [ ] Edge functions respondendo
- [ ] SSL/HTTPS funcionando
- [ ] Não há erros no console

---

## Troubleshooting

### Problema: "Invalid JWT token"

**Causa:** Chave do Supabase incorreta ou usuários não migrados.

**Solução:**
1. Verifique as variáveis de ambiente
2. Limpe o localStorage: `localStorage.clear()` no console
3. Faça login novamente

### Problema: "relation does not exist"

**Causa:** Tabela não foi criada ou migration não executou.

**Solução:**
1. Verifique se todas as migrations foram executadas na ordem
2. No SQL Editor, execute: `\dt` para listar tabelas
3. Re-execute a migration que criava essa tabela

### Problema: "new row violates row-level security policy"

**Causa:** RLS policies muito restritivas ou não configuradas corretamente.

**Solução:**
1. Verifique as policies da tabela no Dashboard → Table Editor → [tabela] → Policies
2. Certifique-se de ter executado todas as migrations que criam policies
3. Teste com um usuário que tenha as permissões corretas

### Problema: Imagens não aparecem

**Causa:** Storage buckets não configurados ou arquivos não migrados.

**Solução:**
1. Verifique se buckets `avatars` e `banners` existem
2. Verifique se são públicos
3. Verifique se as policies de SELECT estão configuradas
4. Re-faça upload das imagens

### Problema: Edge function não funciona

**Causa:** Function não deployada ou configuração incorreta.

**Solução:**
1. Re-deploy da function: `supabase functions deploy create-order`
2. Verifique logs: Supabase Dashboard → Edge Functions → create-order → Logs
3. Verifique se a function tem as permissões corretas

### Problema: Usuários não conseguem fazer login

**Causa:** Auth não configurado corretamente ou dados de usuários não migrados.

**Solução:**
1. Dashboard → Authentication → Configuration
2. Verifique se Email provider está habilitado
3. Verifique Redirect URLs
4. **IMPORTANTE:** Senhas de usuários NÃO podem ser migradas (hash incompatível)
5. Opção 1: Pedir para usuários resetarem senha
6. Opção 2: Usuários precisarão se cadastrar novamente

### Problema: Site funciona local mas não em produção

**Causa:** Variáveis de ambiente não configuradas na hospedagem.

**Solução:**
1. Vercel/Netlify → Settings → Environment Variables
2. Confirme que TODAS as 3 variáveis estão lá
3. Re-deploy da aplicação
4. Limpe o cache do navegador

---

## 🎯 Dicas Finais

### Minimizar Downtime

Se você tem usuários ativos:

1. **Faça a migração em etapas:**
   - Fase 1: Configure tudo no novo Supabase (sem apontar o site)
   - Fase 2: Migre dados durante horário de baixo tráfego
   - Fase 3: Atualize DNS/variáveis e faça deploy
   - Downtime: 5-15 minutos

2. **Mantenha o Lovable Cloud como backup:**
   - Não delete o projeto Lovable imediatamente
   - Guarde as credenciais antigas por 30 dias
   - Se algo der errado, você pode reverter rapidamente

3. **Teste em staging primeiro:**
   - Crie um projeto Supabase de teste
   - Faça a migração completa lá primeiro
   - Só migre produção depois de validar

### Backup de Segurança

Antes de qualquer mudança:

```bash
# Backup completo
mkdir migration-backup-$(date +%Y%m%d)
cd migration-backup-*/

# Copiar migrations
cp -r ../supabase/ ./

# Anotar credenciais atuais
echo "VITE_SUPABASE_URL=https://bupbucfdisqedteazifs.supabase.co" > old-env.txt
echo "VITE_SUPABASE_PUBLISHABLE_KEY=..." >> old-env.txt
echo "VITE_SUPABASE_PROJECT_ID=bupbucfdisqedteazifs" >> old-env.txt

# Exportar dados (via interface ou SQL dump)
```

### Custos Estimados

**Lovable Cloud:** Incluído no plano Lovable

**Supabase Próprio:**
- Free tier: 500MB database, 1GB storage, 2GB transfer
- Pro: $25/mês - 8GB database, 100GB storage, 250GB transfer
- **Estimativa para e-commerce pequeno:** Free tier suficiente inicialmente

**Hospedagem Frontend:**
- Vercel: Free tier geralmente suficiente
- Netlify: Free tier geralmente suficiente
- AWS Amplify: ~$0.01/build + $0.15/GB servido

---

## 📞 Suporte

Se encontrar problemas durante a migração:

1. **Documentação Oficial:**
   - Supabase: https://supabase.com/docs
   - Vercel: https://vercel.com/docs
   - Netlify: https://docs.netlify.com

2. **Comunidades:**
   - Supabase Discord: https://discord.supabase.com
   - Lovable Discord: [link da comunidade]

3. **Logs e Debugging:**
   - Console do navegador (F12)
   - Supabase Dashboard → Logs
   - Vercel/Netlify → Deployment logs

---

**Última atualização:** Novembro 2025  
**Versão do projeto:** 1.0  
**Status:** Pronto para migração quando necessário

**⚠️ LEMBRE-SE:** Sempre faça backup antes de qualquer migração!
