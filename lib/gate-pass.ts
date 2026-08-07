import QRCode from "qrcode";
import { PDFDocument, rgb, StandardFonts, type PDFFont } from "pdf-lib";

// pdf-lib doesn't auto-wrap text — without this, a long event/tier name just
// overflows its line and collides with whatever is drawn below it (exactly
// the overlap bug seen on real gate passes). This wraps manually by measuring
// each word against the available width before committing it to a line.
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function generateGatePassPdf({
  eventTitle, venue, startsAt, buyerName, ticketNumber,
}: { eventTitle: string; venue: string; startsAt: string; buyerName: string; ticketNumber: string }) {
  const qrDataUrl = await QRCode.toDataURL(ticketNumber, { margin: 1, width: 400, color: { dark: "#0A0A0B", light: "#FAF7EF" } });
  const qrBytes = Buffer.from(qrDataUrl.split(",")[1], "base64");

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([420, 640]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const qrImage = await pdf.embedPng(qrBytes);

  const contentWidth = 340;
  const marginX = 40;

  // Background + header bar
  page.drawRectangle({ x: 0, y: 0, width: 420, height: 640, color: rgb(0.039, 0.039, 0.043) });
  page.drawRectangle({ x: 0, y: 610, width: 420, height: 6, color: rgb(0.79, 0.635, 0.153) });

  let y = 565;
  page.drawText("UNINEXUS CONNECT", { x: marginX, y, size: 19, font: bold, color: rgb(0.79, 0.635, 0.153) });
  y -= 22;
  page.drawText("GATE PASS", { x: marginX, y, size: 10, font: regular, color: rgb(0.9, 0.88, 0.83) });
  y -= 36;

  // Event title — wraps up to 2 lines, truncates gracefully beyond that
  const titleLines = wrapText(eventTitle, bold, 17, contentWidth).slice(0, 2);
  for (const line of titleLines) {
    page.drawText(line, { x: marginX, y, size: 17, font: bold, color: rgb(0.98, 0.97, 0.94) });
    y -= 22;
  }
  y -= 6;

  // Venue — wraps up to 2 lines
  const venueLines = wrapText(venue, regular, 11, contentWidth).slice(0, 2);
  for (const line of venueLines) {
    page.drawText(line, { x: marginX, y, size: 11, font: regular, color: rgb(0.7, 0.68, 0.63) });
    y -= 16;
  }

  page.drawText(new Date(startsAt).toLocaleString("en-KE", { dateStyle: "full", timeStyle: "short" }), {
    x: marginX, y, size: 10, font: regular, color: rgb(0.7, 0.68, 0.63),
  });

  // QR code — fixed position near the bottom, always clear of the text above
  const qrSize = 210;
  page.drawImage(qrImage, { x: (420 - qrSize) / 2, y: 190, width: qrSize, height: qrSize });

  page.drawText(ticketNumber, { x: marginX, y: 145, size: 13, font: bold, color: rgb(0.79, 0.635, 0.153) });
  page.drawText(`Issued to: ${buyerName}`, { x: marginX, y: 122, size: 10, font: regular, color: rgb(0.85, 0.83, 0.78) });

  const footerLines = wrapText("Present this pass — printed or on your phone — at the gate for entry.", regular, 8.5, contentWidth);
  let footerY = 92;
  for (const line of footerLines) {
    page.drawText(line, { x: marginX, y: footerY, size: 8.5, font: regular, color: rgb(0.55, 0.53, 0.5) });
    footerY -= 12;
  }

  return pdf.save();
}
