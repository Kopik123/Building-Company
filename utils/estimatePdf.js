const PDF_PAGE_WIDTH = 595;
const PDF_PAGE_HEIGHT = 842;
const PDF_LEFT = 40;
const PDF_TOP = 802;
const PDF_LINE_HEIGHT = 14;
const PDF_LINES_PER_PAGE = 48;

const sanitizePdfText = (value) => String(value ?? '')
  .replaceAll(/[^\x20-\x7E]/g, '?')
  .replaceAll(/\\/g, '\\\\')
  .replaceAll(/\(/g, '\\(')
  .replaceAll(/\)/g, '\\)');

const wrapLine = (text, maxLength = 84) => {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let current = '';
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxLength) {
      current = next;
      return;
    }
    if (current) lines.push(current);
    current = word;
  });
  if (current) lines.push(current);
  return lines;
};

const formatCurrency = (value) => `GBP ${Number(value || 0).toLocaleString('en-GB', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})}`;

const buildEstimatePdfLines = (estimate) => {
  const lines = [];
  lines.push(`Estimate: ${estimate.title || 'Estimate'}`);
  lines.push(`Status: ${estimate.status || 'draft'}`);
  if (estimate.quote?.id) {
    lines.push(`Quote: ${estimate.quote.id}`);
  }
  if (estimate.quote?.projectType || estimate.quote?.location) {
    lines.push(`Project: ${estimate.quote?.projectType || 'quote'} / ${estimate.quote?.location || '-'}`);
  }
  if (estimate.project?.title) {
    lines.push(`Project record: ${estimate.project.title}`);
  }
  lines.push(`Generated: ${new Date().toLocaleString('en-GB')}`);
  lines.push('');
  if (estimate.notes) {
    wrapLine(`Notes: ${estimate.notes}`).forEach((line) => lines.push(line));
    lines.push('');
  }
  lines.push('Estimate lines', '----------------------------------------');
  const estimateLines = Array.isArray(estimate.lines) ? estimate.lines : [];
  if (!estimateLines.length) {
    lines.push('No line items added yet.');
  } else {
    estimateLines.forEach((line, index) => {
      wrapLine(`${index + 1}. ${line.description || 'Line item'}`).forEach((item) => lines.push(item));
      lines.push(`    Type: ${line.lineType || 'custom'} | Qty: ${line.quantity || 0} ${line.unit || ''} | Total: ${formatCurrency(line.lineTotal || 0)}`);
      if (line.notes) {
        wrapLine(`    Notes: ${line.notes}`).forEach((item) => lines.push(item));
      }
      lines.push('');
    });
  }
  lines.push('----------------------------------------', `Subtotal: ${formatCurrency(estimate.subtotal || 0)}`, `Total: ${formatCurrency(estimate.total || 0)}`);
  return lines;
};

const buildPdfDocument = (pages) => {
  const objects = [];
  const addObject = (body) => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = addObject('<< /Type /Catalog /Pages 2 0 R >>');
  const pagesId = addObject('');
  const pageIds = [];
  const fontPlaceholder = '__FONT_REF__';

  pages.forEach((pageLines) => {
    const content = [
      'BT',
      '/F1 11 Tf',
      `${PDF_LEFT} ${PDF_TOP} Td`,
      `${PDF_LINE_HEIGHT} TL`,
      ...pageLines.map((line) => `(${sanitizePdfText(line)}) Tj T*`),
      'ET'
    ].join('\n');
    const contentId = addObject(`<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontPlaceholder} >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  });

  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  objects[pagesId - 1] = `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >>`;

  let body = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(body, 'utf8'));
    const objContent = object.replaceAll(fontPlaceholder, `${fontId} 0 R`);
    body += `${index + 1} 0 obj\n${objContent}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(body, 'utf8');
  body += `xref\n0 ${objects.length + 1}\n`;
  body += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    body += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  body += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(body, 'utf8');
};

const generateEstimatePdfBuffer = (estimate) => {
  const lines = buildEstimatePdfLines(estimate);
  const pages = [];
  for (let index = 0; index < lines.length; index += PDF_LINES_PER_PAGE) {
    pages.push(lines.slice(index, index + PDF_LINES_PER_PAGE));
  }
  return buildPdfDocument(pages.length ? pages : [['Estimate is empty.']]);
};

module.exports = {
  generateEstimatePdfBuffer
};
