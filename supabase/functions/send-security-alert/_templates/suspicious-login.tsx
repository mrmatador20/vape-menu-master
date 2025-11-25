import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22';
import * as React from 'npm:react@18.3.1';

interface SuspiciousLoginEmailProps {
  userEmail: string;
  ipAddress: string;
  location: string;
  timestamp: string;
}

export const SuspiciousLoginEmail = ({
  userEmail,
  ipAddress,
  location,
  timestamp,
}: SuspiciousLoginEmailProps) => (
  <Html>
    <Head />
    <Preview>Detectamos uma tentativa de login suspeita em sua conta</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>⚠️ Alerta de Segurança</Heading>
        <Text style={text}>
          Detectamos uma tentativa de login suspeita em sua conta de um dispositivo ou localização incomum.
        </Text>
        <Container style={detailsContainer}>
          <Text style={detailsText}><strong>E-mail:</strong> {userEmail}</Text>
          <Text style={detailsText}><strong>IP:</strong> {ipAddress}</Text>
          <Text style={detailsText}><strong>Localização:</strong> {location}</Text>
          <Text style={detailsText}><strong>Data/Hora:</strong> {timestamp}</Text>
        </Container>
        <Text style={warningText}>
          Se não foi você quem tentou fazer login, recomendamos que você altere sua senha imediatamente 
          e revise os dispositivos confiáveis em sua conta.
        </Text>
        <Text style={footer}>
          Se você reconhece esta atividade, pode ignorar este e-mail com segurança.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default SuspiciousLoginEmail;

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
  color: '#dc2626',
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
  color: '#dc2626',
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