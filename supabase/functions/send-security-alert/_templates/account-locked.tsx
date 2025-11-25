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
  userEmail: string;
  reason: string;
  unlockTime: string;
  timestamp: string;
}

export const AccountLockedEmail = ({
  userEmail,
  reason,
  unlockTime,
  timestamp,
}: AccountLockedEmailProps) => (
  <Html>
    <Head />
    <Preview>Sua conta foi bloqueada temporariamente</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🔒 Conta Bloqueada</Heading>
        <Text style={text}>
          Para sua segurança, sua conta foi bloqueada temporariamente.
        </Text>
        <Container style={detailsContainer}>
          <Text style={detailsText}><strong>E-mail:</strong> {userEmail}</Text>
          <Text style={detailsText}><strong>Motivo:</strong> {reason}</Text>
          <Text style={detailsText}><strong>Desbloqueio em:</strong> {unlockTime}</Text>
          <Text style={detailsText}><strong>Bloqueado em:</strong> {timestamp}</Text>
        </Container>
        <Text style={warningText}>
          Você atingiu o limite de tentativas de login. Para sua segurança, 
          sua conta será bloqueada por 15 minutos.
        </Text>
        <Text style={footer}>
          Se precisar de ajuda, entre em contato com o suporte.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default AccountLockedEmail;

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