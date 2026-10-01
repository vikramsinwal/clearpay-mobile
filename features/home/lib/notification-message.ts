export type TextRun = {
  text: string;
  bold: boolean;
};

export type MessageBlock = {
  runs: TextRun[];
};

function parseInline(line: string): TextRun[] {
  if (!line) return [{ text: '', bold: false }];
  const parts = line.split(/(\*\*[^*]+\*\*)/g).filter((part) => part.length > 0);
  if (parts.length === 0) return [{ text: '', bold: false }];
  return parts.map((part) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return { text: part.slice(2, -2), bold: true };
    }
    return { text: part, bold: false };
  });
}

/** Turns newlines and a small bold subset into blocks. HTML is stripped, never rendered. */
export function parseNotificationMessage(message: string): MessageBlock[] {
  const normalized = message
    .replace(/\r\n/g, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<[^>]+>/g, '');

  return normalized.split('\n').map((line) => ({ runs: parseInline(line) }));
}

export function isSystemMessage(type: string, message: string): boolean {
  if (type === 'SYSTEM') return true;
  const trimmed = message.trim();
  return trimmed.length > 0 && !/\s/.test(trimmed) && /[_-]/.test(trimmed);
}
