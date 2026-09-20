import type { SecurityAlertEvent } from '../../notification.types.js';
import {
  EmailDetail,
  EmailHeading,
  EmailLayout,
  EmailParagraph,
  renderEmailHtml,
} from '../shared/email-layout.js';
import { formatTimestampUtc, truncate } from '../shared/format.js';
import type { RenderedEmail } from '../shared/rendered-email.types.js';

import type { SecurityAlertEmailProps } from './security-alert.types.js';

const MAX_USER_AGENT_LENGTH = 200;

interface EventCopy {
  readonly subject: string;
  readonly heading: string;
  readonly explanation: string;
  readonly advice: string;
}

// Record<SecurityAlertEvent, ...>: adding a new event to the union fails to
// compile until its copy is written here.
const EVENT_COPY: Record<SecurityAlertEvent, EventCopy> = {
  ACCOUNT_LOCKED: {
    subject: 'Your S.P.A.R.K. account was locked',
    heading: 'Your account was locked',
    explanation: 'Your account was locked after too many failed sign-in attempts.',
    advice:
      'If this was you, you can try again later. If it was not, reset your password and contact your college administrator.',
  },
  REFRESH_TOKEN_REUSE: {
    subject: 'Security alert: a session on your S.P.A.R.K. account was signed out',
    heading: 'A session was signed out',
    explanation:
      'We detected unusual activity on one of your sessions and signed it out to protect your account.',
    advice:
      'Please sign in again. If you do not recognise this activity, reset your password and contact your college administrator.',
  },
};

export function renderSecurityAlertEmail(props: SecurityAlertEmailProps): RenderedEmail {
  const { firstName, event, ipAddress, userAgent } = props;
  const copy = EVENT_COPY[event];

  const details: { label: string; value: string }[] = [
    { label: 'When', value: formatTimestampUtc(props.occurredAt) },
  ];
  if (ipAddress !== undefined && ipAddress !== '') {
    details.push({ label: 'IP address', value: ipAddress });
  }
  if (userAgent !== undefined && userAgent !== '') {
    details.push({ label: 'Device', value: truncate(userAgent, MAX_USER_AGENT_LENGTH) });
  }

  const html = renderEmailHtml(
    <EmailLayout previewText={copy.subject}>
      <EmailHeading>{copy.heading}</EmailHeading>
      <EmailParagraph>Hi {firstName},</EmailParagraph>
      <EmailParagraph>{copy.explanation}</EmailParagraph>
      {details.map((detail) => (
        <EmailDetail key={detail.label} label={detail.label} value={detail.value} />
      ))}
      <EmailParagraph>{copy.advice}</EmailParagraph>
    </EmailLayout>,
  );

  const text = [
    `Hi ${firstName},`,
    '',
    copy.explanation,
    ...details.map((detail) => `${detail.label}: ${detail.value}`),
    '',
    copy.advice,
  ].join('\n');

  return { subject: copy.subject, html, text };
}
