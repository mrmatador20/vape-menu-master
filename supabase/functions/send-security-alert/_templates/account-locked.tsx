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

interface AccountLockedEmailProps {
  userName: string;
  lockDuration: string;
  timestamp: string;
  reason: string;
}

export const AccountLockedEmail = ({
  userName,
  lockDuration,
  timestamp,
  reason,
}: AccountLockedEmailProps) => (
  <Html>
    <Head />
    <Preview>Sua conta foi temporariamente bloqueada</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🔐 Conta Bloqueada Temporariamente</Heading>
        <Text style={text}>
          Olá {userName},
        </Text>
        <Text style={text}>
          Sua conta foi temporariamente bloqueada por motivos de segurança.
        </Text>
        <Container style={codeBox}>
          <Text style={infoLabel}>Motivo:</Text>
          <Text style={infoValue}>{reason}</Text>
          <Text style={infoLabel}>Duração do bloqueio:</Text>
          <Text style={infoValue}>{lockDuration}</Text>
          <Text style={infoLabel}>Data/Hora do bloqueio:</Text>
          <Text style={infoValue}>{timestamp}</Text>
        </Container>
        <Text style={text}>
          Por segurança, sua conta foi bloqueada temporariamente após múltiplas tentativas de acesso suspeitas.
        </Text>
        <Text style={text}>
          <strong>O que fazer agora:</strong>
        </Text>
        <Text style={text}>
          • Aguarde {lockDuration} para tentar fazer login novamente
          <br />
          • Certifique-se de usar suas credenciais corretas
          <br />
          • Considere ativar a autenticação de dois fatores
        </Text>
        <Text style={{...text, color: '#dc2626', fontWeight: 'bold'}}>
          ⚠️ Se você não tentou acessar sua conta, entre em contato com nosso suporte imediatamente.
        </Text>
        <Text style={footer}>
          Este é um e-mail automático de segurança. Por favor, não responda a esta mensagem.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default AccountLockedEmail;

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
