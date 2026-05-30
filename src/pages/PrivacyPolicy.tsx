import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { usePageMeta } from '@/hooks/usePageMeta';

const PrivacyPolicy = () => {
  usePageMeta({
    title: 'Política de Privacidade - Fox Velour',
    description: 'Como a Fox Velour coleta, utiliza e protege seus dados pessoais conforme a LGPD.',
    path: '/privacy-policy',
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto max-w-3xl px-4 py-10 prose prose-sm dark:prose-invert">
        <h1>Política de Privacidade</h1>
        <p><strong>Última atualização:</strong> 30 de maio de 2026 · <strong>Versão 1.0</strong></p>

        <h2>1. Controlador dos Dados</h2>
        <p>
          O controlador responsável pelo tratamento dos seus dados pessoais é{' '}
          <strong>Matheus Herminio Costa Cardoso</strong> (CPF 168.806.857-06), responsável pela loja
          <strong> Fox Velour</strong>, com sede em Cuité/PB. Contato:{' '}
          <a href="mailto:foxvelour@gmail.com">foxvelour@gmail.com</a>.
        </p>

        <h2>2. Quais dados coletamos e por quê</h2>
        <table>
          <thead><tr><th>Dado</th><th>Finalidade</th><th>Base Legal (LGPD)</th></tr></thead>
          <tbody>
            <tr><td>Nome completo</td><td>Identificação e entrega</td><td>Execução de contrato (Art. 7º, V)</td></tr>
            <tr><td>E-mail</td><td>Autenticação e comunicação sobre pedidos</td><td>Execução de contrato (Art. 7º, V)</td></tr>
            <tr><td>Senha (hash bcrypt)</td><td>Autenticação segura</td><td>Execução de contrato</td></tr>
            <tr><td>Telefone (opcional)</td><td>Notificações de segurança e contato sobre pedidos</td><td>Consentimento (Art. 7º, I)</td></tr>
            <tr><td>CPF</td><td>Pagamento via PIX</td><td>Execução de contrato + obrigação legal</td></tr>
            <tr><td>Endereço</td><td>Entrega dos produtos</td><td>Execução de contrato</td></tr>
            <tr><td>Data de nascimento</td><td>Verificação de idade</td><td>Obrigação legal (Art. 7º, II)</td></tr>
            <tr><td>Histórico de pedidos</td><td>Execução do contrato e obrigações fiscais</td><td>Execução de contrato + obrigação legal</td></tr>
            <tr><td>IP, dispositivo, logs</td><td>Prevenção a fraude e segurança</td><td>Legítimo interesse (Art. 7º, IX)</td></tr>
          </tbody>
        </table>

        <h2>3. Compartilhamento</h2>
        <p>Compartilhamos dados apenas com operadores estritamente necessários:</p>
        <ul>
          <li><strong>Provedores de pagamento</strong> (AbacatePay, MercadoPago) — para processar PIX;</li>
          <li><strong>Provedores de e-mail/SMS</strong> (Resend, Twilio) — para notificações;</li>
          <li><strong>Infraestrutura</strong> (Lovable Cloud / Supabase) — armazenamento criptografado;</li>
          <li><strong>Autoridades</strong> — quando exigido por lei.</li>
        </ul>
        <p>Nenhum dado é vendido a terceiros.</p>

        <h2>4. Seus direitos (Art. 18 da LGPD)</h2>
        <p>Você pode, a qualquer momento e gratuitamente:</p>
        <ul>
          <li>Confirmar a existência de tratamento e acessar seus dados;</li>
          <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
          <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários;</li>
          <li>Solicitar a portabilidade (exportação em JSON);</li>
          <li>Eliminar dados tratados com base no consentimento;</li>
          <li>Revogar consentimento;</li>
          <li>Peticionar à ANPD (<a href="https://www.gov.br/anpd" target="_blank" rel="noopener">gov.br/anpd</a>).</li>
        </ul>
        <p>
          Exerça seus direitos pela página <a href="/data-rights">Direitos do Titular</a> (logado) ou
          pelo e-mail <a href="mailto:foxvelour@gmail.com">foxvelour@gmail.com</a>. Respondemos em até
          15 dias.
        </p>

        <h2>5. Retenção</h2>
        <ul>
          <li>Dados de pedidos e fiscais: <strong>5 anos</strong> (obrigação legal — Art. 173 CTN);</li>
          <li>Logs de segurança: <strong>5 anos</strong> (limpeza automática);</li>
          <li>Conta inativa por solicitação: anonimizada em até 15 dias preservando obrigações legais.</li>
        </ul>

        <h2>6. Segurança</h2>
        <p>
          Aplicamos: TLS em trânsito, hash bcrypt de senhas, RLS no banco, 2FA opcional, registro
          imutável de logs, rate limiting, CSP com hashes SHA-256, sanitização contra XSS (DOMPurify)
          e verificação de senhas vazadas (HaveIBeenPwned).
        </p>

        <h2>7. Cookies</h2>
        <p>
          Usamos apenas cookies <strong>estritamente essenciais</strong> (sessão, carrinho, segurança).
          Não utilizamos cookies de analytics ou marketing nesta versão.
        </p>

        <h2>8. Crianças e adolescentes</h2>
        <p>O serviço é destinado a maiores de 18 anos. Coletamos data de nascimento para validar esta exigência.</p>

        <h2>9. Alterações</h2>
        <p>Mudanças relevantes serão comunicadas pelo e-mail cadastrado e nesta página.</p>

        <h2>10. Encarregado (DPO)</h2>
        <p>
          Encarregado pela proteção de dados: <strong>Matheus Herminio Costa Cardoso</strong> —{' '}
          <a href="mailto:foxvelour@gmail.com">foxvelour@gmail.com</a>.
        </p>
      </main>
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
