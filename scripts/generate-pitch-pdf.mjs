import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

const OUT = path.resolve("attached_assets/Hotel-Reklamacije-Pitch.pdf");
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";

const W = 1280;
const H = 720;
const PAD = 80;

const NAVY = "#0B2545";
const TEAL = "#1B7F95";
const GOLD = "#D4A24A";
const LIGHT = "#F4F6F8";
const TEXT = "#1A2332";
const MUTED = "#5B6878";

const doc = new PDFDocument({ size: [W, H], margin: 0, autoFirstPage: false });
doc.registerFont("Reg", FONT_REG);
doc.registerFont("Bold", FONT_BOLD);
doc.pipe(fs.createWriteStream(OUT));

function bg(color = "#FFFFFF") {
  doc.rect(0, 0, W, H).fill(color);
}

function accentBar() {
  doc.rect(0, 0, 12, H).fill(GOLD);
}

function footer(num, total) {
  doc.font("Reg").fontSize(10).fillColor(MUTED)
    .text("Budvanska Rivijera • Sistem za upravljanje reklamacijama", PAD, H - 40, { width: W - 2 * PAD, align: "left" });
  doc.text(`${num} / ${total}`, PAD, H - 40, { width: W - 2 * PAD, align: "right" });
}

function title(text, y = PAD) {
  doc.font("Bold").fontSize(38).fillColor(NAVY)
    .text(text, PAD, y, { width: W - 2 * PAD });
  doc.rect(PAD, doc.y + 8, 80, 4).fill(GOLD);
  return doc.y + 30;
}

function bullet(items, startY) {
  let y = startY;
  doc.font("Reg").fontSize(20).fillColor(TEXT);
  for (const it of items) {
    doc.circle(PAD + 8, y + 12, 5).fill(TEAL);
    doc.fillColor(TEXT).font("Reg").fontSize(20)
      .text(it, PAD + 30, y, { width: W - 2 * PAD - 30 });
    y = doc.y + 14;
  }
  return y;
}

const TOTAL = 6;

// SLIDE 1 — Naslovna
doc.addPage({ size: [W, H], margin: 0 });
bg("#FFFFFF");
doc.rect(0, 0, W, H).fill(NAVY);
doc.rect(0, H - 8, W, 8).fill(GOLD);

doc.font("Reg").fontSize(14).fillColor(GOLD)
  .text("BUDVANSKA RIVIJERA", PAD, PAD, { characterSpacing: 4 });

doc.font("Bold").fontSize(64).fillColor("#FFFFFF")
  .text("Sistem za upravljanje", PAD, 220, { width: W - 2 * PAD });
doc.font("Bold").fontSize(64).fillColor("#FFFFFF")
  .text("hotelskim reklamacijama", PAD, doc.y, { width: W - 2 * PAD });

doc.font("Reg").fontSize(22).fillColor("#B8C5D6")
  .text("Web i mobilna platforma za realtime koordinaciju osoblja", PAD, doc.y + 30, { width: W - 2 * PAD });

doc.font("Reg").fontSize(14).fillColor("#8FA3BF")
  .text("Investitorski pitch  •  2026", PAD, H - 80);

// SLIDE 2 — Problem
doc.addPage({ size: [W, H], margin: 0 });
bg("#FFFFFF"); accentBar();
let y = title("Problem");
bullet([
  "Reklamacije gostiju se gube između smjena — papir, telefon, WhatsApp grupe.",
  "Recepcija ne zna ko je preuzeo zadatak niti u kojoj je fazi rješavanja.",
  "Šefovi nemaju uvid u opterećenje svog tima u realnom vremenu.",
  "Menadžment nema podatke: koliko reklamacija, koje vrste, koliko se čeka.",
  "Spori odgovor = nezadovoljan gost = loše recenzije i izgubljeni prihod.",
], y);
footer(2, TOTAL);

// SLIDE 3 — Rješenje
doc.addPage({ size: [W, H], margin: 0 });
bg("#FFFFFF"); accentBar();
y = title("Naše rješenje");
doc.font("Reg").fontSize(20).fillColor(TEXT)
  .text("Jedinstvena platforma — web aplikacija za recepciju i menadžment, mobilna aplikacija (Android/iOS) za radnike i šefove. Sve uloge povezane u realnom vremenu.", PAD, y, { width: W - 2 * PAD });

y = doc.y + 30;
const roles = [
  ["Recepcija", "Brzo zavodi reklamaciju gosta uz fotografije i prioritet."],
  ["Šef službe", "Vidi sve zadatke, dodjeljuje radnicima, prati napredak."],
  ["Radnik", "Prima notifikaciju, fotografiše rješenje, zatvara zadatak."],
  ["Menadžment", "Statistike, AI analiza, PDF izvještaji, GPS lokacije osoblja."],
];
const boxW = (W - 2 * PAD - 30) / 2;
const boxH = 110;
for (let i = 0; i < roles.length; i++) {
  const col = i % 2;
  const row = Math.floor(i / 2);
  const x = PAD + col * (boxW + 30);
  const yy = y + row * (boxH + 20);
  doc.roundedRect(x, yy, boxW, boxH, 8).fill(LIGHT);
  doc.font("Bold").fontSize(18).fillColor(NAVY).text(roles[i][0], x + 20, yy + 18, { width: boxW - 40 });
  doc.font("Reg").fontSize(14).fillColor(TEXT).text(roles[i][1], x + 20, yy + 48, { width: boxW - 40 });
}
footer(3, TOTAL);

// SLIDE 4 — Ključne funkcije
doc.addPage({ size: [W, H], margin: 0 });
bg("#FFFFFF"); accentBar();
y = title("Ključne funkcije");
bullet([
  "Realtime notifikacije (push + zvuk + vibracija) na svim uređajima.",
  "Foto dokumentacija — automatska kompresija, sigurno čuvanje u oblaku.",
  "AI analitika (Gemini) — pitaj na srpskom, dobij analizu opterećenja i uskih grla.",
  "PDF izvještaji za menadžment — dnevni, sedmični, po službama.",
  "GPS praćenje osoblja na mapi — ko je gdje, ko je trenutno aktivan.",
  "Bilingvalno (srpski / engleski), prilagođeno za sezonsko strano osoblje.",
], y);
footer(4, TOTAL);

// SLIDE 5 — Brojke iz prakse
doc.addPage({ size: [W, H], margin: 0 });
bg("#FFFFFF"); accentBar();
y = title("Rezultati u praksi");
doc.font("Reg").fontSize(16).fillColor(MUTED)
  .text("Iz aktivne upotrebe u Budvanskoj Rivijeri", PAD, y, { width: W - 2 * PAD });

const stats = [
  ["900+", "obrađenih zadataka"],
  ["89%", "stopa realizacije"],
  ["60+", "aktivnih korisnika"],
  ["7", "povezanih službi"],
];
const sW = (W - 2 * PAD - 60) / 4;
const sY = y + 80;
for (let i = 0; i < stats.length; i++) {
  const x = PAD + i * (sW + 20);
  doc.roundedRect(x, sY, sW, 200, 12).fill(NAVY);
  doc.font("Bold").fontSize(56).fillColor(GOLD)
    .text(stats[i][0], x, sY + 40, { width: sW, align: "center" });
  doc.font("Reg").fontSize(15).fillColor("#B8C5D6")
    .text(stats[i][1], x + 15, sY + 130, { width: sW - 30, align: "center" });
}

doc.font("Reg").fontSize(16).fillColor(TEXT)
  .text("Sistem aktivno radi u produkciji, sa kontinuiranim ažuriranjima preko Live Updates kanala — bez prekida u radu osoblja.",
    PAD, sY + 230, { width: W - 2 * PAD, align: "center" });
footer(5, TOTAL);

// SLIDE 6 — Poziv na akciju
doc.addPage({ size: [W, H], margin: 0 });
doc.rect(0, 0, W, H).fill(NAVY);
doc.rect(0, H - 8, W, 8).fill(GOLD);

doc.font("Bold").fontSize(54).fillColor("#FFFFFF")
  .text("Spremno za vaš hotel.", PAD, 200, { width: W - 2 * PAD });
doc.font("Reg").fontSize(22).fillColor("#B8C5D6")
  .text("Prilagodljivo za hotele svih veličina — od 30 do 500+ soba. Implementacija u roku od 2 sedmice, obuka osoblja uključena.",
    PAD, doc.y + 20, { width: W - 2 * PAD });

doc.rect(PAD, 480, 4, 90).fill(GOLD);
doc.font("Bold").fontSize(18).fillColor(GOLD).text("KONTAKT", PAD + 24, 488);
doc.font("Reg").fontSize(18).fillColor("#FFFFFF")
  .text("Budvanska Rivijera • Tehnička služba", PAD + 24, 514);
doc.font("Reg").fontSize(16).fillColor("#B8C5D6")
  .text("hgbrtehnickasluzba.replit.app", PAD + 24, 540);

doc.font("Reg").fontSize(12).fillColor("#8FA3BF")
  .text("6 / 6", 0, H - 40, { width: W - PAD, align: "right" });

doc.end();

await new Promise((r) => doc.on("end", r));
console.log("OK:", OUT);
