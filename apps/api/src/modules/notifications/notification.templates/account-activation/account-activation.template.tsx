import {
  EmailButton,
  EmailHeading,
  EmailLayout,
  EmailLinkFallback,
  EmailParagraph,
  renderEmailHtml,
} from '../shared/email-layout.js';
import type { RenderedEmail } from '../shared/rendered-email.types.js';

import type { AccountActivationEmailProps } from './account-activation.types.js';

const SUBJECT = 'Activate your S.P.A.R.K. account';

export function renderAccountActivationEmail(props: AccountActivationEmailProps): RenderedEmail {
  const { firstName, activationUrl } = props;

  const html = renderEmailHtml(
    <EmailLayout previewText={SUBJECT}>
      <EmailHeading>Activate your account</EmailHeading>
      <EmailParagraph>Hi {firstName},</EmailParagraph>
      <EmailParagraph>
        An account has been created for you on S.P.A.R.K. Use the button below to set your password
        and activate it. The link can only be used for a limited time.
      </EmailParagraph>
      <EmailButton href={activationUrl}>Activate account</EmailButton>
      <EmailLinkFallback url={activationUrl} />
      <EmailParagraph>If you were not expecting this email, you can ignore it.</EmailParagraph>
    </EmailLayout>,
  );

  const text = [
    `Hi ${firstName},`,
    '',
    'An account has been created for you on S.P.A.R.K. Open the link below to set your password and activate it. The link can only be used for a limited time.',
    '',
    activationUrl,
    '',
    'If you were not expecting this email, you can ignore it.',
  ].join('\n');

  return { subject: SUBJECT, html, text };
}
