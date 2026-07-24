import "server-only";
import type { CertificateRenderPayload } from "@/lib/credentials/extended-runtime";

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;

function pdfText(value: string) {
  const special: Record<number, number> = { 8211: 150, 8212: 151, 8216: 145, 8217: 146, 8220: 147, 8221: 148 };
  return Array.from(value).map((char) => {
    const code = char.charCodeAt(0);
    if (char === "\\" || char === "(" || char === ")") return `\\${char}`;
    if (code >= 32 && code <= 126) return char;
    const mapped = special[code] ?? (code <= 255 ? code : 63);
    return `\\${mapped.toString(8).padStart(3, "0")}`;
  }).join("");
}

function centeredX(text: string, fontSize: number) {
  const estimated = Array.from(text).length * fontSize * 0.52;
  return Math.max(40, (PAGE_WIDTH - estimated) / 2);
}

function jpegDimensions(bytes: Buffer): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    const length = bytes.readUInt16BE(offset);
    if (length < 2 || offset + length > bytes.length) return null;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: bytes.readUInt16BE(offset + 3), width: bytes.readUInt16BE(offset + 5) };
    }
    offset += length;
  }
  return null;
}

function objectBuffer(id: number, body: Buffer | string) {
  const content = Buffer.isBuffer(body) ? body : Buffer.from(body, "binary");
  return Buffer.concat([Buffer.from(`${id} 0 obj\n`, "ascii"), content, Buffer.from("\nendobj\n", "ascii")]);
}

export function generateCertificatePdf(payload: CertificateRenderPayload, templateBytes?: Buffer | null): Buffer {
  const issueDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }).format(new Date(payload.issued_at));
  const nameSize = payload.display_name.length > 38 ? 28 : payload.display_name.length > 26 ? 34 : 42;
  const journeySize = payload.journey_title.length > 70 ? 17 : 21;
  const nameY = PAGE_HEIGHT * Math.min(.72, Math.max(.30, Number(payload.template_layout?.name_y ?? .53)));
  const journeyY = PAGE_HEIGHT * Math.min(.65, Math.max(.20, Number(payload.template_layout?.journey_y ?? .40)));
  const useLightText = payload.template_layout?.text_color === "white";
  const textColor = useLightText ? "1 1 1 rg" : "0.09 0.08 0.37 rg";
  const image = templateBytes ? jpegDimensions(templateBytes) : null;

  const commands: string[] = [];
  if (image) {
    commands.push(`q ${PAGE_WIDTH} 0 0 ${PAGE_HEIGHT} 0 0 cm /Im0 Do Q`);
  } else {
    commands.push("0.96 0.965 1 rg 0 0 841.89 595.28 re f");
    commands.push("0 0 0.55 rg 0 495 841.89 100 re f");
    commands.push("0.28 0.82 0.94 rg 0 482 841.89 13 re f");
    commands.push("1 0.4 1 rg 0 469 841.89 13 re f");
    commands.push("0.33 0.84 0.55 rg 0 456 841.89 13 re f");
    commands.push("0.33 0.84 0.55 RG 36 w 700 -5 125 125 re S");
    commands.push("1 0.4 1 RG 22 w -45 65 130 130 re S");
    commands.push("0 0 0.55 RG 3 w 34 34 773.89 527.28 re S");
    commands.push("BT /F2 19 Tf 1 1 1 rg 54 535 Td (ESTIMULO) Tj ET");
  }

  commands.push(`BT /F1 11 Tf ${textColor} ${centeredX("CERTIFICADO DE CONCLUSAO", 11)} ${PAGE_HEIGHT * .77} Td (${pdfText("CERTIFICADO DE CONCLUSÃO")}) Tj ET`);
  commands.push(`BT /F2 ${nameSize} Tf ${textColor} ${centeredX(payload.display_name, nameSize)} ${nameY} Td (${pdfText(payload.display_name)}) Tj ET`);
  commands.push(`BT /F1 15 Tf ${textColor} ${centeredX("concluiu a jornada", 15)} ${journeyY + 34} Td (${pdfText("concluiu a jornada")}) Tj ET`);
  commands.push(`BT /F2 ${journeySize} Tf ${textColor} ${centeredX(payload.journey_title, journeySize)} ${journeyY} Td (${pdfText(payload.journey_title)}) Tj ET`);
  commands.push(`BT /F1 10 Tf ${textColor} 58 76 Td (${pdfText(`Emitido em ${issueDate}`)}) Tj ET`);
  commands.push(`BT /F1 9 Tf ${textColor} 58 55 Td (${pdfText(`Código de validação: ${payload.verification_code}`)}) Tj ET`);
  commands.push(`BT /F1 8 Tf ${textColor} 585 55 Td (${pdfText("Valide em: /credenciais/" + payload.verification_code)}) Tj ET`);
  const stream = Buffer.from(commands.join("\n"), "binary");

  const resources = image ? "/Font << /F1 4 0 R /F2 5 0 R >> /XObject << /Im0 7 0 R >>" : "/Font << /F1 4 0 R /F2 5 0 R >>";
  const objects: Buffer[] = [
    objectBuffer(1, "<< /Type /Catalog /Pages 2 0 R >>"),
    objectBuffer(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    objectBuffer(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << ${resources} >> /Contents 6 0 R >>`),
    objectBuffer(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"),
    objectBuffer(5, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"),
    objectBuffer(6, Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`, "ascii"), stream, Buffer.from("\nendstream", "ascii")])),
  ];
  if (image && templateBytes) {
    objects.push(objectBuffer(7, Buffer.concat([
      Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${templateBytes.length} >>\nstream\n`, "ascii"),
      templateBytes,
      Buffer.from("\nendstream", "ascii"),
    ])));
  }

  const header = Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "binary");
  const offsets: number[] = [0];
  let cursor = header.length;
  for (const object of objects) { offsets.push(cursor); cursor += object.length; }
  const xrefOffset = cursor;
  const count = objects.length + 1;
  const xref = ["xref", `0 ${count}`, "0000000000 65535 f ", ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `)].join("\n");
  const trailer = `\n${xref}\ntrailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return Buffer.concat([header, ...objects, Buffer.from(trailer, "ascii")]);
}
