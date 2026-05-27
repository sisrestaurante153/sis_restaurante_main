import { Resend } from "resend";

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY não configurada. E-mails transacionais não serão disparados.");
    return null;
  }
  return new Resend(apiKey);
};

const FROM_EMAIL = process.env.EMAIL_FROM || "SIS Restaurante <onboarding@resend.dev>";

async function sendEmail({
  to,
  subject,
  html
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const resend = getResendClient();
  if (!resend) return;

  try {
    const data = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html
    });
    console.log(`[Email] Enviado com sucesso para ${to}. ID: ${data.data?.id}`);
    return data;
  } catch (error) {
    console.error(`[Email] Falha ao enviar para ${to}:`, error);
  }
}

export async function sendWelcomeEmail(data: {
  email: string;
  name: string;
  restaurantName: string;
}) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <div style="background-color: #0b2545; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">SIS Restaurante</h1>
      </div>
      <div style="padding: 20px; color: #333333; line-height: 1.6;">
        <h2 style="color: #185fa5;">Olá, ${data.name}!</h2>
        <p>Seja muito bem-vindo ao <strong>SIS Restaurante</strong>! Ficamos muito felizes em ter o <strong>${data.restaurantName}</strong> conosco.</p>
        <p>Sua conta de teste (Trial) de 14 dias foi criada com sucesso e já está pronta para uso. Agora você pode dar adeus às planilhas legadas de fichas técnicas e começar a gerenciar seus custos de forma inteligente.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}/dashboard" style="background-color: #185fa5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Acessar meu Dashboard</a>
        </div>
        <p>Se precisar de qualquer ajuda durante seu período de testes, basta responder a este e-mail ou entrar em contato com nosso suporte.</p>
        <p>Boas receitas!</p>
        <p>Abraços,<br/><strong>Equipe SIS Restaurante</strong></p>
      </div>
      <div style="background-color: #f4f6f8; padding: 15px; text-align: center; font-size: 12px; color: #666666; border-radius: 0 0 8px 8px;">
        Este é um e-mail transacional enviado pelo SIS Restaurante.
      </div>
    </div>
  `;

  await sendEmail({
    to: data.email,
    subject: "Bem-vindo ao SIS Restaurante!",
    html
  });
}

export async function sendTrialExpiringEmail(data: {
  email: string;
  name: string;
  restaurantName: string;
  daysRemaining: number;
}) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <div style="background-color: #0b2545; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">SIS Restaurante</h1>
      </div>
      <div style="padding: 20px; color: #333333; line-height: 1.6;">
        <h2 style="color: #f57c00;">Atenção, ${data.name}!</h2>
        <p>O período de testes (Trial) do <strong>${data.restaurantName}</strong> está chegando ao fim.</p>
        <p>Restam apenas <strong>${data.daysRemaining} ${data.daysRemaining === 1 ? 'dia' : 'dias'}</strong> de acesso gratuito. Para não perder o acesso às suas fichas técnicas, insumos cadastrados e histórico de custos, ative sua assinatura agora mesmo.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}/assinatura" style="background-color: #185fa5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Ativar Minha Assinatura</a>
        </div>
        <p>Se tiver alguma dúvida sobre os planos ou sobre a ativação, entre em contato conosco.</p>
        <p>Abraços,<br/><strong>Equipe SIS Restaurante</strong></p>
      </div>
      <div style="background-color: #f4f6f8; padding: 15px; text-align: center; font-size: 12px; color: #666666; border-radius: 0 0 8px 8px;">
        Este é um e-mail transacional enviado pelo SIS Restaurante.
      </div>
    </div>
  `;

  await sendEmail({
    to: data.email,
    subject: `Seu período de testes expira em ${data.daysRemaining} ${data.daysRemaining === 1 ? 'dia' : 'dias'}!`,
    html
  });
}

export async function sendPaymentConfirmedEmail(data: {
  email: string;
  name: string;
  restaurantName: string;
  planLabel: string;
  value: number;
}) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <div style="background-color: #0b2545; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">SIS Restaurante</h1>
      </div>
      <div style="padding: 20px; color: #333333; line-height: 1.6;">
        <h2 style="color: #2e7d32;">Pagamento Confirmado!</h2>
        <p>Olá, ${data.name}.</p>
        <p>Confirmamos o recebimento do pagamento da assinatura do <strong>${data.restaurantName}</strong>.</p>
        <p><strong>Detalhes da Assinatura:</strong></p>
        <ul>
          <li><strong>Plano:</strong> ${data.planLabel}</li>
          <li><strong>Valor:</strong> R$ ${data.value.toFixed(2).replace(".", ",")} / mês</li>
          <li><strong>Status:</strong> Ativo</li>
        </ul>
        <p>Seu sistema está totalmente liberado para uso. Obrigado por confiar no SIS Restaurante!</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}/dashboard" style="background-color: #185fa5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Acessar o Painel</a>
        </div>
        <p>Abraços,<br/><strong>Equipe SIS Restaurante</strong></p>
      </div>
      <div style="background-color: #f4f6f8; padding: 15px; text-align: center; font-size: 12px; color: #666666; border-radius: 0 0 8px 8px;">
        Este é um e-mail transacional enviado pelo SIS Restaurante.
      </div>
    </div>
  `;

  await sendEmail({
    to: data.email,
    subject: "Pagamento Confirmado! Sua assinatura está ativa",
    html
  });
}

export async function sendOverdueEmail(data: {
  email: string;
  name: string;
  restaurantName: string;
  dueDate: string;
  value: number;
}) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <div style="background-color: #0b2545; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">SIS Restaurante</h1>
      </div>
      <div style="padding: 20px; color: #333333; line-height: 1.6;">
        <h2 style="color: #d32f2f;">Fatura em Atraso</h2>
        <p>Olá, ${data.name}.</p>
        <p>Identificamos que a fatura do <strong>${data.restaurantName}</strong> vencida em <strong>${data.dueDate}</strong> no valor de <strong>R$ ${data.value.toFixed(2).replace(".", ",")}</strong> ainda não foi compensada.</p>
        <p>Para evitar a suspensão dos serviços e bloqueio de acesso ao sistema, realize o pagamento o quanto antes.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}/assinatura" style="background-color: #185fa5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Visualizar Fatura / Pagar</a>
        </div>
        <p>Se você já realizou o pagamento, por favor desconsidere este e-mail. A compensação bancária pode levar até 72 horas úteis.</p>
        <p>Abraços,<br/><strong>Equipe SIS Restaurante</strong></p>
      </div>
      <div style="background-color: #f4f6f8; padding: 15px; text-align: center; font-size: 12px; color: #666666; border-radius: 0 0 8px 8px;">
        Este é um e-mail transacional enviado pelo SIS Restaurante.
      </div>
    </div>
  `;

  await sendEmail({
    to: data.email,
    subject: "Aviso: Fatura em atraso no SIS Restaurante",
    html
  });
}

export async function sendBlockedEmail(data: {
  email: string;
  name: string;
  restaurantName: string;
}) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <div style="background-color: #0b2545; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">SIS Restaurante</h1>
      </div>
      <div style="padding: 20px; color: #333333; line-height: 1.6;">
        <h2 style="color: #d32f2f;">Acesso Bloqueado</h2>
        <p>Olá, ${data.name}.</p>
        <p>O acesso ao sistema para o restaurante <strong>${data.restaurantName}</strong> foi suspenso devido à falta de pagamento ou término do período trial.</p>
        <p>Suas informações continuam salvas com segurança, mas todas as rotas operacionais do sistema estão bloqueadas até a regularização da assinatura.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${appUrl}/assinatura" style="background-color: #185fa5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Regularizar Minha Conta</a>
        </div>
        <p>Caso tenha alguma dúvida ou queira falar com o suporte, responda a este e-mail.</p>
        <p>Abraços,<br/><strong>Equipe SIS Restaurante</strong></p>
      </div>
      <div style="background-color: #f4f6f8; padding: 15px; text-align: center; font-size: 12px; color: #666666; border-radius: 0 0 8px 8px;">
        Este é um e-mail transacional enviado pelo SIS Restaurante.
      </div>
    </div>
  `;

  await sendEmail({
    to: data.email,
    subject: "Importante: Seu acesso ao SIS Restaurante foi suspenso",
    html
  });
}
