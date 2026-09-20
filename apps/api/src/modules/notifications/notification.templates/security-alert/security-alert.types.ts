import type { SecurityAlertEvent } from '../../notification.types.js';

export interface SecurityAlertEmailProps {
  readonly firstName: string;
  readonly event: SecurityAlertEvent;
  /** ISO 8601. */
  readonly occurredAt: string;
  /** Personal data. Shown in the email only. */
  readonly ipAddress?: string | undefined;
  /** Personal data. Shown in the email only, truncated. */
  readonly userAgent?: string | undefined;
}
