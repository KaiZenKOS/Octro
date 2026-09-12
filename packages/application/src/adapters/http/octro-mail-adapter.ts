import type { MailPort } from "../../ports/mail-port.js";

// Alias d'envoi fixe une fois pour toutes (voir GET /v1/aliases de l'Octro
// Mailing System, verifie manuellement) — jamais choisi par l'appelant.
const MAIL_FROM_ALIAS = "support@octro.co";

// Adaptateur reel de l'Octro Mailing System (POST /v1/emails, asynchrone :
// la reponse 202 ne garantit qu'une mise en file, pas la livraison — voir
// GET /v1/emails/{id} pour le suivi, non consomme ici pour rester simple).
export class OctroMailAdapter implements MailPort {
  constructor(
    private readonly baseUrl: string,
    private readonly sendPath: string,
    private readonly token: string,
  ) {}

  async sendEmail(params: { to: string; subject: string; text: string }): Promise<{ id: string; status: string }> {
    const response = await fetch(`${this.baseUrl}${this.sendPath}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: MAIL_FROM_ALIAS,
        to: params.to,
        subject: params.subject,
        text: params.text,
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Octro Mailing System rejected the email (${response.status}): ${detail}`);
    }
    return (await response.json()) as { id: string; status: string };
  }
}
