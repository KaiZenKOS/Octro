import type { MailPort } from "../../ports/mail-port.js";

export interface RecordedEmail {
  to: string;
  subject: string;
  text: string;
}

// Doublure de test : n'appelle jamais l'Octro Mailing System reel. Garde les
// emails "envoyes" en memoire pour que les tests puissent lire le code de
// verification (jamais renvoye au client par l'API elle-meme).
export class RecordingMailAdapter implements MailPort {
  readonly sent: RecordedEmail[] = [];

  async sendEmail(params: RecordedEmail): Promise<{ id: string; status: string }> {
    this.sent.push(params);
    return { id: `test-${this.sent.length}`, status: "queued" };
  }

  get last(): RecordedEmail | undefined {
    return this.sent[this.sent.length - 1];
  }
}
