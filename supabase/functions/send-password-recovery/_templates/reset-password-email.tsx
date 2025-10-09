import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface ResetPasswordEmailProps {
  resetLink: string
  userEmail: string
}

export const ResetPasswordEmail = ({
  resetLink,
  userEmail,
}: ResetPasswordEmailProps) => (
  <Html>
    <Head />
    <Preview>Redefinição de senha - Plataforma ChatPDPOA</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Redefinir Senha</Heading>
        
        <Text style={text}>
          Olá,
        </Text>
        
        <Text style={text}>
          Você solicitou a redefinição de senha para sua conta na <strong>Plataforma ChatPDPOA</strong> ({userEmail}).
        </Text>
        
        <Text style={text}>
          Para criar uma nova senha, clique no botão abaixo:
        </Text>
        
        <Section style={buttonContainer}>
          <Link
            href={resetLink}
            target="_blank"
            style={button}
          >
            Redefinir Senha
          </Link>
        </Section>
        
        <Text style={text}>
          Ou copie e cole este link no seu navegador:
        </Text>
        
        <Text style={linkText}>
          {resetLink}
        </Text>
        
        <Hr style={hr} />
        
        <Text style={footerText}>
          <strong>Importante:</strong> Este link é válido por 1 hora e pode ser usado apenas uma vez.
        </Text>
        
        <Text style={footerText}>
          Se você não solicitou a redefinição de senha, pode ignorar este email com segurança. Sua senha atual permanecerá inalterada.
        </Text>
        
        <Hr style={hr} />
        
        <Text style={footer}>
          Plataforma ChatPDPOA
          <br />
          Sistema de Atendimento Inteligente
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ResetPasswordEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
}

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 40px',
  textAlign: 'center' as const,
}

const text = {
  color: '#484848',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 40px',
}

const buttonContainer = {
  padding: '27px 40px',
  textAlign: 'center' as const,
}

const button = {
  backgroundColor: '#0066cc',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 40px',
}

const linkText = {
  color: '#0066cc',
  fontSize: '14px',
  padding: '0 40px',
  wordBreak: 'break-all' as const,
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 40px',
}

const footerText = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '22px',
  padding: '0 40px',
  marginTop: '12px',
}

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 40px',
  marginTop: '32px',
  textAlign: 'center' as const,
}
