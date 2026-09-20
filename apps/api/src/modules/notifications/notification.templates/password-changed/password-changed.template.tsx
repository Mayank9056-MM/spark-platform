import {
  EmailDetail,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
  renderEmailHtml,
} from '../shared/email-layout.js';
import { formatTimestampUtc } from '../shared/format.js';
import type { RenderedEmail } from '../shared/rendered-email.types.js';

import type { PasswordChangedEmailProps } from './password-changed.types.js';

const SUBJECT = 'Your S.P.A.R.K. password was changed';

export function renderPasswordChangedEmail(props: PasswordChangedEmailProps): RenderedEmail {
  const { firstName } = props;
  const when = formatTimestampUtc(props.changedAt);

  const html = renderEmailHtml(
    <EmailLayout previewText={SUBJECT}>
      <EmailHeading>Your password was changed</EmailHeading>
      <EmailParagraph>Hi {firstName},</EmailParagraph>
      <EmailParagraph>The password for your S.P.A.R.K. account was just changed.</EmailParagraph>
      <EmailDetail label="When" value={when} />
      <EmailParagraph>
        If you made this change, no further action is needed. If you did not, reset your password
        immediately and contact your college administrator.
      </EmailParagraph>
    </EmailLayout>,
  );

  const text = [
    `Hi ${firstName},`,
    '',
    'The password for your S.P.A.R.K. account was just changed.',
    `When: ${when}`,
    '',
    'If you made this change, no further action is needed. If you did not, reset your password immediately and contact your college administrator.',
  ].join('\n');

  return { subject: SUBJECT, html, text };
}
