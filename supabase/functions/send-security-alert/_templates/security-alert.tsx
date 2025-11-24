import {
  Body,
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

interface SecurityAlertEmailProps {
  alertType: 'failed_2fa' | 'account_blocked' | 'new_device' | 'suspicious_login';
  displayName: string;
  details: {
    attempts?: number;
    ipAddress?: string;
    userAgent?: string;
    location?: string;
    timestamp: string;
  };
}

export const SecurityAlertEmail = ({
  alertType,
  displayName,
  details,
}: SecurityAlertEmailProps) => {
  const getContent = () => {
    switch (alertType) {
      case 'failed_2fa':
        return {
          title: '🔒 Tentativas Falhas de Autenticação 2FA',
          preview: 'Alerta de Segurança: Tentativas Falhas de 2FA',
          message: `Detectamos ${details.attempts || 1} tentativa(s) falha(s) de autenticação de 2 fatores em sua conta.`,
          color: '#dc2626',
          bgColor: '#fef2f2',
        };
      case 'account_blocked':
        return {
          title: '🚫 Conta Bloqueada por Segurança',
          preview: 'Alerta de Segurança: Conta Temporariamente Bloqueada',
          message: `Sua conta foi temporariamente bloqueada por 15 minutos devido a múltiplas tentativas falhas de autenticação 2FA.`,
          color: '#dc2626',
          bgColor: '#fef2f2',
        };
      case 'new_device':
        return {
          title: '🔔 Login de Novo Dispositivo',
          preview: 'Novo Dispositivo Detectado',
          message: `Detectamos um login em sua conta de um dispositivo não reconhecido.`,
          color: '#0dd4c3',
          bgColor: '#ecfeff',
        };
      case 'suspicious_login':
        return {
          title: '⚠️ Atividade Suspeita Detectada',
          preview: 'Alerta de Segurança: Atividade Suspeita',
          message: `Detectamos uma atividade suspeita em sua conta.`,
          color: '#ea580c',
          bgColor: '#fff7ed',
        };
    }
  };

  const content = getContent();

  return React.createElement(
    Html,
    null,
    React.createElement(Head, null),
    React.createElement(Preview, null, content.preview),
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
          React.createElement(Heading, { style: { ...h2, color: content.color } }, content.title),
          React.createElement(Text, { style: paragraph }, `Olá ${displayName},`),
          React.createElement(Text, { style: paragraph }, content.message),
          React.createElement(
            Section,
            { style: { ...alertBox, backgroundColor: content.bgColor, borderLeftColor: content.color } },
            React.createElement(Heading, { style: { ...h3, color: content.color } }, 'Detalhes:'),
            React.createElement(
              Text,
              { style: detailText },
              (alertType === 'account_blocked' ? `Tentativas Falhas: ${details.attempts || 5}\n` : '') +
              `Endereço IP: ${details.ipAddress}\n` +
              (details.location ? `Localização: ${details.location}\n` : '') +
              `Navegador/Dispositivo: ${details.userAgent || 'Desconhecido'}\n` +
              `Data e Hora: ${new Date(details.timestamp).toLocaleString('pt-BR')}`
            )
          ),
          React.createElement(Text, { style: paragraph }, React.createElement('strong', null, 'O que fazer?')),
          React.createElement(
            Text,
            { style: paragraph },
            alertType === 'failed_2fa' && '• Se foi você, ignore este e-mail.\n• Se não foi você, altere sua senha imediatamente.\n• Entre em contato com o suporte se precisar de ajuda.',
            alertType === 'account_blocked' && '• Aguarde 15 minutos antes de tentar novamente.\n• Verifique se está usando o código correto do seu app.\n• Se não foi você, altere sua senha após o desbloqueio.',
            alertType === 'new_device' && '• Se foi você, ignore este e-mail.\n• Se não foi você, altere sua senha imediatamente.',
            alertType === 'suspicious_login' && '• Revise sua atividade recente na conta.\n• Altere sua senha se não reconhecer esta atividade.\n• Entre em contato com o suporte para investigação.'
          ),
          React.createElement(Hr, { style: hr }),
          React.createElement(
            Text,
            { style: footer },
            'Este é um e-mail automático de segurança da NebulaVape.\nPara sua proteção, não responda a este e-mail.'
          )
        )
      )
    )
  );
};

export default SecurityAlertEmail;

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
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 20px 0',
};

const h3 = {
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 10px 0',
};

const paragraph = {
  color: '#e0f7ff',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
  whiteSpace: 'pre-line' as const,
};

const alertBox = {
  padding: '20px',
  margin: '20px 0',
  borderRadius: '8px',
  borderLeft: '4px solid',
};

const detailText = {
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
