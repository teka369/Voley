type DocLike = { name: string; doc: string; phone: string; position: string };

const WINANSI: Record<string, number> = {
  á: 0xe1,
  é: 0xe9,
  í: 0xed,
  ó: 0xf3,
  ú: 0xfa,
  Á: 0xc1,
  É: 0xc9,
  Í: 0xcd,
  Ó: 0xd3,
  Ú: 0xda,
  ñ: 0xf1,
  Ñ: 0xd1,
  ü: 0xfc,
  Ü: 0xdc,
  "¿": 0xbf,
  "¡": 0xa1,
  "°": 0xb0,
  "–": 0x96,
  "—": 0x97,
};

function encodePdf(s: string): string {
  let out = "";
  for (const ch of s) {
    if (ch === "(" || ch === ")" || ch === "\\") {
      out += `\\${ch}`;
      continue;
    }
    const code = ch.codePointAt(0) ?? 63;
    if (code >= 32 && code <= 126) {
      out += ch;
      continue;
    }
    const win = WINANSI[ch];
    if (win) {
      out += `\\${win.toString(8).padStart(3, "0")}`;
      continue;
    }
    out += "?";
  }
  return out;
}

export function buildPdf(title: string, lines: string[]): Uint8Array {
  const all = [title, "", ...lines];
  const per = 44;
  const chunks: string[][] = [];
  for (let i = 0; i < all.length; i += per) chunks.push(all.slice(i, i + per));
  if (!chunks.length) chunks.push([title]);

  const objects: { id: number; body: string }[] = [
    { id: 1, body: "" },
    { id: 2, body: "" },
    {
      id: 3,
      body: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    },
  ];
  const pageIds: number[] = [];
  let nextId = 4;
  for (const chunk of chunks) {
    const contentId = nextId++;
    const pageId = nextId++;
    pageIds.push(pageId);
    const cmds = ["BT", "48 810 Td", "14 TL"];
    chunk.forEach((line) => {
      cmds.push("/F1 11 Tf");
      cmds.push(`(${encodePdf(line.slice(0, 95))}) Tj`);
      cmds.push("T*");
    });
    cmds.push("ET");
    const stream = cmds.join("\n");
    objects.push({
      id: contentId,
      body: `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    });
    objects.push({
      id: pageId,
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${contentId} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`,
    });
  }
  objects[0]!.body = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[1]!.body = `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`;
  objects.sort((a, b) => a.id - b.id);

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets[obj.id] = pdf.length;
    pdf += `${obj.id} 0 obj\n${obj.body}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

export function toCsv(rows: string[][]): string {
  const esc = (s: string) => (/[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  return `\uFEFF${rows.map((r) => r.map(esc).join(";")).join("\r\n")}`;
}

export function toExcelXml(rows: string[][]): string {
  const amp = "&" + "amp;";
  const lt = "&" + "lt;";
  const gt = "&" + "gt;";
  const quot = "&" + "quot;";
  const esc = (s: string) => s.replace(/&/g, amp).replace(/</g, lt).replace(/>/g, gt).replace(/"/g, quot);
  const cell = (c: string) => "<Cell><Data ss:Type=\"String\">" + esc(c) + "</Data></Cell>";
  const body = rows.map((r) => "<Row>" + r.map(cell).join("") + "</Row>").join("");
  return (
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
    "<?mso-application progid=\"Excel.Sheet\"?>\n" +
    "<Workbook xmlns=\"urn:schemas-microsoft-com:office:spreadsheet\" xmlns:ss=\"urn:schemas-microsoft-com:office:spreadsheet\">\n" +
    "<Worksheet ss:Name=\"Documentos\"><Table>" +
    body +
    "</Table></Worksheet>\n</Workbook>"
  );
}

export function docTable(rows: DocLike[]): string[][] {
  return [
    ["Nombre", "Identificación", "Celular", "Posición"],
    ...rows.map((r) => [r.name, r.doc, r.phone, r.position]),
  ];
}

export function safeFile(base: string): string {
  return base
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "volleymanager";
}

export function downloadBlob(filename: string, blob: Blob): boolean {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  } catch {
    return false;
  }
}

export function downloadText(filename: string, content: string, mime: string): boolean {
  return downloadBlob(filename, new Blob([content], { type: mime }));
}

export function downloadPdf(filename: string, title: string, lines: string[]): boolean {
  const bytes = buildPdf(title, lines);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return downloadBlob(filename, new Blob([copy], { type: "application/pdf" }));
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback below */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
