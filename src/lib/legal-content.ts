/** In-app legal copy — keep aligned with docs/privacy-policy.html and docs/terms-of-service.html.
 *  Keep user-facing and Play-compliant; do not document internal architecture. */

export const LEGAL_UPDATED = '25 September 2026';
export const LEGAL_PACKAGE = 'com.shubhamanap.cardflow';
export const SUPPORT_EMAIL =
  process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() || 'shubhamanap01@gmail.com';

const LEGAL_SUPPORT = SUPPORT_EMAIL;

export type LegalSection = { title: string; body: string };

export const PRIVACY_INTRO =
  'CardFlow (“we”, “the app”, “us”) is a business-card and contact QR scanner for Android. This Privacy Policy explains what information is processed, why, and the choices you have. By creating an account or using the app, you acknowledge this policy.';

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: '1. Who we are',
    body: `CardFlow is published on Google Play under package ${LEGAL_PACKAGE}. Privacy questions: ${LEGAL_SUPPORT}.`,
  },
  {
    title: '2. Data on your device',
    body: 'Contacts, groups, profile details you create, app settings, usage limits related to scanning, purchase status needed for Pro features, and optional card photos are stored on your device. Your contact list is not uploaded to a CardFlow cloud address book.',
  },
  {
    title: '3. Account data',
    body: 'If you create an account (email or Google Sign-In), we store your email, optional display name, plan (free or Pro), and limited usage counters so we can manage your account and entitlements. Google Sign-In is provided by Google; we receive your email and basic name when you authorize the app.',
  },
  {
    title: '4. Scanning',
    body: 'When you scan a business card, text may be read on your device and, for some plans or when needed for accuracy, a card image may be sent securely over the internet to our scanning service and trusted processing partners. When you scan a contact QR code, the code is read on your device and is not uploaded for OCR. Do not scan cards or codes you are not allowed to process. We do not run a public gallery of your scans. Short-lived technical logs may be used to prevent abuse.',
  },
  {
    title: '5. Device and advertising identifiers',
    body: 'A device or app identifier may be used to limit abuse of scanning features. When ads are shown, advertising identifiers may be used by our advertising partner under their policies.',
  },
  {
    title: '6. Advertising',
    body: 'The free plan may show ads (including banner, full-screen, and optional rewarded ads). Our advertising partner may process advertising identifiers, IP address, device information, and ad interaction data under their own privacy policy. You can reset or limit your advertising ID in system settings. Pro users do not see CardFlow ads.',
  },
  {
    title: '7. Purchases',
    body: 'Optional Pro upgrades are sold through Google Play Billing. We do not receive your full payment card details. Play may share purchase status with the app so entitlements can be applied and restored. Plan status may also be stored with your account.',
  },
  {
    title: '8. Exports and backups you create',
    body: 'If you export, share, or back up data, files leave the app through your device’s share or file tools under your control. We do not receive those files unless you choose to send them to us.',
  },
  {
    title: '9. Purposes',
    body: 'We process data to provide scanning and contacts features, authenticate you, apply free-plan limits, show ads where applicable, unlock Pro features, prevent abuse, and comply with law. Where consent is required, we rely on that consent.',
  },
  {
    title: '10. Retention',
    body: 'On-device data remains until you clear it or uninstall the app. Account data is kept while your account exists. After you delete your account, we remove associated account records, subject to backups or legal holds where required.',
  },
  {
    title: '11. Your choices and rights',
    body: `In the app you can open this Privacy Policy and the Terms, clear local data, sign out, delete your account (Settings), or contact support at ${LEGAL_SUPPORT}. Depending on your region, you may have rights to access, correct, delete, restrict, or port personal data, and to complain to a supervisory authority.`,
  },
  {
    title: '12. Children',
    body: 'CardFlow is intended for business and professional use and is not directed at children under 13 (or the higher age required in your country). We do not knowingly collect personal data from children. Contact us if you believe a child has created an account.',
  },
  {
    title: '13. International transfers',
    body: 'Service providers that help us run CardFlow (for example authentication, hosting, scanning, ads, and app distribution) may process data in the United States or other countries under their safeguards. By using the app you understand processing may occur outside your country.',
  },
  {
    title: '14. Security',
    body: 'We use industry-standard protections such as encrypted connections (HTTPS) and secure storage of sign-in sessions on your device where available. No method of transmission or storage is completely secure.',
  },
  {
    title: '15. Service providers',
    body: 'We use trusted third parties for account authentication, cloud hosting, scanning assistance, advertising, and Google Play distribution and billing. Their privacy policies apply to their services.',
  },
  {
    title: '16. Changes',
    body: 'We may update this policy. The “Last updated” date will change when we do. Continued use after an update means you accept the revised policy where permitted by law.',
  },
];

export const TERMS_INTRO =
  'These Terms of Service (“Terms”) govern your use of CardFlow. By installing or using the app, or by creating an account, you agree to these Terms and our Privacy Policy.';

export const TERMS_SECTIONS: LegalSection[] = [
  {
    title: '1. The service',
    body: 'CardFlow lets you photograph business cards, scan contact QR codes, extract or import contact details, and store contacts on your device. You can also show your own card as a QR. Features may change. We may offer Free and Pro plans with different limits and features as described in the app.',
  },
  {
    title: '2. Accounts',
    body: 'You must provide accurate account information and keep credentials secure. You are responsible for activity under your account. You may delete your account in Settings. We may suspend accounts that abuse the service.',
  },
  {
    title: '3. Acceptable use',
    body: 'You may only scan cards, QR codes, and personal data you have a right to process. Do not use CardFlow for unlawful surveillance, spam, harassment, or to violate others’ privacy or intellectual property. Do not attempt to reverse engineer, overload, or bypass limits or paid features.',
  },
  {
    title: '4. Your content',
    body: 'You retain rights to contacts and images you capture. You grant us a limited license to process card images solely to provide scanning and related features. Contacts remain on your device unless you export or back them up yourself.',
  },
  {
    title: '5. Free and Pro',
    body: 'The free plan may include ads and usage limits. Pro is offered as a monthly or yearly subscription through Google Play and unlocks additional features as described in the app (including removing CardFlow ads). Google Play’s billing and cancellation rules apply. Cancel anytime in Google Play subscription settings; access continues until the end of the paid period.',
  },
  {
    title: '6. Disclaimers',
    body: 'Extracted text may be inaccurate. Always verify details before relying on them. THE APP IS PROVIDED “AS IS” WITHOUT WARRANTIES OF ANY KIND TO THE MAXIMUM EXTENT PERMITTED BY LAW.',
  },
  {
    title: '7. Limitation of liability',
    body: 'To the maximum extent permitted by law, we are not liable for indirect, incidental, special, consequential, or punitive damages, or for lost profits, data, or goodwill arising from your use of CardFlow.',
  },
  {
    title: '8. Termination',
    body: 'You may stop using the app and delete your account at any time. We may stop offering the service or terminate access for Terms violations or operational reasons.',
  },
  {
    title: '9. Governing law',
    body: 'These Terms are governed by the laws applicable in the publisher’s jurisdiction, without regard to conflict-of-law rules, except where mandatory consumer protections in your country apply.',
  },
  {
    title: '10. Contact',
    body: `Questions about these Terms: ${LEGAL_SUPPORT}.`,
  },
];
