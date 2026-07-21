import QRCode from "qrcode";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export async function generateGatePassPdf({
  eventTitle, venue, startsAt, buyerName, ticketNumber,
}: { eventTitle: string; venue: string; startsAt: string; buyerName: string; ticketNumber: string }) {
  const qrDataUrl = await QRCode.toDataURL(ticketNumber, { margin: 1, width: 400, color: { dark: "#0A0A0B", light: "#FAF7EF" } });
  const qrBytes = Buffer.from(qrDataUrl.split(",")[1], "base64");

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([420, 620]);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const qrImage = await pdf.embedPng(qrBytes);

  // Ink background
  page.drawRectangle({ x: 0, y: 0, width: 420, height: 620, color: rgb(0.039, 0.039, 0.043) });
  // Gold header bar
  page.drawRectangle({ x: 0, y: 590, width: 420, height: 6, color: rgb(0.79, 0.635, 0.153) });

  page.drawText("UNINEXUS CONNECT", { x: 40, y: 540, size: 20, font, color: rgb(0.79, 0.635, 0.153) });
  page.drawText("GATE PASS", { x: 40, y: 515, size: 11, font: fontRegular, color: rgb(0.9, 0.88, 0.83) });

  page.drawText(eventTitle, { x: 40, y: 470, size: 16, font, color: rgb(0.98, 0.97, 0.94), maxWidth: 340 });
  page.drawText(venue, { x: 40, y: 448, size: 11, font: fontRegular, color: rgb(0.7, 0.68, 0.63) });
  page.drawText(new Date(startsAt).toLocaleString("en-KE", { dateStyle: "full", timeStyle: "short" }), {
    x: 40, y: 430, size: 10, font: fontRegular, color: rgb(0.7, 0.68, 0.63),
  });

  const qrSize = 220;
  page.drawImage(qrImage, { x: (420 - qrSize) / 2, y: 160, width: qrSize, height: qrSize });

  page.drawText(ticketNumber, { x: 40, y: 120, size: 13, font, color: rgb(0.79, 0.635, 0.153) });
  page.drawText(`Issued to: ${buyerName}`, { x: 40, y: 95, size: 10, font: fontRegular, color: rgb(0.85, 0.83, 0.78) });
  page.drawText("Present this pass — printed or on your phone — at the gate for entry.", {
    x: 40, y: 60, size: 8.5, font: fontRegular, color: rgb(0.55, 0.53, 0.5), maxWidth: 340,
  });

  return pdf.save();
}
