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

interface AdminActionEmailProps {
  userEmail: string;
  actionType: string;
  timestamp: string;
  description: string;
}

export const AdminActionEmail = ({
  userEmail,
  actionType,
  timestamp,
  description,
}: AdminActionEmailProps) => (
  <Html>
    <Head />
    <Preview>Ação administrativa realizada em sua conta</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🔐 Notificação de Ação Administrativa</Heading>
        <Text style={text}>
          Uma ação administrativa importante foi realizada em sua conta.
        </Text>
        <Container style={detailsContainer}>
          <Text style={detailsText}><strong>E-mail:</strong> {userEmail}</Text>
          <Text style={detailsText}><strong>Ação:</strong> {actionType}</Text>
          <Text style={detailsText}><strong>Data/Hora:</strong> {timestamp}</Text>
          <Text style={detailsText}><strong>Descrição:</strong> {description}</Text>
        </Container>
        <Text style={warningText}>
          Caso não tenha sido você, entre em contato imediatamente com o suporte.
        </Text>
        <Text style={footer}>
          Esta é uma notificação automática de segurança.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default AdminActionEmail;

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
  color: '#2563eb',
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
  color: '#2563eb',
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