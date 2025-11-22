# 🚀 Deploy no Hostgator - Guia Rápido

Este guia ensina como hospedar o **frontend** no Hostgator mantendo o **backend no Lovable Cloud**.

## ✅ Vantagens desta Abordagem

- Zero configuração de backend necessária
- Backend gerenciado pelo Lovable (banco de dados, autenticação, edge functions)
- Frontend no seu servidor preferido com domínio customizado
- Código 100% idêntico, sem alterações

---

## 📋 Pré-requisitos

- Conta ativa no Hostgator
- Acesso ao cPanel
- Node.js instalado no computador (para fazer o build)
- Acesso FTP (opcional, mas recomendado)

---

## 🚀 Deploy Rápido (5 passos)

### 1. Fazer Build do Projeto

```bash
# Instalar dependências (se ainda não instalou)
npm install

# Fazer build para produção
npm run build
```

Ou use o script automatizado:

```bash
chmod +x deploy-hostgator.sh
./deploy-hostgator.sh
```

Isso vai criar:
- Pasta `dist/` com os arquivos otimizados
- Arquivo `dist-deploy.zip` (se usar o script)
- Arquivo `.htaccess` dentro de `dist/`

### 2. Acessar cPanel do Hostgator

1. Acesse `https://seudominio.com.br:2083`
2. Faça login com suas credenciais
3. Procure por **File Manager**

### 3. Limpar public_html

1. Navegue até a pasta `public_html`
2. Selecione **TODOS** os arquivos
3. Clique em **Delete** (faça backup se houver algo importante!)

### 4. Upload dos Arquivos

**Método A - Upload do ZIP (mais rápido):**

1. Clique em **Upload** no cPanel File Manager
2. Selecione o arquivo `dist-deploy.zip`
3. Aguarde o upload completar
4. Volte para File Manager
5. Clique com botão direito no `dist-deploy.zip` → **Extract**
6. Delete o arquivo `dist-deploy.zip`

**Método B - Upload via FTP (mais confiável):**

1. Abra FileZilla ou outro cliente FTP
2. Conecte ao Hostgator:
   - Host: `ftp.seudominio.com.br`
   - Usuário: (fornecido pelo Hostgator)
   - Senha: (fornecido pelo Hostgator)
   - Porta: 21
3. Navegue até `public_html`
4. Arraste **TODOS** os arquivos da pasta `dist` local para `public_html`

### 5. Configurar SSL

1. cPanel → **SSL/TLS Status**
2. Marque seu domínio
3. Clique em **Run AutoSSL**
4. Aguarde 1-2 minutos

---

## ✅ Verificar se Funcionou

Acesse `https://seudominio.com.br` e teste:

- [ ] Site abre sem erros
- [ ] Login funciona
- [ ] Produtos aparecem
- [ ] Imagens carregam
- [ ] Carrinho funciona
- [ ] Checkout funciona
- [ ] Painel admin funciona (se você é admin)
- [ ] Navegação entre páginas funciona (não dá 404)

**Se algum item falhar, veja a seção de Troubleshooting abaixo.**

---

## 🔧 Configuração Avançada

### Usar Domínio Personalizado (nebulavape.com.br)

Se seu domínio for `nebulavape.com.br`:

1. Aponte o domínio para o Hostgator (configurar DNS no registro.br ou onde comprou)
2. No cPanel → **Domains**
3. Adicione `nebulavape.com.br` como domínio principal ou addon domain
4. Configure SSL para esse domínio

### Configurar Subdomínio

Para criar `app.nebulavape.com.br`:

1. cPanel → **Subdomains**
2. **Create a Subdomain:** `app`
3. Document Root: `/public_html/app`
4. Faça upload dos arquivos para `/public_html/app`
5. Configure SSL para o subdomínio

---

## 🔄 Atualizar o Site

Quando fizer mudanças no código:

```bash
# 1. Fazer as alterações no código
# 2. Build novamente
npm run build

# 3. Upload dos novos arquivos
# Método A: Use o script
./deploy-hostgator.sh

# Método B: Upload manual via FTP (apenas arquivos alterados)
```

---

## 🐛 Troubleshooting

### Erro 500 Internal Server Error

**Causa:** Problema com `.htaccess`

**Solução:**
1. Verifique se o `.htaccess` foi enviado (ele pode estar oculto)
2. Verifique permissões:
   - Arquivos: 644
   - Pastas: 755
3. cPanel → **Error Log** para ver detalhes

Para alterar permissões:
```bash
# Via FTP ou cPanel File Manager
# Clique com direito no arquivo → Change Permissions
```

### Site mostra 404 nas páginas internas

**Causa:** `.htaccess` não está funcionando ou não existe

**Solução:**
1. Verifique se o arquivo `.htaccess` está em `public_html`
2. Se não estiver, copie o conteúdo de `.htaccess.example` do projeto
3. Crie um novo arquivo `.htaccess` no cPanel e cole o conteúdo

### Imagens não carregam

**Causa:** Pasta `assets` não foi enviada ou permissões incorretas

**Solução:**
1. Verifique se a pasta `assets` está em `public_html`
2. Ajuste permissões para 755 (pastas) e 644 (arquivos)
3. Limpe o cache do navegador (Ctrl + Shift + R)

### Login não funciona / Produtos não aparecem

**Causa:** Variáveis de ambiente não foram configuradas antes do build

**Solução:**
1. Verifique se o arquivo `.env.production` existe na raiz do projeto
2. Conteúdo deve ser:
   ```env
   VITE_SUPABASE_URL=https://bupbucfdisqedteazifs.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1cGJ1Y2ZkaXNxZWR0ZWF6aWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NTkzOTUsImV4cCI6MjA3ODUzNTM5NX0.SiVZWcU8N5NaIvWA5REzkcjm5UzQvoP6LPpLwG4vBc8
   VITE_SUPABASE_PROJECT_ID=bupbucfdisqedteazifs
   ```
3. Refaça o build: `npm run build`
4. Re-upload dos arquivos

### Site muito lento

**Causa:** Cache não configurado ou imagens não otimizadas

**Solução:**
1. Verifique se o `.htaccess` tem as configurações de cache
2. Use o `.htaccess.example` fornecido no projeto
3. Considere usar Cloudflare (CDN gratuito)
4. Habilite compressão Gzip (já está no `.htaccess`)

### Não consigo acessar cPanel

**Causa:** URL ou credenciais incorretas

**Solução:**
1. URL do cPanel geralmente é: `https://seudominio.com.br:2083`
2. Verifique credenciais no email de boas-vindas do Hostgator
3. Entre em contato com suporte do Hostgator se necessário

---

## 📁 Estrutura de Arquivos no Hostgator

Após o deploy, seu `public_html` deve estar assim:

```
public_html/
├── .htaccess          ← Configuração do servidor
├── index.html         ← Página principal
├── favicon.ico        ← Ícone do site
├── assets/            ← CSS, JS, imagens
│   ├── index-xxx.js
│   ├── index-xxx.css
│   └── ...
└── robots.txt         ← SEO
```

---

## 🔐 Segurança

O `.htaccess` fornecido já inclui:

- ✅ Proteção contra clickjacking
- ✅ Proteção XSS
- ✅ Desabilita listagem de diretórios
- ✅ Protege arquivos sensíveis (.env, .json)

**IMPORTANTE:** As credenciais do Lovable Cloud (URL e chave pública) são **seguras para ficar no código compilado** porque são chaves públicas. A segurança real está nas RLS policies do banco de dados.

---

## 💰 Custos

- **Frontend (Hostgator):** Conforme seu plano atual
- **Backend (Lovable Cloud):** Incluído no plano Lovable

---

## 🆘 Suporte

**Problemas com Hostgator:**
- Suporte Hostgator: https://www.hostgator.com.br/suporte
- Chat ao vivo disponível 24/7

**Problemas com o código:**
- Verifique o console do navegador (F12)
- Verifique os logs de erro no cPanel

**Problemas com backend (Lovable Cloud):**
- Continue usando normalmente, o backend está no Lovable

---

## 📚 Recursos Adicionais

- [Documentação do Hostgator](https://www.hostgator.com.br/ajuda)
- [Como usar FileZilla](https://www.hostgator.com.br/ajuda/artigo/filezilla-configuracao-e-uso)
- [Configurar SSL no Hostgator](https://www.hostgator.com.br/ajuda/artigo/ssl-gratis)

---

**Última atualização:** Novembro 2025  
**Versão:** 1.0

💡 **Dica:** Mantenha uma cópia local dos arquivos deployados para saber o que foi alterado entre versões!
