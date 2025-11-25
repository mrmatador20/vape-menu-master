import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface FailedAuthEmailProps {
  userEmail: string;
  attemptCount: number;
  timestamp: string;
  ipAddress: string;
}

export const FailedAuthEmail = ({
  userEmail,
  attemptCount,
  timestamp,
  ipAddress,
}: FailedAuthEmailProps) => (
  <Html>
    <Head />
    <Preview>Múltiplas falhas de autenticação detectadas em sua conta</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🔒 Alerta de Falha de Autenticação</Heading>
        <Text style={text}>
          Sua conta sofreu múltiplas tentativas de login falhadas recentemente.
        </Text>
        <Container style={detailsContainer}>
          <Text style={detailsText}><strong>E-mail:</strong> {userEmail}</Text>
          <Text style={detailsText}><strong>Tentativas:</strong> {attemptCount}</Text>
          <Text style={detailsText}><strong>IP:</strong> {ipAddress}</Text>
          <Text style={detailsText}><strong>Última tentativa:</strong> {timestamp}</Text>
        </Container>
        <Text style={warningText}>
          Caso não tenha sido você, recomendamos a alteração de sua senha imediatamente 
          para garantir a segurança de sua conta.
        </Text>
        <Text style={footer}>
          Se você reconhece estas tentativas de login, pode ignorar este e-mail.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default FailedAuthEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  borderRadius: '8px',
  maxWidth: '600px',
};

const h1 = {
  color: '#d97706',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  padding: '0 48px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
  padding: '0 48px',
};

const detailsContainer = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  margin: '24px 48px',
  padding: '16px',
};

const detailsText = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '4px 0',
};

const warningText = {
  color: '#d97706',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '24px 0',
  padding: '0 48px',
  fontWeight: '600',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '24px 0',
  padding: '0 48px',
};