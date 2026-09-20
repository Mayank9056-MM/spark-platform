/** What every template returns. The worker adds `to` to make an EmailMessage. */
export interface RenderedEmail {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}
