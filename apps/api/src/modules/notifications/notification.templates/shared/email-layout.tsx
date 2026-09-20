import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const BRAND_NAME = 'S.P.A.R.K.';
const FONT_STACK = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const emailStyles = {
  body: { margin: 0, padding: 0, backgroundColor: '#f4f5f7', fontFamily: FONT_STACK },
  preheader: {
    display: 'none',
    maxHeight: 0,
    overflow: 'hidden',
    opacity: 0,
    color: '#f4f5f7',
  },
  outerCell: { padding: '24px 12px' },
  card: { maxWidth: '560px', backgroundColor: '#ffffff', borderRadius: '8px' },
  cardBody: { padding: '32px' },
  brand: { margin: '0 0 24px', fontSize: '14px', fontWeight: 700, color: '#1d4ed8' },
  heading: { margin: '0 0 16px', fontSize: '22px', lineHeight: '28px', color: '#111827' },
  paragraph: { margin: '0 0 16px', fontSize: '15px', lineHeight: '24px', color: '#374151' },
  detail: { margin: '0 0 8px', fontSize: '14px', lineHeight: '22px', color: '#374151' },
  button: {
    display: 'inline-block',
    padding: '12px 24px',
    backgroundColor: '#1d4ed8',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 600,
    textDecoration: 'none',
    borderRadius: '6px',
  },
  link: { color: '#1d4ed8', wordBreak: 'break-all' },
  footer: { margin: '16px 0 0', fontSize: '12px', lineHeight: '18px', color: '#6b7280' },
} satisfies Record<string, CSSProperties>;

export function EmailLayout(props: {
  readonly previewText: string;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{BRAND_NAME}</title>
      </head>
      <body style={emailStyles.body}>
        <div style={emailStyles.preheader}>{props.previewText}</div>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
          <tbody>
            <tr>
              <td align="center" style={emailStyles.outerCell}>
                <table
                  role="presentation"
                  width="100%"
                  cellPadding={0}
                  cellSpacing={0}
                  style={emailStyles.card}
                >
                  <tbody>
                    <tr>
                      <td style={emailStyles.cardBody}>
                        <p style={emailStyles.brand}>{BRAND_NAME}</p>
                        {props.children}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p style={emailStyles.footer}>This is an automated message from {BRAND_NAME}.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

export function EmailHeading(props: { readonly children: ReactNode }): ReactElement {
  return <h1 style={emailStyles.heading}>{props.children}</h1>;
}

export function EmailParagraph(props: { readonly children: ReactNode }): ReactElement {
  return <p style={emailStyles.paragraph}>{props.children}</p>;
}

export function EmailDetail(props: {
  readonly label: string;
  readonly value: string;
}): ReactElement {
  return (
    <p style={emailStyles.detail}>
      <strong>{props.label}:</strong> {props.value}
    </p>
  );
}

export function EmailButton(props: {
  readonly href: string;
  readonly children: ReactNode;
}): ReactElement {
  return (
    <p style={{ margin: '0 0 24px' }}>
      <a href={props.href} style={emailStyles.button}>
        {props.children}
      </a>
    </p>
  );
}

/** Shown under a button, for mail clients that block or mangle buttons. */
export function EmailLinkFallback(props: { readonly url: string }): ReactElement {
  return (
    <p style={emailStyles.detail}>
      If the button does not work, copy and paste this link into your browser:
      <br />
      <a href={props.url} style={emailStyles.link}>
        {props.url}
      </a>
    </p>
  );
}

/** The only place react-dom/server is imported. React escapes all text and attributes. */
export function renderEmailHtml(element: ReactElement): string {
  return `<!DOCTYPE html>${renderToStaticMarkup(element)}`;
}
