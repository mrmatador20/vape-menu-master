import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Section,
  Hr,
} from 'https://esm.sh/@react-email/components@0.0.22'
import * as React from 'https://esm.sh/react@18.3.1'

interface PasswordResetEmailProps {
  displayName: string;
  resetLink: string;
}

export const PasswordResetEmail = ({
  displayName,
  resetLink,
}: PasswordResetEmailProps) => {
  return React.createElement(
    Html,
    null,
    React.createElement(Head, null),
    React.createElement(Preview, null, 'Recuperação de Senha - NebulaVape'),
    React.createElement(
      Body,
      { style: main },
      React.createElement(
        Container,
        { style: container },
        React.createElement(
          Section,
          { style: header },
          React.createElement(Heading, { style: h1 }, 'NebulaVape')
        ),
        React.createElement(
          Section,
          { style: contentSection },
          React.createElement(Heading, { style: h2 }, '🔐 Recuperação de Senha'),
          React.createElement(Text, { style: paragraph }, `Olá ${displayName},`),
          React.createElement(
            Text,
            { style: paragraph },
            'Recebemos uma solicitação para redefinir a senha da sua conta. Se você não fez esta solicitação, ignore este e-mail.'
          ),
          React.createElement(
            Section,
            { style: buttonContainer },
            React.createElement(Button, { style: button, href: resetLink }, 'Redefinir Senha')
          ),
          React.createElement(Text, { style: paragraph }, 'Ou copie e cole este link no seu navegador:'),
          React.createElement(Text, { style: linkText }, resetLink),
          React.createElement(
            Section,
            { style: alertBox },
            React.createElement(
              Text,
              { style: alertText },
              '⚠️ Importante:\n• Este link expira em 1 hora\n• Nunca compartilhe este link com ninguém\n• Se não foi você, ignore este e-mail'
            )
          ),
          React.createElement(Hr, { style: hr }),
          React.createElement(
            Text,
            { style: footer },
            'Este é um e-mail automático da NebulaVape.\nSe você não solicitou a redefinição de senha, entre em contato com nosso suporte.'
          )
        )
      )
    )
  );
};

export default PasswordResetEmail;

const main = {
  backgroundColor: '#0f1419',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0',
  maxWidth: '600px',
};

const header = {
  background: 'linear-gradient(135deg, #0dd4c3, #0cc3a3)',
  padding: '30px 20px',
  textAlign: 'center' as const,
  borderRadius: '12px 12px 0 0',
};

const h1 = {
  color: '#0f1419',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0',
  textAlign: 'center' as const,
};

const contentSection = {
  backgroundColor: '#1a2332',
  padding: '30px',
  borderRadius: '0 0 12px 12px',
};

const h2 = {
  color: '#0dd4c3',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 20px 0',
  textAlign: 'center' as const,
};

const paragraph = {
  color: '#e0f7ff',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '30px 0',
};

const button = {
  backgroundColor: '#0dd4c3',
  borderRadius: '8px',
  color: '#0f1419',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 40px',
  cursor: 'pointer',
};

const linkText = {
  color: '#0dd4c3',
  fontSize: '12px',
  lineHeight: '20px',
  wordBreak: 'break-all' as const,
  backgroundColor: '#0f1419',
  padding: '12px',
  borderRadius: '6px',
  border: '1px solid #2d3748',
};

const alertBox = {
  backgroundColor: '#fef2f2',
  padding: '20px',
  margin: '20px 0',
  borderRadius: '8px',
  borderLeft: '4px solid #dc2626',
};

const alertText = {
  color: '#0f1419',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
  whiteSpace: 'pre-line' as const,
};

const hr = {
  borderColor: '#2d3748',
  margin: '30px 0',
};

const footer = {
  color: '#8ba9b8',
  fontSize: '12px',
  lineHeight: '20px',
  textAlign: 'center' as const,
  margin: '20px 0 0 0',
  whiteSpace: 'pre-line' as const,
};
