/**
 * Application-level email delivery contract (a "port").
 *
 * The notification worker depends on this interface, never on a vendor SDK.
 * A concrete provider (resend.provider.ts) implements it. This file knows
 * nothing about notification types, templates, users, retries or BullMQ.
 *
 * The sender ("from") address is deliberately not part of a message: it is
 * provider configuration, set once where the provider is constructed.
 */

/**
 * A fully rendered, ready-to-send email. The provider delivers it as given;
 * it does not choose subjects, render templates or add content.
 *
 * SENSITIVE: `html` and `text` may contain single-use credential links
 * (activation, password reset), and `to` is personal data. Implementations
 * must not log them or include them in thrown error messages, because BullMQ
 * stores a failed job's error message in Redis as its failure reason.
 */
export interface EmailMessage {
  /** One recipient address. One message per recipient, one job per message. */
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  /** Plain-text alternative. Recommended for transactional mail. */
  readonly text?: string | undefined;
}

/** What the caller gets back once the provider has accepted a message. */
export interface EmailSendResult {
  /** The provider's ID for the message, for tracing it in the vendor dashboard. Not secret. */
  readonly messageId: string;
}

export interface EmailProvider {
  /**
   * Hands the message to the provider. Resolves once the provider has
   * ACCEPTED it, which does not mean it was delivered.
   *
   * Rejects on any failure. That includes vendor failures the SDK reports as
   * a returned error value instead of throwing, so the worker (and BullMQ's
   * retry policy) always sees a rejection. Implementations should also bound
   * how long a call can take, so a hung request cannot hold a worker slot.
   */
  send(message: EmailMessage): Promise<EmailSendResult>;
}
