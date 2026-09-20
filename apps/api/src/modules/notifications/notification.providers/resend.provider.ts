import { Resend } from 'resend';

import type { EmailMessage, EmailProvider, EmailSendResult } from './email.provider.js';

/**
 * Resend implementation of EmailProvider. Knows nothing about notification
 * types, templates or BullMQ. It does not log, does not retry and does not
 * import env: whoever constructs it passes validated configuration in, which
 * keeps unit tests free of app-wide env parsing and of real credentials.
 *
 * One send() call = one request to Resend. Retries belong to BullMQ.
 *
 * Resolving means Resend ACCEPTED the message, not that it was delivered.
 */

const DEFAULT_TIMEOUT_MS = 10_000;

const TIMED_OUT = Symbol('email-provider-timed-out');

// Only error codes matching this shape are copied into error messages.
const SAFE_ERROR_CODE = /^[a-z][a-z0-9_]{0,63}$/;

type SendRequest = Parameters<Resend['emails']['send']>[0];

export interface ResendProviderConfig {
  /** SECRET. Handed to the SDK and kept nowhere else; never log this config object. */
  readonly apiKey: string;
  /** Sender address, from RESEND_FROM_EMAIL. Must be on a domain verified in Resend. */
  readonly fromAddress: string;
  /** Upper bound for one send() call, in milliseconds. Defaults to 10 seconds. */
  readonly timeoutMs?: number | undefined;
}

/**
 * Builds the error suffix from fixed, non-sensitive fields only. The vendor's
 * free-text `message` is deliberately never read: it can echo the recipient or
 * part of the request. Reads via `in` so this compiles against SDK versions
 * whose error type lacks `statusCode`.
 */
function describeProviderError(error: object): string {
  const details: string[] = [];
  if ('name' in error && typeof error.name === 'string' && SAFE_ERROR_CODE.test(error.name)) {
    details.push(`code=${error.name}`);
  }
  if ('statusCode' in error && typeof error.statusCode === 'number') {
    details.push(`status=${error.statusCode}`);
  }
  return details.length > 0 ? ` (${details.join(', ')})` : '';
}

/**
 * Bounds how long the caller waits. This does NOT cancel the underlying HTTP
 * request: it may still complete after we give up (see the duplicate note in
 * the review). The catch discards the SDK error without chaining it, because a
 * raw SDK error may carry request or response data, and BullMQ stores the
 * thrown message in Redis as the job's failure reason.
 */
async function sendWithTimeout(client: Resend, request: SendRequest, timeoutMs: number) {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<typeof TIMED_OUT>((resolve) => {
    timer = setTimeout(() => {
      resolve(TIMED_OUT);
    }, timeoutMs);
  });

  try {
    return await Promise.race([client.emails.send(request), timeout]);
  } catch {
    throw new Error('Email provider request failed');
  } finally {
    clearTimeout(timer);
  }
}

export class ResendProvider implements EmailProvider {
  // ES-private so logging or serializing this instance cannot expose the
  // client, which holds the API key.
  readonly #client: Resend;
  readonly #from: string;
  readonly #timeoutMs: number;

  constructor(config: ResendProviderConfig) {
    const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    // As far as I know the SDK falls back to process.env.RESEND_API_KEY when
    // given a falsy key, which would bypass central config. Refuse it here.
    if (config.apiKey.trim() === '') {
      throw new Error('ResendProvider: apiKey must not be empty');
    }
    if (config.fromAddress.trim() === '') {
      throw new Error('ResendProvider: fromAddress must not be empty');
    }
    if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
      throw new Error('ResendProvider: timeoutMs must be a positive integer');
    }

    this.#client = new Resend(config.apiKey);
    this.#from = config.fromAddress;
    this.#timeoutMs = timeoutMs;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    // `text` is added only when present: with exactOptionalPropertyTypes an
    // explicit `text: undefined` is not a valid request shape.
    const base = {
      from: this.#from,
      to: message.to,
      subject: message.subject,
      html: message.html,
    };
    const request: SendRequest =
      message.text === undefined ? base : { ...base, text: message.text };

    const outcome = await sendWithTimeout(this.#client, request, this.#timeoutMs);

    if (outcome === TIMED_OUT) {
      throw new Error(`Email provider request timed out after ${this.#timeoutMs}ms`);
    }

    // The SDK reports API and network failures as a returned `error` value
    // rather than throwing (as far as I know). Turn that into a rejection so
    // the worker, and BullMQ, always see the failure.
    if (outcome.error) {
      throw new Error(`Email provider rejected the request${describeProviderError(outcome.error)}`);
    }

    // Never fabricate an id: the contract promises a real one.
    const messageId = outcome.data?.id;
    if (messageId === undefined || messageId === '') {
      throw new Error('Email provider accepted the request but returned no message id');
    }

    return { messageId };
  }
}
