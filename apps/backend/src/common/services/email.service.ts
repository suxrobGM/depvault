import { render } from "@react-email/render";
import type { ReactElement } from "react";
import { Resend } from "resend";
import { singleton } from "tsyringe";
import { logger } from "@/common/logger/logger";

interface SendEmailOptions {
  to: string;
  subject: string;
  react: ReactElement;
}

@singleton()
export class EmailService {
  private readonly client: Resend | null;
  private readonly from: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.client = apiKey ? new Resend(apiKey) : null;

    const name = process.env.EMAIL_FROM_NAME ?? "DepVault";
    const address = process.env.EMAIL_FROM_ADDRESS ?? "noreply@depvault.dev";
    this.from = `${name} <${address}>`;

    if (!this.client) {
      logger.warn("RESEND_API_KEY not set — emails will be logged instead of sent");
    }
  }

  async send(options: SendEmailOptions): Promise<void> {
    const html = await render(options.react);

    if (!this.client) {
      logger.info({ to: options.to, subject: options.subject }, "Email (dev mode — not sent)");
      logger.debug({ html }, "Email HTML content");
      return;
    }

    try {
      await this.client.emails.send({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html,
      });
      logger.info({ to: options.to, subject: options.subject }, "Email sent");
    } catch (error) {
      logger.error({ to: options.to, subject: options.subject, error }, "Failed to send email");
    }
  }
}
