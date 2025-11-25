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

interface PasswordChangedEmailProps {
  userName: string;
  timestamp: string;
  ipAddress: string;
}

export const PasswordChangedEmail = ({
  userName,
  timestamp,
  ipAddress,
}: PasswordChangedEmailProps) => (
  <Html>
    <Head />
    <Preview>Sua senha foi alterada com sucesso</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>✅ Senha Alterada</Heading>
        <Text style={text}>
          Olá {userName},
        </Text>
        <Text style={text}>
          Sua senha foi alterada com sucesso.
        </Text>
        <Container style={codeBox}>
          <Text style={infoLabel}>Data/Hora:</Text>
          <Text style={infoValue}>{timestamp}</Text>
          <Text style={infoLabel}>Endereço IP:</Text>
          <Text style={infoValue}>{ipAddress}</Text>
        </Container>
        <Text style={text}>
          <strong>Se foi você:</strong> Sua conta está segura. Você pode fazer login com sua nova senha.
        </Text>
        <Text style={{...text, color: '#dc2626', fontWeight: 'bold'}}>
          ⚠️ Se NÃO foi você que alterou a senha:
        </Text>
        <Text style={text}>
          Entre em contato com nosso suporte IMEDIATAMENTE. Sua conta pode ter sido comprometida.
          Nosso time ajudará você a recuperar o acesso e proteger sua conta.
        </Text>
        <Text style={footer}>
          Este é um e-mail automático de segurança. Por favor, não responda a esta mensagem.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default PasswordChangedEmail;

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
  color: '#059669',
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
