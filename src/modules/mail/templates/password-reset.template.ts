export function passwordResetTemplate(resetUrl: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0f72d8;">Redefinir senha</h1>
      <p>Recebemos um pedido para redefinir sua senha no painel do Contracapa.</p>
      <p><a href="${resetUrl}" style="color: #0f72d8;">Redefinir senha</a></p>
      <p>Se você não pediu essa redefinição, pode ignorar este e-mail — sua senha continua a mesma.</p>
    </div>
  `;
}
