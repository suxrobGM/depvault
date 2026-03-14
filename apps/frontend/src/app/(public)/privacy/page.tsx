import type { ReactElement } from "react";
import { LegalPage, LegalParagraph, LegalSection } from "@/components/ui/legal";

export default function PrivacyPolicyPage(): ReactElement {
  return (
    <LegalPage title="Privacy Policy" lastUpdated="March 14, 2026">
      <LegalSection title="1. Information We Collect">
        <LegalParagraph>
          When you create an account, we collect your name, email address, and password (stored as a
          bcrypt hash). When you use the Service, we collect usage data including dependency
          analysis results, project metadata, and activity logs. We do not collect or store the
          plaintext values of your secrets or environment variables — all secret values are
          encrypted before storage.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="2. How We Use Your Information">
        <LegalParagraph>
          We use your information to: (a) provide and maintain the Service; (b) authenticate your
          identity; (c) send transactional emails such as verification and password reset; (d)
          generate aggregated, anonymized usage statistics; (e) detect and prevent abuse. We do not
          sell your personal information to third parties.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="3. Data Storage and Security">
        <LegalParagraph>
          All data is stored in PostgreSQL databases with encryption at rest. Secret values and
          environment variables are encrypted using AES-256-GCM with unique initialization vectors
          per entry. Encryption keys are managed separately from the database. Decrypted values are
          never written to logs or persisted outside of encrypted storage. All data transmission
          uses TLS 1.2 or higher.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="4. One-Time Sharing Links">
        <LegalParagraph>
          When you create a one-time sharing link, the shared content is encrypted and stored
          temporarily. After the first access, the content is permanently deleted from our systems.
          Expired links are purged automatically.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="5. Cookies">
        <LegalParagraph>
          We use httpOnly cookies to manage authentication sessions (access and refresh tokens). We
          do not use tracking cookies or third-party advertising cookies.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="6. Third-Party Services">
        <LegalParagraph>
          We may use third-party services for email delivery, error monitoring, and infrastructure
          hosting. These providers are contractually bound to protect your data. We do not share
          your secrets or environment variable values with any third party.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="7. Data Retention">
        <LegalParagraph>
          Your data is retained for as long as your account is active. When you delete your account,
          your personal information, projects, secrets, and environment variables are permanently
          deleted within 30 days. Audit logs may be retained for up to 1 year depending on your
          subscription tier for compliance purposes.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="8. Your Rights">
        <LegalParagraph>
          You have the right to: (a) access the personal data we hold about you; (b) request
          correction of inaccurate data; (c) request deletion of your account and associated data;
          (d) export your data in a standard format; (e) withdraw consent for optional data
          processing. To exercise these rights, contact us at privacy@depvault.com.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="9. Children's Privacy">
        <LegalParagraph>
          The Service is not intended for users under the age of 16. We do not knowingly collect
          personal information from children. If we become aware that a child has provided us with
          personal data, we will delete it promptly.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="10. Changes to This Policy">
        <LegalParagraph>
          We may update this Privacy Policy from time to time. We will notify registered users of
          material changes via email. The &quot;Last updated&quot; date at the top of this page
          indicates when the policy was last revised.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="11. Contact">
        <LegalParagraph>
          If you have questions about this Privacy Policy, contact us at privacy@depvault.com.
        </LegalParagraph>
      </LegalSection>
    </LegalPage>
  );
}
