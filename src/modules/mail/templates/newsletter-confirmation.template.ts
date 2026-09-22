export function newsletterConfirmationTemplate(
  name: string,
  confirmUrl: string,
): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h1 style="color: #0f72d8;">Confirme sua inscrição</h1>
      <p>Olá, ${name}!</p>
      <p>Confirme sua inscrição na newsletter do Contracapa clicando no link abaixo:</p>
      <p><a href="${confirmUrl}" style="color: #0f72d8;">Confirmar inscrição</a></p>
      <p>Se você não pediu essa inscrição, pode ignorar este e-mail.</p>
    </div>
  `;
}
