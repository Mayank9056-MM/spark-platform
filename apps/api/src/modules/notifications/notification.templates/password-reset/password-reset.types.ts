export interface PasswordResetEmailProps {
  readonly firstName: string;
  /**
   * SENSITIVE. Full password-reset link containing a bearer token, built by
   * the caller. The template only places it in the message: never log it.
   */
  readonly resetUrl: string;
}
