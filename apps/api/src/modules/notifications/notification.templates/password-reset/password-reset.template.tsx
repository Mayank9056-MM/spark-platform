import {
  EmailButton,
  EmailHeading,
  EmailLayout,
  EmailLinkFallback,
  EmailParagraph,
  renderEmailHtml,
} from '../shared/email-layout.js';
import type { RenderedEmail } from '../shared/rendered-email.types.js';

import type { PasswordResetEmailProps } from './password-reset.types.js';

const SUBJECT = 'Reset your S.P.A.R.K. password';

export function renderPasswordResetEmail(props: PasswordResetEmailProps): RenderedEmail {
  const { firstName, resetUrl } = props;

  const html = renderEmailHtml(
    <EmailLayout previewText={SUBJECT}>
      <EmailHeading>Reset your password</EmailHeading>
      <EmailParagraph>Hi {firstName},</EmailParagraph>
      <EmailParagraph>
        We received a request to reset the password for your S.P.A.R.K. account. Use the button
        below to choose a new one. The link can only be used for a limited time.
      </EmailParagraph>
      <EmailButton href={resetUrl}>Reset password</EmailButton>
      <EmailLinkFallback url={resetUrl} />
      <EmailParagraph>
        If you did not request this, you can ignore this email. Your password will not change.
      </EmailParagraph>
    </EmailLayout>,
  );

  const text = [
    `Hi ${firstName},`,
    '',
    'We received a request to reset the password for your S.P.A.R.K. account. Open the link below to choose a new one. The link can only be used for a limited time.',
    '',
    resetUrl,
    '',
    'If you did not request this, you can ignore this email. Your password will not change.',
  ].join('\n');

  return { subject: SUBJECT, html, text };
}
