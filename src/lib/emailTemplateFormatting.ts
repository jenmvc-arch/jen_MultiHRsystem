export type EmailTemplateFormat = 'bold' | 'italic' | 'underline';

const FORMAT_TAGS: Record<EmailTemplateFormat, string> = {
  bold: 'strong',
  italic: 'em',
  underline: 'u',
};

const FORMAT_TOKEN_PATTERN = /\[\[(\/)?(bold|italic|underline)\]\]/gi;

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const renderTextSegment = (value: string) => (
  escapeHtml(value).replace(/\r?\n/g, '<br />')
);

export const wrapEmailTemplateFormatting = (
  value: string,
  format: EmailTemplateFormat,
) => `[[${format}]]${value}[[/${format}]]`;

export const renderEmailTemplateMarkupAsHtml = (value: string) => {
  const openFormats: EmailTemplateFormat[] = [];
  let html = '';
  let cursor = 0;

  for (const match of value.matchAll(FORMAT_TOKEN_PATTERN)) {
    const index = match.index ?? cursor;
    html += renderTextSegment(value.slice(cursor, index));

    const isClosing = Boolean(match[1]);
    const format = match[2].toLowerCase() as EmailTemplateFormat;
    const tag = FORMAT_TAGS[format];

    if (!isClosing) {
      openFormats.push(format);
      html += `<${tag}>`;
    } else if (openFormats.at(-1) === format) {
      openFormats.pop();
      html += `</${tag}>`;
    } else {
      html += renderTextSegment(match[0]);
    }

    cursor = index + match[0].length;
  }

  html += renderTextSegment(value.slice(cursor));
  while (openFormats.length) {
    const format = openFormats.pop()!;
    html += `</${FORMAT_TAGS[format]}>`;
  }
  return html;
};

export const stripEmailTemplateFormatting = (value: string) => (
  value.replace(FORMAT_TOKEN_PATTERN, '')
);
