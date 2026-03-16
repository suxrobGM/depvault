import type { ReactElement } from "react";
import { LegalPage, LegalParagraph, LegalSection } from "@/components/ui/legal";

export default function TermsOfServicePage(): ReactElement {
  return (
    <LegalPage title="Terms of Service" lastUpdated="March 16, 2026">
      <LegalSection title="1. Acceptance of Terms">
        <LegalParagraph>
          By accessing or using DepVault (&quot;the Service&quot;), operated by Sukhrobbek
          Ilyosbekov (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), you agree to be bound by
          these Terms of Service. If you do not agree to these terms, do not use the Service.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="2. Description of Service">
        <LegalParagraph>
          DepVault is a platform that analyzes software dependencies, detects vulnerabilities, and
          provides encrypted storage for environment variables and secret files. The Service
          includes the web dashboard, REST API, CLI tool, and documentation site.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="3. User Accounts">
        <LegalParagraph>
          You must provide accurate information when creating an account. You are responsible for
          maintaining the security of your account credentials. You must notify us immediately of
          any unauthorized use of your account. We reserve the right to suspend or terminate
          accounts that violate these terms.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="4. Acceptable Use">
        <LegalParagraph>
          You agree not to: (a) use the Service for unlawful purposes; (b) attempt to gain
          unauthorized access to other accounts, systems, or networks; (c) upload malicious code or
          files; (d) interfere with or disrupt the Service; (e) reverse-engineer or decompile any
          part of the Service; (f) use the Service to store or transmit content that infringes on
          third-party intellectual property rights.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="5. Data and Privacy">
        <LegalParagraph>
          Your use of the Service is also governed by our Privacy Policy. You retain ownership of
          all data you upload to the Service. We do not access, share, or sell your stored secrets
          or environment variables. All secret values are encrypted at rest using AES-256-GCM
          encryption.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="6. Service Tiers and Billing">
        <LegalParagraph>
          DepVault offers free and paid subscription tiers. Paid subscriptions are billed monthly
          per user. You may upgrade, downgrade, or cancel your subscription at any time. Downgrades
          take effect at the end of the current billing period. Refunds are not provided for partial
          billing periods. All payment processing is handled by Stripe, Inc. Your payment
          information is transmitted directly to Stripe and is subject to Stripe&apos;s Privacy
          Policy and Terms of Service. We do not store your full credit card number on our servers.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="7. Intellectual Property">
        <LegalParagraph>
          The Service, including its design, code, logos, and documentation, is the intellectual
          property of DepVault and is protected by applicable laws. The DepVault CLI is open source
          under its respective license. These terms do not grant you any rights to our trademarks or
          branding.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="8. Limitation of Liability">
        <LegalParagraph>
          The Service is provided &quot;as is&quot; without warranties of any kind, express or
          implied. To the maximum extent permitted by law, DepVault shall not be liable for any
          indirect, incidental, special, consequential, or punitive damages, or any loss of profits,
          data, or business opportunities arising from your use of the Service.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="9. Termination">
        <LegalParagraph>
          You may delete your account at any time. We may suspend or terminate your access if you
          violate these terms or engage in activity that harms the Service or other users. Upon
          termination, your stored data will be deleted within 30 days, except where retention is
          required by law.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="10. Changes to Terms">
        <LegalParagraph>
          We may update these terms from time to time. We will notify registered users of material
          changes via email or in-app notification. Continued use of the Service after changes
          constitutes acceptance of the updated terms.
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="11. Contact">
        <LegalParagraph>
          If you have questions about these terms, contact us at support@depvault.com or by mail at:
          Sukhrobbek Ilyosbekov, 132 Marginal Way, Apt 218, Portland, ME 04101.
        </LegalParagraph>
      </LegalSection>
    </LegalPage>
  );
}
