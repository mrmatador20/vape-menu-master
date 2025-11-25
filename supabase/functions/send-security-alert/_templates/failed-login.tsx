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

interface FailedLoginEmailProps {
  userName: string;
  attemptCount: number;
  ipAddress: string;
  timestamp: string;
}

export const FailedLoginEmail = ({
  userName,
  attemptCount,
  ipAddress,
  timestamp,
}: FailedLoginEmailProps) => (
  <Html>
    <Head />
    <Preview>Múltiplas tentativas falhas de login detectadas</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🔒 Alerta de Segurança</Heading>
        <Text style={text}>
          Olá {userName},
        </Text>
        <Text style={text}>
          Detectamos <strong>{attemptCount} tentativas falhas</strong> de login em sua conta.
        </Text>
        <Container style={codeBox}>
          <Text style={infoLabel}>Endereço IP:</Text>
          <Text style={infoValue}>{ipAddress}</Text>
          <Text style={infoLabel}>Data/Hora:</Text>
          <Text style={infoValue}>{timestamp}</Text>
          <Text style={infoLabel}>Número de tentativas:</Text>
          <Text style={infoValue}>{attemptCount}</Text>
        </Container>
        <Text style={text}>
          <strong>Se foi você:</strong> Verifique suas credenciais e tente novamente. Certifique-se de estar usando a senha correta.
        </Text>
        <Text style={text}>
          <strong>Se não foi você:</strong> Sua conta pode estar sob ataque. Recomendamos alterar sua senha imediatamente e ativar a autenticação de dois fatores.
        </Text>
        <Text style={{...text, color: '#dc2626', fontWeight: 'bold'}}>
          ⚠️ Após 3 tentativas falhas consecutivas, sua conta será bloqueada por 15 minutos por segurança.
        </Text>
        <Text style={footer}>
          Este é um e-mail automático de segurança. Por favor, não responda a esta mensagem.
          <br />
          Se você precisa de ajuda para acessar sua conta, entre em contato com nosso suporte.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default FailedLoginEmail;

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
  color: '#ea580c',
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
