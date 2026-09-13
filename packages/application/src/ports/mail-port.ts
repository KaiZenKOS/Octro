// Envoi d'email transactionnel (verification de compte). L'alias d'envoi
// n'est pas un parametre de ce port : il est fixe une fois par l'adaptateur
// reel (adapters/http/octro-mail-adapter.ts), pas choisi par l'appelant.
export interface MailPort {
  sendEmail(params: { to: string; subject: string; text: string }): Promise<{ id: string; status: string }>;
}
