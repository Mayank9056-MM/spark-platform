export interface AccountActivationEmailProps {
  readonly firstName: string;
  /**
   * SENSITIVE. Full activation link containing a bearer token, built by the
   * caller. The template only places it in the message: never log it.
   */
  readonly activationUrl: string;
}
