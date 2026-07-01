export interface ParsedTx {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  amount: number; // positivo = crédito/receita, negativo = débito/despesa
}

// ── Helpers ────────────────────────────────────────────────────────────────

function ofxDate(raw: string): string {
  const clean = raw.replace(/\[.*?\]/, "").trim();
  return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
}

function normalizeAccents(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// ── OFX SGML (formato 1.x — maioria dos bancos brasileiros) ───────────────

function parseSGML(content: string): ParsedTx[] {
  const results: ParsedTx[] = [];
  const upper = content.toUpperCase();
  let pos = 0;

  while (true) {
    const start = upper.indexOf("<STMTTRN>", pos);
    if (start === -1) break;

    let end = upper.indexOf("</STMTTRN>", start);
    if (end === -1) {
      const next = upper.indexOf("<STMTTRN>", start + 9);
      end = next === -1 ? content.length : next;
    }

    const block = content.slice(start + 9, end);
    pos = end + 1;

    const tag = (name: string) => {
      const re = new RegExp(`<${name}>([^\\n<]*)`, "i");
      const m = re.exec(block);
      return m ? m[1].trim() : "";
    };

    const dtPosted = tag("DTPOSTED");
    const trnAmt = tag("TRNAMT");
    if (!dtPosted || !trnAmt) continue;

    const amount = parseFloat(trnAmt.replace(",", "."));
    if (isNaN(amount)) continue;

    const memo = tag("MEMO") || tag("NAME") || tag("CHECKNUM") || "Sem descrição";
    const fitid = tag("FITID");

    results.push({
      id: fitid || `${dtPosted}-${Math.random().toString(36).slice(2, 8)}`,
      date: ofxDate(dtPosted),
      description: memo,
      amount,
    });
  }

  return results;
}

// ── OFX XML (formato 2.x) ─────────────────────────────────────────────────

function parseXML(content: string): ParsedTx[] {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/xml");
    const results: ParsedTx[] = [];

    doc.querySelectorAll("STMTTRN").forEach((node) => {
      const t = (tag: string) => node.querySelector(tag)?.textContent?.trim() || "";
      const amount = parseFloat(t("TRNAMT").replace(",", "."));
      if (isNaN(amount)) return;
      results.push({
        id: t("FITID") || Math.random().toString(36).slice(2),
        date: ofxDate(t("DTPOSTED")),
        description: t("MEMO") || t("NAME") || "Sem descrição",
        amount,
      });
    });

    return results;
  } catch {
    return [];
  }
}

export function parseOFX(content: string): ParsedTx[] {
  const trimmed = content.trimStart();
  if (trimmed.startsWith("<?xml") || trimmed.startsWith("<?OFX")) return parseXML(content);
  return parseSGML(content);
}

// ── CSV ───────────────────────────────────────────────────────────────────

function detectSep(line: string): string {
  const counts = { ";": 0, ",": 0, "\t": 0 };
  for (const ch of line) if (ch in counts) counts[ch as keyof typeof counts]++;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function parseCSVDate(raw: string): string | null {
  const s = raw.trim();
  const m1 = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m1) return `${m1[3]}-${m1[2].padStart(2, "0")}-${m1[1].padStart(2, "0")}`;
  const m2 = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(s);
  if (m2) return `${m2[3]}-${m2[2].padStart(2, "0")}-${m2[1].padStart(2, "0")}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m3 = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  if (m3) return `${m3[1]}-${m3[2]}-${m3[3]}`;
  return null;
}

function parseCSVAmount(raw: string): number {
  let s = raw.trim().replace(/[R$\s]/g, "").replace(/^-\s*/, "-");
  if (/^-?\d{1,3}(\.\d{3})*(,\d{0,2})?$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  return parseFloat(s);
}

function splitCSVRow(line: string, sep: string): string[] {
  const cols: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (ch === sep && !inQuotes) {
      cols.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  cols.push(cur.trim());
  return cols;
}

export function parseCSV(content: string): ParsedTx[] {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const sep = detectSep(lines[0]);

  const headers = splitCSVRow(lines[0], sep).map((h) =>
    normalizeAccents(h).replace(/\s+/g, "")
  );

  const findCol = (...names: string[]) =>
    names.reduce(
      (found, n) => (found >= 0 ? found : headers.findIndex((h) => h.includes(n))),
      -1
    );

  const dateCol = findCol("data", "date", "dt");
  const descCol = findCol("descricao", "historico", "lancamento", "titulo", "memo", "description", "complemento");
  const amtCol = findCol("valor", "amount", "value", "trnamt", "montante");
  const creditCol = findCol("credito", "credit", "entrada", "deposito");
  const debitCol = findCol("debito", "debit", "saida", "retirada");

  if (dateCol === -1) return [];

  const results: ParsedTx[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = splitCSVRow(lines[i], sep);
    if (row.length < 2) continue;

    const date = parseCSVDate(row[dateCol] || "");
    if (!date) continue;

    const desc = descCol >= 0 ? row[descCol] : row.find((_, j) => j !== dateCol) || "Sem descrição";

    let amount = 0;
    if (amtCol >= 0) {
      amount = parseCSVAmount(row[amtCol] || "0");
    } else if (creditCol >= 0 || debitCol >= 0) {
      const credit = creditCol >= 0 ? parseCSVAmount(row[creditCol] || "0") : 0;
      const debit = debitCol >= 0 ? parseCSVAmount(row[debitCol] || "0") : 0;
      if (!isNaN(credit) && credit > 0) amount = credit;
      else if (!isNaN(debit) && debit > 0) amount = -debit;
    }

    if (!amount || isNaN(amount)) continue;

    results.push({
      id: `csv-${i}-${Math.random().toString(36).slice(2, 8)}`,
      date,
      description: desc || "Sem descrição",
      amount,
    });
  }

  return results;
}

// ── Entrypoint ────────────────────────────────────────────────────────────

export async function parseFile(file: File): Promise<ParsedTx[]> {
  let content = await file.text();

  const hasMojibake = ["Ã©", "Ã£", "Ã§", "Ã¢", "Ã³", "Ãº"].some((s) => content.includes(s));
  if (hasMojibake) {
    content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) ?? "");
      reader.onerror = reject;
      reader.readAsText(file, "ISO-8859-1");
    });
  }

  const name = file.name.toLowerCase();
  if (name.endsWith(".ofx") || name.endsWith(".ofc")) return parseOFX(content);
  if (name.endsWith(".csv") || name.endsWith(".txt")) return parseCSV(content);

  if (content.includes("<STMTTRN>") || content.includes("<OFX>")) return parseOFX(content);
  return parseCSV(content);
}
