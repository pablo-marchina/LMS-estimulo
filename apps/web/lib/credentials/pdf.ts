import "server-only";
import { deflateSync, inflateSync } from "node:zlib";
import type { CertificateRenderPayload } from "@/lib/credentials/extended-runtime";
import { qrMatrix } from "@/lib/credentials/qr";

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;

type EmbeddedImage = {
  name: string;
  bytes: Buffer;
  width: number;
  height: number;
  objectId: number;
  filter: "/DCTDecode" | "/FlateDecode";
};

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

function centeredWithin(text: string, fontSize: number, x: number, width: number) {
  const estimated = Array.from(text).length * fontSize * 0.52;
  return x + Math.max(0, (width - estimated) / 2);
}

function pdfColor(value: string | null | undefined, fallback: string) {
  const normalized = /^#[0-9a-f]{6}$/i.test(value ?? "") ? String(value) : fallback;
  return [1, 3, 5].map((offset) => (Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255).toFixed(4)).join(" ");
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

function paeth(left: number, up: number, upLeft: number) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const diagonalDistance = Math.abs(estimate - upLeft);
  return leftDistance <= upDistance && leftDistance <= diagonalDistance ? left : upDistance <= diagonalDistance ? up : upLeft;
}

function pngAsRgb(bytes: Buffer): { width: number; height: number; bytes: Buffer } | null {
  if (bytes.length < 33 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return null;
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  let interlace = -1;
  let palette: Buffer | null = null;
  let transparency: Buffer | null = null;
  const dataChunks: Buffer[] = [];
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "PLTE") palette = data;
    else if (type === "tRNS") transparency = data;
    else if (type === "IDAT") dataChunks.push(data);
    else if (type === "IEND") break;
    offset += length + 12;
  }
  if (!width || !height || bitDepth !== 8 || interlace !== 0 || ![0, 2, 3, 4, 6].includes(colorType)) return null;
  const channels = colorType === 0 || colorType === 3 ? 1 : colorType === 2 ? 3 : colorType === 4 ? 2 : 4;
  const stride = width * channels;
  const inflated = inflateSync(Buffer.concat(dataChunks));
  if (inflated.length < (stride + 1) * height) return null;
  const raw = Buffer.alloc(stride * height);
  let sourceOffset = 0;
  for (let row = 0; row < height; row += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    const rowOffset = row * stride;
    for (let column = 0; column < stride; column += 1) {
      const source = inflated[sourceOffset + column];
      const left = column >= channels ? raw[rowOffset + column - channels] : 0;
      const up = row > 0 ? raw[rowOffset - stride + column] : 0;
      const upLeft = row > 0 && column >= channels ? raw[rowOffset - stride + column - channels] : 0;
      raw[rowOffset + column] = filter === 0 ? source
        : filter === 1 ? (source + left) & 255
          : filter === 2 ? (source + up) & 255
            : filter === 3 ? (source + Math.floor((left + up) / 2)) & 255
              : filter === 4 ? (source + paeth(left, up, upLeft)) & 255
                : source;
    }
    sourceOffset += stride;
  }
  const rgb = Buffer.alloc(width * height * 3);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    let red = 0; let green = 0; let blue = 0; let alpha = 255;
    const input = pixel * channels;
    if (colorType === 0) red = green = blue = raw[input];
    if (colorType === 2) { red = raw[input]; green = raw[input + 1]; blue = raw[input + 2]; }
    if (colorType === 3) {
      const index = raw[input];
      red = palette?.[index * 3] ?? 0; green = palette?.[index * 3 + 1] ?? 0; blue = palette?.[index * 3 + 2] ?? 0;
      alpha = transparency?.[index] ?? 255;
    }
    if (colorType === 4) { red = green = blue = raw[input]; alpha = raw[input + 1]; }
    if (colorType === 6) { red = raw[input]; green = raw[input + 1]; blue = raw[input + 2]; alpha = raw[input + 3]; }
    const output = pixel * 3;
    rgb[output] = Math.round((red * alpha + 255 * (255 - alpha)) / 255);
    rgb[output + 1] = Math.round((green * alpha + 255 * (255 - alpha)) / 255);
    rgb[output + 2] = Math.round((blue * alpha + 255 * (255 - alpha)) / 255);
  }
  return { width, height, bytes: deflateSync(rgb) };
}

function objectBuffer(id: number, body: Buffer | string) {
  const content = Buffer.isBuffer(body) ? body : Buffer.from(body, "binary");
  return Buffer.concat([Buffer.from(`${id} 0 obj\n`, "ascii"), content, Buffer.from("\nendobj\n", "ascii")]);
}

function imageCommand(image: EmbeddedImage, x: number, y: number, maxWidth: number, maxHeight: number) {
  const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  return `q ${width.toFixed(2)} 0 0 ${height.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /${image.name} Do Q`;
}

function qrCommands(value: string, x: number, y: number, size: number) {
  const matrix = qrMatrix(value);
  const quiet = 4;
  const moduleSize = size / (matrix.length + quiet * 2);
  const commands = [`1 1 1 rg ${x} ${y} ${size} ${size} re f`, "0 0 0 rg"];
  matrix.forEach((row, rowIndex) => row.forEach((dark, columnIndex) => {
    if (!dark) return;
    const px = x + (columnIndex + quiet) * moduleSize;
    const py = y + (matrix.length - 1 - rowIndex + quiet) * moduleSize;
    commands.push(`${px.toFixed(2)} ${py.toFixed(2)} ${moduleSize.toFixed(2)} ${moduleSize.toFixed(2)} re f`);
  }));
  return commands;
}

export function generateCertificatePdf(payload: CertificateRenderPayload, templateBytes?: Buffer | null, issuerLogoBytes?: Buffer | null, signatureBytes?: Buffer | null): Buffer {
  const issueDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }).format(new Date(payload.issued_at));
  const nameSize = payload.display_name.length > 38 ? 28 : payload.display_name.length > 26 ? 34 : 42;
  const journeySize = payload.journey_title.length > 70 ? 17 : 21;
  const nameY = PAGE_HEIGHT * Math.min(.72, Math.max(.30, Number(payload.template_layout?.name_y ?? .53)));
  const journeyY = PAGE_HEIGHT * Math.min(.65, Math.max(.20, Number(payload.template_layout?.journey_y ?? .40)));
  const useLightText = payload.template_layout?.text_color === "white";
  const primaryColor = pdfColor(payload.issuer?.primary_color, "#13115B");
  const secondaryColor = pdfColor(payload.issuer?.secondary_color, "#54D68C");
  const textColor = useLightText ? "1 1 1 rg" : `${primaryColor} rg`;
  const verificationUrl = payload.verification_url ?? `/credenciais/${payload.verification_code}`;
  const images: EmbeddedImage[] = [];
  const register = (name: string, bytes?: Buffer | null) => {
    if (!bytes) return null;
    const jpeg = jpegDimensions(bytes);
    if (jpeg) {
      const image = { name, bytes, ...jpeg, objectId: 7 + images.length, filter: "/DCTDecode" as const };
      images.push(image); return image;
    }
    const png = pngAsRgb(bytes);
    if (png) {
      const image = { name, ...png, objectId: 7 + images.length, filter: "/FlateDecode" as const };
      images.push(image); return image;
    }
    return null;
  };
  const background = register("Im0", templateBytes);
  const logo = register("Im1", issuerLogoBytes);
  const signature = register("Im2", signatureBytes);

  const commands: string[] = [];
  if (background) commands.push(`q ${PAGE_WIDTH} 0 0 ${PAGE_HEIGHT} 0 0 cm /${background.name} Do Q`);
  else {
    commands.push("0.96 0.965 1 rg 0 0 841.89 595.28 re f");
    commands.push(`${primaryColor} rg 0 495 841.89 100 re f`);
    commands.push(`${secondaryColor} rg 0 469 841.89 26 re f`);
    commands.push(`${primaryColor} RG 3 w 34 34 773.89 527.28 re S`);
  }
  if (logo) commands.push(imageCommand(logo, 52, 507, 120, 54));
  else commands.push(`BT /F2 19 Tf ${background ? textColor : "1 1 1 rg"} 54 535 Td (${pdfText(payload.issuer?.name ?? "ESTÍMULO")}) Tj ET`);
  commands.push(`BT /F1 11 Tf ${textColor} ${centeredX("CERTIFICADO DE CONCLUSAO", 11)} ${PAGE_HEIGHT * .77} Td (${pdfText("CERTIFICADO DE CONCLUSÃO")}) Tj ET`);
  commands.push(`BT /F2 ${nameSize} Tf ${textColor} ${centeredX(payload.display_name, nameSize)} ${nameY} Td (${pdfText(payload.display_name)}) Tj ET`);
  commands.push(`BT /F1 15 Tf ${textColor} ${centeredX("concluiu a jornada", 15)} ${journeyY + 34} Td (${pdfText("concluiu a jornada")}) Tj ET`);
  commands.push(`BT /F2 ${journeySize} Tf ${textColor} ${centeredX(payload.journey_title, journeySize)} ${journeyY} Td (${pdfText(payload.journey_title)}) Tj ET`);
  commands.push(`BT /F1 9 Tf ${textColor} 58 94 Td (${pdfText(`Emitido em ${issueDate}`)}) Tj ET`);
  if (payload.certificate_number) commands.push(`BT /F1 9 Tf ${textColor} 58 77 Td (${pdfText(`Número: ${payload.certificate_number}`)}) Tj ET`);
  commands.push(`BT /F1 8 Tf ${textColor} 58 60 Td (${pdfText(`Validação: ${payload.verification_code}`)}) Tj ET`);
  if (signature) commands.push(imageCommand(signature, 515, 105, 170, 54));
  commands.push(`${primaryColor} RG 0.8 w 500 103 m 705 103 l S`);
  const signer = payload.issuer?.representative_name ?? payload.issuer?.name ?? "Estímulo";
  const role = payload.issuer?.representative_role ?? "Emissor responsável";
  commands.push(`BT /F2 9 Tf ${textColor} ${centeredWithin(signer, 9, 500, 205)} 88 Td (${pdfText(signer)}) Tj ET`);
  commands.push(`BT /F1 8 Tf ${textColor} ${centeredWithin(role, 8, 500, 205)} 74 Td (${pdfText(role)}) Tj ET`);
  if (payload.issuer?.cnpj) commands.push(`BT /F1 7 Tf ${textColor} ${centeredWithin(`CNPJ ${payload.issuer.cnpj}`, 7, 500, 205)} 62 Td (${pdfText(`CNPJ ${payload.issuer.cnpj}`)}) Tj ET`);
  commands.push(...qrCommands(verificationUrl, 706, 38, 96));
  commands.push(`BT /F1 6 Tf ${textColor} 705 30 Td (${pdfText("Escaneie para validar")}) Tj ET`);

  const stream = Buffer.from(commands.join("\n"), "binary");
  const xObjects = images.length ? ` /XObject << ${images.map((image) => `/${image.name} ${image.objectId} 0 R`).join(" ")} >>` : "";
  const objects: Buffer[] = [
    objectBuffer(1, "<< /Type /Catalog /Pages 2 0 R >>"),
    objectBuffer(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    objectBuffer(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >>${xObjects} >> /Contents 6 0 R >>`),
    objectBuffer(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"),
    objectBuffer(5, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"),
    objectBuffer(6, Buffer.concat([Buffer.from(`<< /Length ${stream.length} >>\nstream\n`, "ascii"), stream, Buffer.from("\nendstream", "ascii")])),
    ...images.map((image) => objectBuffer(image.objectId, Buffer.concat([
      Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter ${image.filter} /Length ${image.bytes.length} >>\nstream\n`, "ascii"),
      image.bytes,
      Buffer.from("\nendstream", "ascii"),
    ]))),
  ];
  const header = Buffer.from("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n", "binary");
  const offsets: number[] = [0];
  let cursor = header.length;
  for (const object of objects) { offsets.push(cursor); cursor += object.length; }
  const xrefOffset = cursor;
  const count = objects.length + 1;
  const xref = ["xref", `0 ${count}`, "0000000000 65535 f ", ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `)].join("\n");
  return Buffer.concat([header, ...objects, Buffer.from(`\n${xref}\ntrailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`, "ascii")]);
}
