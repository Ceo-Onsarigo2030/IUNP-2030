import QRCode from "qrcode";
import { PDFDocument, rgb, StandardFonts, type PDFFont } from "pdf-lib";
import { readFileSync } from "fs";
import path from "path";

const INK = rgb(0.039, 0.039, 0.043);
const GOLD = rgb(0.79, 0.635, 0.153);
const CREAM = rgb(0.98, 0.97, 0.94);
const CREAM_DIM = rgb(0.7, 0.68, 0.63);
const CREAM_FAINT = rgb(0.5, 0.48, 0.45);
const HAIRLINE = rgb(0.2, 0.19, 0.17);

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const attempt = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(attempt, size) <= maxWidth) {
      current = attempt;
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
  const qrDataUrl = await QRCode.toDataURL(ticketNumber, { margin: 1, width: 500, color: { dark: "#0A0A0B", light: "#FAF7EF" } });
  const qrBytes = Buffer.from(qrDataUrl.split(",")[1], "base64");

  const pdf = await PDFDocument.create();
  const W = 420;
  const H = 680;
  const MARGIN = 40;
  const CONTENT_WIDTH = W - MARGIN * 2;

  const page = pdf.addPage([W, H]);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const qrImage = await pdf.embedPng(qrBytes);

  const interUniLogoBytes = readFileSync(path.join(process.cwd(), "public/logos/inter-uni-logo.png"));
  const baConnectLogoBytes = readFileSync(path.join(process.cwd(), "public/logos/ba-connect-logo.png"));
  const interUniLogo = await pdf.embedPng(interUniLogoBytes);
  const baConnectLogo = await pdf.embedPng(baConnectLogoBytes);

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: INK });
  page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: GOLD });

  let y = H - 46;

  const logoBoxSize = 34;
  const logoPad = 5;
  page.drawRectangle({ x: MARGIN, y: y - logoBoxSize + 6, width: logoBoxSize, height: logoBoxSize, color: CREAM });
  page.drawImage(interUniLogo, {
    x: MARGIN + logoPad, y: y - logoBoxSize + 6 + logoPad,
    width: logoBoxSize - logoPad * 2, height: logoBoxSize - logoPad * 2,
  });
  page.drawRectangle({ x: MARGIN + logoBoxSize + 8, y: y - logoBoxSize + 6, width: logoBoxSize, height: logoBoxSize, color: CREAM });
  page.drawImage(baConnectLogo, {
    x: MARGIN + logoBoxSize + 8 + logoPad, y: y - logoBoxSize + 6 + logoPad,
    width: logoBoxSize - logoPad * 2, height: logoBoxSize - logoPad * 2,
  });

  y -= logoBoxSize + 20;

  page.drawText("UNINEXUS CONNECT", { x: MARGIN, y, size: 19, font: bold, color: GOLD });
  y -= 22;
  page.drawText("GATE PASS", { x: MARGIN, y, size: 10, font: regular, color: CREAM_DIM });
  y -= 30;

  page.drawLine({ start: { x: MARGIN, y }, end: { x: W - MARGIN, y }, thickness: 0.75, color: HAIRLINE });
  y -= 32;

  const titleLines = wrapText(eventTitle, bold, 17, CONTENT_WIDTH);
  for (const line of titleLines) {
    page.drawText(line, { x: MARGIN, y, size: 17, font: bold, color: CREAM });
    y -= 22;
  }
  y -= 4;

  const venueLines = wrapText(venue, regular, 11, CONTENT_WIDTH);
  for (const line of venueLines) {
    page.drawText(line, { x: MARGIN, y, size: 11, font: regular, color: CREAM_DIM });
    y -= 16;
  }
  y -= 2;

  page.drawText(new Date(startsAt).toLocaleString("en-KE", { dateStyle: "full", timeStyle: "short" }), {
    x: MARGIN, y, size: 10, font: regular, color: CREAM_DIM,
  });
  y -= 40;

  const qrSize = 220;
  const qrCardPad = 16;
  const qrCardSize = qrSize + qrCardPad * 2;
  const qrCardX = (W - qrCardSize) / 2;
  const qrCardY = y - qrCardSize;
  page.drawRectangle({ x: qrCardX, y: qrCardY, width: qrCardSize, height: qrCardSize, color: rgb(0.98, 0.97, 0.94) });
  page.drawImage(qrImage, { x: qrCardX + qrCardPad, y: qrCardY + qrCardPad, width: qrSize, height: qrSize });
  y = qrCardY - 34;

  const ticketWidth = bold.widthOfTextAtSize(ticketNumber, 15);
  page.drawText(ticketNumber, { x: (W - ticketWidth) / 2, y, size: 15, font: bold, color: GOLD });
  y -= 22;

  const issuedTo = `Issued to: ${buyerName}`;
  const issuedWidth = regular.widthOfTextAtSize(issuedTo, 11);
  page.drawText(issuedTo, { x: (W - issuedWidth) / 2, y, size: 11, font: regular, color: rgb(0.85, 0.83, 0.78) });
  y -= 34;

  page.drawLine({ start: { x: MARGIN, y }, end: { x: W - MARGIN, y }, thickness: 0.75, color: HAIRLINE });
  y -= 26;

  const celebrate = "Let's Celebrate Greatness Together!";
  const celebrateWidth = bold.widthOfTextAtSize(celebrate, 12.5);
  page.drawText(celebrate, { x: (W - celebrateWidth) / 2, y, size: 12.5, font: bold, color: GOLD });
  y -= 24;

  const instructionLines = wrapText(
    "Present this pass — printed or on your phone — at the gate for entry.",
    regular, 8.5, CONTENT_WIDTH
  );
  for (const line of instructionLines) {
    const lineWidth = regular.widthOfTextAtSize(line, 8.5);
    page.drawText(line, { x: (W - lineWidth) / 2, y, size: 8.5, font: regular, color: CREAM_FAINT });
    y -= 12;
  }

  return pdf.save();
}
