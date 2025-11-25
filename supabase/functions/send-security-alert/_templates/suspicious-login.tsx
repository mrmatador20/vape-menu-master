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
  userName: string;
  ipAddress: string;
  location?: string;
  timestamp: string;
}

export const SuspiciousLoginEmail = ({
  userName,
  ipAddress,
  location,
  timestamp,
}: SuspiciousLoginEmailProps) => (
  <Html>
    <Head />
    <Preview>Tentativa de login suspeita detectada em sua conta</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>⚠️ Atividade Suspeita Detectada</Heading>
        <Text style={text}>
          Olá {userName},
        </Text>
        <Text style={text}>
          Detectamos uma tentativa de login suspeita em sua conta de um dispositivo ou localização não habitual.
        </Text>
        <Container style={codeBox}>
          <Text style={infoLabel}>Endereço IP:</Text>
          <Text style={infoValue}>{ipAddress}</Text>
          {location && (
            <>
              <Text style={infoLabel}>Localização aproximada:</Text>
              <Text style={infoValue}>{location}</Text>
            </>
          )}
          <Text style={infoLabel}>Data/Hora:</Text>
          <Text style={infoValue}>{timestamp}</Text>
        </Container>
        <Text style={text}>
          <strong>Se foi você:</strong> Não é necessário fazer nada. Seu acesso está seguro.
        </Text>
        <Text style={text}>
          <strong>Se não foi você:</strong> Recomendamos que você altere sua senha imediatamente e ative a autenticação de dois fatores para proteger sua conta.
        </Text>
        <Text style={footer}>
          Este é um e-mail automático de segurança. Por favor, não responda a esta mensagem.
          <br />
          Se você não reconhece esta atividade, entre em contato com nosso suporte imediatamente.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default SuspiciousLoginEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const h1 = {
  color: '#dc2626',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 48px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
  padding: '0 48px',
};

const codeBox = {
  background: '#f4f4f4',
  borderRadius: '4px',
  margin: '24px 48px',
  padding: '24px',
};

const infoLabel = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '8px 0 4px',
};

const infoValue = {
  color: '#111827',
  fontSize: '16px',
  margin: '0 0 16px',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  margin: '32px 0',
  padding: '0 48px',
};
