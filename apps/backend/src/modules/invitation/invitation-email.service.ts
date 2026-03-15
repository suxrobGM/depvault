import { singleton } from "tsyringe";
import { PlatformInviteTemplate, TeamInviteTemplate } from "@/common/emails";
import { EmailService } from "@/common/services";

type InviteEmailParams = {
  email: string;
  inviterName: string;
  projectName: string;
  role: string;
  token: string;
  isExistingUser: boolean;
};

@singleton()
export class InvitationEmailService {
  private readonly frontendUrl = process.env.FRONTEND_URL!;

  constructor(private readonly emailService: EmailService) {}

  /** Sends an invitation email (team invite for existing users, platform invite for new users). */
  send(params: InviteEmailParams): void {
    const { email, inviterName, projectName, role, token, isExistingUser } = params;
    const subject = `You've been invited to ${projectName} — DepVault`;

    if (isExistingUser) {
      void this.emailService.send({
        to: email,
        subject,
        react: TeamInviteTemplate({
          inviterName,
          projectName,
          role,
          acceptUrl: `${this.frontendUrl}/invitations/${token}`,
          declineUrl: `${this.frontendUrl}/invitations/${token}?action=decline`,
        }),
      });
    } else {
      void this.emailService.send({
        to: email,
        subject,
        react: PlatformInviteTemplate({
          inviterName,
          projectName,
          role,
          registerUrl: `${this.frontendUrl}/register?inviteToken=${token}`,
        }),
      });
    }
  }

  /** Sends a reminder invitation email. */
  resend(params: InviteEmailParams): void {
    const { email, inviterName, projectName, role, token, isExistingUser } = params;
    const subject = `Reminder: You've been invited to ${projectName} — DepVault`;

    if (isExistingUser) {
      void this.emailService.send({
        to: email,
        subject,
        react: TeamInviteTemplate({
          inviterName,
          projectName,
          role,
          acceptUrl: `${this.frontendUrl}/invitations/${token}`,
          declineUrl: `${this.frontendUrl}/invitations/${token}?action=decline`,
        }),
      });
    } else {
      void this.emailService.send({
        to: email,
        subject,
        react: PlatformInviteTemplate({
          inviterName,
          projectName,
          role,
          registerUrl: `${this.frontendUrl}/register?inviteToken=${token}`,
        }),
      });
    }
  }
}
