import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

const OUT = path.resolve("attached_assets/Hotel-Reklamacije-Pitch.pdf");
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const FONT_REG = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
const FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";

const IMG_HERO = "attached_assets/pitch/hero-budva.png";
const IMG_PROBLEM = "attached_assets/pitch/problem.png";
const IMG_SOLUTION = "attached_assets/pitch/solution.png";
const IMG_TEAM = "attached_assets/pitch/team.png";

const W = 1280;
const H = 720;
const PAD = 70;

const NAVY = "#0B2545";
const NAVY2 = "#13315C";
const TEAL = "#1B7F95";
const GOLD = "#D4A24A";
const LIGHT = "#F4F6F8";
const TEXT = "#1A2332";
const MUTED = "#5B6878";
const WHITE = "#FFFFFF";

const doc = new PDFDocument({ size: [W, H], margin: 0, autoFirstPage: false });
doc.registerFont("Reg", FONT_REG);
doc.registerFont("Bold", FONT_BOLD);
doc.pipe(fs.createWriteStream(OUT));

function bg(color = WHITE) { doc.rect(0, 0, W, H).fill(color); }
function accentBar() { doc.rect(0, 0, 10, H).fill(GOLD); }

function footer(num, total) {
  doc.font("Reg").fontSize(9).fillColor(MUTED)
    .text("Budvanska Rivijera — Sistem za upravljanje reklamacijama", PAD, H - 32, { width: W - 2*PAD, align: "left" });
  doc.font("Reg").fontSize(9).fillColor(MUTED)
    .text(`${num} / ${total}`, PAD, H - 32, { width: W - 2*PAD, align: "right" });
}

function title(text, y = PAD - 10) {
  doc.font("Bold").fontSize(34).fillColor(NAVY).text(text, PAD, y, { width: W - 2*PAD });
  doc.rect(PAD, doc.y + 6, 70, 4).fill(GOLD);
  return doc.y + 26;
}

// ===== Inline icons (drawn as vector) =====
function iconBell(x, y, s = 22, color = TEAL) {
  doc.save().translate(x, y).fillColor(color);
  doc.moveTo(s*0.5, 0).lineTo(s*0.85, s*0.65).lineTo(s*0.15, s*0.65).closePath().fill();
  doc.circle(s*0.5, s*0.78, s*0.12).fill();
  doc.restore();
}
function iconCheck(x, y, s = 22, color = TEAL) {
  doc.save().translate(x, y);
  doc.lineWidth(3.2).strokeColor(color);
  doc.moveTo(s*0.15, s*0.55).lineTo(s*0.42, s*0.82).lineTo(s*0.88, s*0.22).stroke();
  doc.restore();
}
function iconCamera(x, y, s = 22, color = TEAL) {
  doc.save().translate(x, y).fillColor(color);
  doc.roundedRect(0, s*0.25, s, s*0.6, 3).fill();
  doc.fillColor(WHITE).circle(s*0.5, s*0.55, s*0.18).fill();
  doc.fillColor(color).rect(s*0.35, s*0.15, s*0.3, s*0.15).fill();
  doc.restore();
}
function iconBrain(x, y, s = 22, color = TEAL) {
  doc.save().translate(x, y).fillColor(color);
  doc.circle(s*0.32, s*0.5, s*0.28).fill();
  doc.circle(s*0.68, s*0.5, s*0.28).fill();
  doc.fillColor(WHITE).fontSize(s*0.5).font("Bold").text("AI", 0, s*0.27, { width: s, align: "center" });
  doc.restore();
}
function iconDoc(x, y, s = 22, color = TEAL) {
  doc.save().translate(x, y).fillColor(color);
  doc.roundedRect(s*0.15, 0, s*0.7, s*0.95, 3).fill();
  doc.fillColor(WHITE).rect(s*0.28, s*0.2, s*0.44, s*0.06).fill();
  doc.rect(s*0.28, s*0.35, s*0.44, s*0.06).fill();
  doc.rect(s*0.28, s*0.5, s*0.3, s*0.06).fill();
  doc.restore();
}
function iconPin(x, y, s = 22, color = TEAL) {
  doc.save().translate(x, y).fillColor(color);
  doc.circle(s*0.5, s*0.4, s*0.32).fill();
  doc.moveTo(s*0.25, s*0.55).lineTo(s*0.5, s*1.0).lineTo(s*0.75, s*0.55).closePath().fill();
  doc.fillColor(WHITE).circle(s*0.5, s*0.4, s*0.13).fill();
  doc.restore();
}
function iconGlobe(x, y, s = 22, color = TEAL) {
  doc.save().translate(x, y);
  doc.lineWidth(2).strokeColor(color);
  doc.circle(s*0.5, s*0.5, s*0.42).stroke();
  doc.ellipse(s*0.5, s*0.5, s*0.18, s*0.42).stroke();
  doc.moveTo(s*0.08, s*0.5).lineTo(s*0.92, s*0.5).stroke();
  doc.restore();
}

const TOTAL = 6;

// =================== SLIDE 1 — Naslovna ===================
doc.addPage({ size: [W, H], margin: 0 });
// Background image with dark overlay
try { doc.image(IMG_HERO, 0, 0, { width: W, height: H }); } catch {}
doc.rect(0, 0, W, H).fillOpacity(0.72).fill(NAVY).fillOpacity(1);
doc.rect(0, H - 8, W, 8).fill(GOLD);

doc.font("Reg").fontSize(13).fillColor(GOLD)
  .text("BUDVANSKA RIVIJERA", PAD, PAD, { characterSpacing: 4 });

doc.font("Bold").fontSize(58).fillColor(WHITE)
  .text("Sistem za upravljanje", PAD, 200, { width: W - 2*PAD });
doc.font("Bold").fontSize(58).fillColor(WHITE)
  .text("hotelskim reklamacijama", PAD, doc.y, { width: W - 2*PAD });

doc.rect(PAD, doc.y + 20, 70, 4).fill(GOLD);

doc.font("Reg").fontSize(20).fillColor("#D8E0EC")
  .text("Web i mobilna platforma za realtime koordinaciju osoblja", PAD, doc.y + 18, { width: W - 2*PAD });

doc.font("Reg").fontSize(13).fillColor("#A8B8D0")
  .text("Investitorski pitch  •  2026", PAD, H - 70);

// =================== SLIDE 2 — Problem ===================
doc.addPage({ size: [W, H], margin: 0 });
bg(WHITE); accentBar();
let y = title("Problem");

const colW = (W - 2*PAD) * 0.52;
const imgX = PAD + colW + 30;
const imgW = W - PAD - imgX;

doc.font("Reg").fontSize(15).fillColor(TEXT);
const probItems = [
  ["Reklamacije se gube", "Papir, telefon i WhatsApp grupe između smjena."],
  ["Nema vlasništva zadatka", "Recepcija ne zna ko je preuzeo i u kojoj je fazi."],
  ["Šef nema pregled", "Bez uvida u opterećenje tima u realnom vremenu."],
  ["Menadžment bez podataka", "Koliko reklamacija, koje vrste, prosječno vrijeme."],
  ["Spori odgovor = gubitak", "Nezadovoljan gost → loše recenzije → izgubljen prihod."],
];
let py = y;
for (const [h, d] of probItems) {
  doc.circle(PAD + 7, py + 9, 4).fill("#C0392B");
  doc.font("Bold").fontSize(15).fillColor(NAVY).text(h, PAD + 24, py, { width: colW - 30 });
  doc.font("Reg").fontSize(13).fillColor(MUTED).text(d, PAD + 24, doc.y + 2, { width: colW - 30 });
  py = doc.y + 12;
}

try { doc.image(IMG_PROBLEM, imgX, y, { fit: [imgW, H - y - 70], align: "center", valign: "center" }); } catch {}
footer(2, TOTAL);

// =================== SLIDE 3 — Rješenje ===================
doc.addPage({ size: [W, H], margin: 0 });
bg(WHITE); accentBar();
y = title("Naše rješenje");

const sColW = (W - 2*PAD) * 0.50;
try { doc.image(IMG_SOLUTION, PAD, y, { fit: [sColW - 20, 280], align: "center", valign: "top" }); } catch {}

const rX = PAD + sColW + 10;
const rW = W - PAD - rX;
doc.font("Reg").fontSize(14).fillColor(TEXT)
  .text("Jedinstvena platforma — web aplikacija za recepciju i menadžment, mobilna aplikacija (Android/iOS) za radnike i šefove. Sve uloge povezane u realnom vremenu.",
    rX, y, { width: rW });

const roles = [
  ["Recepcija", "Brzo zavodi reklamaciju gosta uz fotografije i prioritet."],
  ["Šef službe", "Vidi sve zadatke, dodjeljuje radnicima, prati napredak."],
  ["Radnik", "Prima notifikaciju, fotografiše rješenje, zatvara zadatak."],
  ["Menadžment", "Statistike, AI analiza, PDF izvještaji, GPS lokacije."],
];
let ry = doc.y + 16;
for (const [h, d] of roles) {
  doc.roundedRect(rX, ry, rW, 56, 6).fill(LIGHT);
  doc.font("Bold").fontSize(13).fillColor(NAVY).text(h, rX + 14, ry + 9, { width: rW - 28 });
  doc.font("Reg").fontSize(11).fillColor(TEXT).text(d, rX + 14, ry + 28, { width: rW - 28 });
  ry += 64;
}
footer(3, TOTAL);

// =================== SLIDE 4 — Ključne funkcije ===================
doc.addPage({ size: [W, H], margin: 0 });
bg(WHITE); accentBar();
y = title("Ključne funkcije");

const features = [
  [iconBell, "Realtime notifikacije", "Push, zvuk i vibracija na svim uređajima."],
  [iconCamera, "Foto dokumentacija", "Automatska kompresija, čuvanje u oblaku."],
  [iconBrain, "AI analitika (Gemini)", "Pitanja na srpskom, analiza opterećenja."],
  [iconDoc, "PDF izvještaji", "Dnevni, sedmični i mjesečni za menadžment."],
  [iconPin, "GPS praćenje", "Mapa osoblja, ko je gdje i ko je aktivan."],
  [iconGlobe, "Bilingvalno", "Srpski i engleski — za sezonsko strano osoblje."],
];

const cardW = (W - 2*PAD - 40) / 3;
const cardH = 150;
for (let i = 0; i < features.length; i++) {
  const col = i % 3;
  const row = Math.floor(i / 3);
  const x = PAD + col * (cardW + 20);
  const yy = y + row * (cardH + 20);
  doc.roundedRect(x, yy, cardW, cardH, 8).fill(LIGHT);
  doc.circle(x + 38, yy + 38, 22).fill(WHITE);
  features[i][0](x + 22, yy + 22, 32, TEAL);
  doc.font("Bold").fontSize(15).fillColor(NAVY).text(features[i][1], x + 75, yy + 22, { width: cardW - 90 });
  doc.font("Reg").fontSize(12).fillColor(TEXT).text(features[i][2], x + 20, yy + 80, { width: cardW - 40 });
}
footer(4, TOTAL);

// =================== SLIDE 5 — Brojke / infografika ===================
doc.addPage({ size: [W, H], margin: 0 });
bg(WHITE); accentBar();
y = title("Rezultati u praksi");
doc.font("Reg").fontSize(13).fillColor(MUTED)
  .text("Iz aktivne upotrebe u Budvanskoj Rivijeri", PAD, y, { width: W - 2*PAD });

// Donut for completion rate
const donutCX = PAD + 150;
const donutCY = y + 200;
const donutR = 110;
const pct = 0.89;
// Background ring
doc.lineWidth(28).strokeColor(LIGHT);
doc.circle(donutCX, donutCY, donutR).stroke();
// Foreground arc
doc.lineWidth(28).strokeColor(GOLD);
const start = -Math.PI / 2;
const end = start + 2 * Math.PI * pct;
const segs = 64;
doc.moveTo(donutCX + donutR * Math.cos(start), donutCY + donutR * Math.sin(start));
for (let i = 1; i <= Math.round(segs * pct); i++) {
  const a = start + (end - start) * (i / Math.round(segs * pct));
  doc.lineTo(donutCX + donutR * Math.cos(a), donutCY + donutR * Math.sin(a));
}
doc.stroke();
doc.font("Bold").fontSize(48).fillColor(NAVY)
  .text("89%", donutCX - 80, donutCY - 30, { width: 160, align: "center" });
doc.font("Reg").fontSize(12).fillColor(MUTED)
  .text("stopa realizacije", donutCX - 80, donutCY + 25, { width: 160, align: "center" });

// Right side: stat boxes + bar chart
const statsX = donutCX + donutR + 80;
const statsW = W - PAD - statsX;

const stats = [
  ["900+", "obrađenih zadataka"],
  ["60+", "aktivnih korisnika"],
  ["7", "povezanih službi"],
];
let sy = y + 30;
for (const [n, l] of stats) {
  doc.roundedRect(statsX, sy, statsW, 80, 8).fill(NAVY);
  doc.font("Bold").fontSize(36).fillColor(GOLD).text(n, statsX + 24, sy + 18);
  doc.font("Reg").fontSize(13).fillColor("#B8C5D6").text(l, statsX + 150, sy + 32);
  sy += 92;
}

// Bottom strip: bar chart of tasks per service
const chartY = y + 360;
const chartH = 130;
doc.font("Bold").fontSize(13).fillColor(NAVY).text("Raspored zadataka po službama", PAD, chartY - 22);

const services = [
  ["Tehnička", 320],
  ["Domaćinstvo", 240],
  ["Recepcija", 150],
  ["Restoran", 110],
  ["Bazen", 60],
  ["Eksterno", 30],
];
const maxV = Math.max(...services.map(s => s[1]));
const barW = (W - 2*PAD - (services.length - 1) * 16) / services.length;
for (let i = 0; i < services.length; i++) {
  const [name, val] = services[i];
  const bx = PAD + i * (barW + 16);
  const bh = (val / maxV) * chartH;
  doc.roundedRect(bx, chartY + (chartH - bh), barW, bh, 4).fill(TEAL);
  doc.font("Bold").fontSize(11).fillColor(NAVY)
    .text(String(val), bx, chartY + (chartH - bh) - 16, { width: barW, align: "center" });
  doc.font("Reg").fontSize(10).fillColor(MUTED)
    .text(name, bx, chartY + chartH + 6, { width: barW, align: "center" });
}

footer(5, TOTAL);

// =================== SLIDE 6 — Poziv na akciju ===================
doc.addPage({ size: [W, H], margin: 0 });
try { doc.image(IMG_TEAM, 0, 0, { width: W, height: H }); } catch {}
doc.rect(0, 0, W, H).fillOpacity(0.78).fill(NAVY).fillOpacity(1);
doc.rect(0, H - 8, W, 8).fill(GOLD);

doc.font("Bold").fontSize(50).fillColor(WHITE)
  .text("Spremno za vaš hotel.", PAD, 170, { width: W - 2*PAD });
doc.rect(PAD, doc.y + 16, 70, 4).fill(GOLD);
doc.font("Reg").fontSize(18).fillColor("#D8E0EC")
  .text("Prilagodljivo za hotele svih veličina — od 30 do 500+ soba. Implementacija u roku od 2 sedmice, obuka osoblja uključena.",
    PAD, doc.y + 18, { width: W - 2*PAD });

const ctaY = 470;
doc.rect(PAD, ctaY, 4, 90).fill(GOLD);
doc.font("Bold").fontSize(15).fillColor(GOLD).text("KONTAKT", PAD + 22, ctaY + 4);
doc.font("Reg").fontSize(17).fillColor(WHITE)
  .text("Budvanska Rivijera — Tehnička služba", PAD + 22, ctaY + 30);
doc.font("Reg").fontSize(14).fillColor("#B8C5D6")
  .text("hgbrtehnickasluzba.replit.app", PAD + 22, ctaY + 56);

footer(6, TOTAL);

doc.end();
await new Promise((r) => doc.on("end", r));
console.log("OK:", OUT);
