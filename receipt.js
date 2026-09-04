const PDFDocument = require('pdfkit');

const INK = '#0B1220';
const COPPER = '#1769FF';
const COPPER_BRIGHT = '#2F8CFF';
const TEXT_SOFT = '#45566B';
const TEXT_MUTE = '#8296A8';
const LINE = '#E4E9F0';
const OK = '#1E9E63';

function money(amount, currency) {
  return `${currency} ${Number(amount).toLocaleString()}`;
}

/**
 * Renders a branded PDF receipt for a paid order.
 * order: { plan, amount, name, email, phone, domain, currency }
 * meta: { reference, paidAt (Date) }
 * Returns a Buffer.
 */
function generateReceiptPdf(order, meta) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = doc.page.width;
    const marginX = 56;
    const currency = order.currency || 'ZMW';

    // header band
    doc.rect(0, 0, pageW, 130).fill(INK);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(22).text('nadine', marginX, 44, { continued: true });
    doc.fillColor(COPPER_BRIGHT).text(' CLOUD', { continued: false });
    doc.fillColor('#B9C7D4').font('Helvetica').fontSize(10).text('www.nadinecloud.com', marginX, 74);

    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(18).text('RECEIPT', 0, 44, { align: 'right', width: pageW - marginX });
    doc.fillColor('#B9C7D4').font('Helvetica').fontSize(10).text(meta.reference, 0, 68, { align: 'right', width: pageW - marginX });

    // paid badge
    const paidDate = meta.paidAt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    doc.fillColor('#B9C7D4').fontSize(10).text(paidDate, 0, 84, { align: 'right', width: pageW - marginX });

    let y = 165;
    doc.roundedRect(marginX, y, 90, 26, 13).fill(OK);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11).text('PAID', marginX, y + 8, { width: 90, align: 'center' });

    y += 55;
    // billed to / order info two-column block
    doc.fillColor(TEXT_MUTE).font('Helvetica-Bold').fontSize(9).text('BILLED TO', marginX, y);
    doc.fillColor(TEXT_MUTE).font('Helvetica-Bold').fontSize(9).text('ORDER DETAILS', pageW / 2, y);

    y += 16;
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(12).text(order.name || '-', marginX, y);
    doc.fillColor(TEXT_MUTE).font('Helvetica-Bold').fontSize(9).text('Reference', pageW / 2, y + 1);
    doc.fillColor(INK).font('Helvetica').fontSize(11).text(meta.reference, pageW / 2 + 90, y - 1);

    y += 18;
    doc.fillColor(TEXT_SOFT).font('Helvetica').fontSize(10).text(order.email || '-', marginX, y);
    doc.fillColor(TEXT_MUTE).font('Helvetica-Bold').fontSize(9).text('Date', pageW / 2, y);
    doc.fillColor(INK).font('Helvetica').fontSize(10).text(paidDate, pageW / 2 + 90, y - 1);

    y += 16;
    if (order.phone) doc.fillColor(TEXT_SOFT).font('Helvetica').fontSize(10).text(order.phone, marginX, y);
    doc.fillColor(TEXT_MUTE).font('Helvetica-Bold').fontSize(9).text('Payment method', pageW / 2, y);
    doc.fillColor(INK).font('Helvetica').fontSize(10).text('Mobile Money', pageW / 2 + 90, y - 1);

    y += 40;
    // line item table
    doc.rect(marginX, y, pageW - marginX * 2, 32).fill('#F3F6FA');
    doc.fillColor(TEXT_MUTE).font('Helvetica-Bold').fontSize(9)
      .text('DESCRIPTION', marginX + 14, y + 11)
      .text('AMOUNT', 0, y + 11, { align: 'right', width: pageW - marginX - 14 });

    y += 32;
    const rowH = 40;
    doc.moveTo(marginX, y).lineTo(pageW - marginX, y).strokeColor(LINE).lineWidth(1).stroke();
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text(order.plan, marginX + 14, y + 13, { width: pageW - marginX * 2 - 180 });
    if (order.domain) {
      doc.fillColor(TEXT_MUTE).font('Helvetica').fontSize(9).text(`Domain: ${order.domain}`, marginX + 14, y + 27);
    }
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text(money(order.amount, currency), 0, y + 13, { align: 'right', width: pageW - marginX - 14 });
    y += rowH + (order.domain ? 4 : 0);

    doc.moveTo(marginX, y).lineTo(pageW - marginX, y).strokeColor(LINE).lineWidth(1).stroke();
    y += 18;
    doc.fillColor(TEXT_MUTE).font('Helvetica-Bold').fontSize(10).text('TOTAL PAID', marginX + 14, y);
    doc.fillColor(COPPER).font('Helvetica-Bold').fontSize(16).text(money(order.amount, currency), 0, y - 4, { align: 'right', width: pageW - marginX - 14 });

    // footer
    const footerY = doc.page.height - 120;
    doc.moveTo(marginX, footerY).lineTo(pageW - marginX, footerY).strokeColor(LINE).lineWidth(1).stroke();
    doc.fillColor(TEXT_SOFT).font('Helvetica-Bold').fontSize(10).text('Thank you for your business.', marginX, footerY + 18);
    doc.fillColor(TEXT_MUTE).font('Helvetica').fontSize(9)
      .text('Nadine Cloud is a service of Nadine Omni Trading Limited.', marginX, footerY + 34)
      .text('info@nadinecloud.com  ·  +260 77 034 6698  ·  www.nadinecloud.com', marginX, footerY + 48);

    doc.end();
  });
}

module.exports = { generateReceiptPdf };
