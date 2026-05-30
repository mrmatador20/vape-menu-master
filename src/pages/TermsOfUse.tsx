import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { usePageMeta } from '@/hooks/usePageMeta';

const TermsOfUse = () => {
  usePageMeta({
    title: 'Termos de Uso - Fox Velour',
    description: 'Termos e condições para uso da plataforma Fox Velour.',
    path: '/terms-of-use',
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto max-w-3xl px-4 py-10 prose prose-sm dark:prose-invert">
        <h1>Termos de Uso</h1>
        <p><strong>Última atualização:</strong> 30 de maio de 2026 · <strong>Versão 1.0</strong></p>

        <h2>1. Aceitação</h2>
        <p>
          Ao criar uma conta ou realizar um pedido na <strong>Fox Velour</strong>, você declara ter no
          mínimo 18 anos e concorda integralmente com estes Termos e com a{' '}
          <a href="/privacy-policy">Política de Privacidade</a>.
        </p>

        <h2>2. Cadastro</h2>
        <ul>
          <li>Informações verídicas, completas e atualizadas;</li>
          <li>Senha pessoal e intransferível — não a compartilhe;</li>
          <li>Você é responsável por todas as atividades realizadas com sua conta;</li>
          <li>Reservamo-nos o direito de suspender contas com indícios de fraude.</li>
        </ul>

        <h2>3. Pedidos e pagamento</h2>
        <ul>
          <li>Aceitamos PIX (AbacatePay/MercadoPago) e dinheiro na entrega;</li>
          <li>Pedidos só são confirmados após compensação do pagamento;</li>
          <li>Preços e estoque podem ser alterados a qualquer momento, exceto para pedidos já confirmados;</li>
          <li>O frete é calculado por CEP conforme tabela vigente.</li>
        </ul>

        <h2>4. Entrega</h2>
        <p>Entregamos no endereço cadastrado. Atrasos por terceiros (transportadora, indisponibilidade) não geram multa, mas serão comunicados.</p>

        <h2>5. Direito de arrependimento</h2>
        <p>
          Compras realizadas fora do estabelecimento físico podem ser canceladas em até 7 dias após o
          recebimento (Art. 49 do CDC). Solicite por <a href="mailto:foxvelour@gmail.com">foxvelour@gmail.com</a>.
        </p>

        <h2>6. Uso aceitável</h2>
        <p>É proibido:</p>
        <ul>
          <li>Acessar áreas restritas sem autorização;</li>
          <li>Tentativas de engenharia reversa, scraping abusivo ou ataques (XSS, SQLi, brute force);</li>
          <li>Uso de cupons de forma fraudulenta ou compartilhamento indevido;</li>
          <li>Publicar avaliações falsas ou difamatórias.</li>
        </ul>

        <h2>7. Programa de indicação</h2>
        <p>
          O sistema de pontos por indicação é regido por regras próprias definidas na
          área <a href="/affiliate">Indique e Ganhe</a>. Pontos não têm valor monetário e podem expirar.
        </p>

        <h2>8. Propriedade intelectual</h2>
        <p>Conteúdo, marca, layout e código são de propriedade da Fox Velour. Reprodução não autorizada é proibida.</p>

        <h2>9. Limitação de responsabilidade</h2>
        <p>Não respondemos por: indisponibilidade temporária do serviço, uso indevido da conta pelo titular, ou prejuízos indiretos.</p>

        <h2>10. Encerramento</h2>
        <p>Você pode encerrar sua conta a qualquer momento pela página <a href="/data-rights">Direitos do Titular</a>.</p>

        <h2>11. Foro</h2>
        <p>Fica eleito o foro da comarca de Cuité/PB, com renúncia a qualquer outro, por mais privilegiado que seja.</p>

        <h2>12. Contato</h2>
        <p>Dúvidas: <a href="mailto:foxvelour@gmail.com">foxvelour@gmail.com</a>.</p>
      </main>
      <Footer />
    </div>
  );
};

export default TermsOfUse;
