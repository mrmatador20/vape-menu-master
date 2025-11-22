#!/bin/bash

# Script de deploy para Hostgator
# Uso: ./deploy-hostgator.sh

echo "🚀 Iniciando deploy para Hostgator..."
echo ""

# 1. Verificar se .env.production existe
if [ ! -f ".env.production" ]; then
  echo "⚠️  Arquivo .env.production não encontrado!"
  echo ""
  echo "Criando .env.production com as variáveis do Lovable Cloud..."
  cat > .env.production << 'EOF'
VITE_SUPABASE_URL=https://bupbucfdisqedteazifs.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1cGJ1Y2ZkaXNxZWR0ZWF6aWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NTkzOTUsImV4cCI6MjA3ODUzNTM5NX0.SiVZWcU8N5NaIvWA5REzkcjm5UzQvoP6LPpLwG4vBc8
VITE_SUPABASE_PROJECT_ID=bupbucfdisqedteazifs
EOF
  echo "✅ Arquivo .env.production criado!"
  echo ""
fi

# 2. Build do projeto
echo "📦 Fazendo build do projeto..."
npm run build

if [ $? -ne 0 ]; then
  echo "❌ Erro no build! Verifique os erros acima."
  exit 1
fi

echo "✅ Build concluído!"
echo ""

# 3. Criar .htaccess na dist
echo "⚙️  Criando .htaccess para React Router..."
cat > dist/.htaccess << 'EOF'
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  
  # Se o arquivo ou diretório existir, servir diretamente
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  
  # Caso contrário, redirecionar para index.html
  RewriteRule . /index.html [L]
</IfModule>

# Habilitar compressão Gzip
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Cache de arquivos estáticos
<IfModule mod_expires.c>
  ExpiresActive On
  
  # Imagens
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  
  # CSS e JavaScript
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  
  # Fontes
  ExpiresByType font/ttf "access plus 1 year"
  ExpiresByType font/otf "access plus 1 year"
  ExpiresByType font/woff "access plus 1 year"
  ExpiresByType font/woff2 "access plus 1 year"
  
  # HTML (não fazer cache para ter atualizações rápidas)
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>

# Segurança adicional
<IfModule mod_headers.c>
  # Prevenir clickjacking
  Header always set X-Frame-Options "SAMEORIGIN"
  
  # Prevenir MIME type sniffing
  Header always set X-Content-Type-Options "nosniff"
  
  # XSS Protection
  Header always set X-XSS-Protection "1; mode=block"
  
  # Referrer Policy
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
EOF

echo "✅ .htaccess criado!"
echo ""

# 4. Compactar arquivos
echo "📦 Compactando arquivos para upload..."
cd dist
zip -r -q ../dist-deploy.zip .
cd ..

echo "✅ Arquivos compactados em dist-deploy.zip"
echo ""

# 5. Exibir tamanho do arquivo
FILE_SIZE=$(du -h dist-deploy.zip | cut -f1)
echo "📊 Tamanho do arquivo: $FILE_SIZE"
echo ""

# 6. Instruções finais
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ BUILD COMPLETO! Arquivo pronto: dist-deploy.zip"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📤 PRÓXIMOS PASSOS PARA HOSTGATOR:"
echo ""
echo "   MÉTODO 1 - Via cPanel (Recomendado):"
echo "   1. Acesse cPanel do Hostgator"
echo "   2. File Manager → public_html"
echo "   3. Delete TUDO que estiver em public_html"
echo "   4. Upload do arquivo dist-deploy.zip"
echo "   5. Clique com botão direito → Extract"
echo "   6. Delete o dist-deploy.zip após extrair"
echo ""
echo "   MÉTODO 2 - Via FTP (FileZilla):"
echo "   1. Conecte ao FTP do Hostgator"
echo "   2. Navegue até public_html"
echo "   3. Delete TUDO que estiver lá"
echo "   4. Arraste TODOS os arquivos da pasta 'dist' para public_html"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🔗 Depois do upload, acesse: https://seudominio.com.br"
echo ""
echo "⚠️  IMPORTANTE: O backend continua no Lovable Cloud!"
echo "   Você só está hospedando o frontend no Hostgator."
echo ""
