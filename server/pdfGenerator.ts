import PDFDocument from 'pdfkit';
import { Task } from '@shared/schema';
import { fetchImageAsBuffer } from './lib/imageStorage';

interface ReportOptions {
  title: string;
  date: string;
  tasks: Task[];
}

async function resolveImageBuffers(images: string[]): Promise<(Buffer | null)[]> {
  return Promise.all(
    images.map(async (imageData) => {
      try {
        if (imageData.startsWith('data:')) {
          const base64Part = imageData.split(',')[1];
          if (!base64Part) return null;
          return Buffer.from(base64Part, 'base64');
        } else if (imageData.startsWith('http')) {
          return await fetchImageAsBuffer(imageData);
        } else {
          return Buffer.from(imageData, 'base64');
        }
      } catch {
        return null;
      }
    }),
  );
}

function embedImages(doc: PDFKit.PDFDocument, buffers: (Buffer | null)[]) {
  const maxImgWidth = 240;
  const maxImgHeight = 200;
  const spacing = 10;
  let xPos = 40;
  let imagesInRow = 0;

  for (let i = 0; i < buffers.length; i++) {
    try {
      const imgBuffer = buffers[i];
      if (!imgBuffer) {
        doc.fontSize(8).fillColor('#cc0000').text(`Slika ${i + 1}: greska pri ucitavanju`, 40, doc.y);
        doc.fillColor('#000000');
        doc.moveDown(0.2);
        continue;
      }

      if (imgBuffer.length < 100) continue;

      if (doc.y > 580 || (imagesInRow === 0 && doc.y > 650)) {
        doc.addPage();
        xPos = 40;
        imagesInRow = 0;
      }

      if (imagesInRow >= 2) {
        doc.moveDown(0.3);
        xPos = 40;
        imagesInRow = 0;
        if (doc.y > 580) {
          doc.addPage();
        }
      }

      const yBefore = doc.y;
      doc.image(imgBuffer, xPos, doc.y, {
        fit: [maxImgWidth, maxImgHeight],
      });

      xPos += maxImgWidth + spacing;
      imagesInRow++;

      if (imagesInRow >= 2) {
        doc.y = yBefore + maxImgHeight + spacing;
        xPos = 40;
        imagesInRow = 0;
      }
    } catch (err) {
      doc.fontSize(8).fillColor('#cc0000').text(`Slika ${i + 1}: greska pri ucitavanju`, 40, doc.y);
      doc.fillColor('#000000');
      doc.moveDown(0.2);
    }
  }

  if (imagesInRow > 0) {
    doc.y = doc.y + maxImgHeight + spacing;
  }
  doc.moveDown(0.3);
}

export async function generateDailyReportPdf(options: ReportOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(18).text(options.title, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Datum: ${options.date}`, { align: 'center' });
      doc.moveDown(1);

      const completedCount = options.tasks.filter(t => t.status === 'completed').length;
      const inProgressCount = options.tasks.filter(t => t.status === 'with_operator').length;
      doc.fontSize(11).text(`Ukupno: ${options.tasks.length}  |  Zavrseno: ${completedCount}  |  U toku: ${inProgressCount}`);
      doc.moveDown(1);

      const tableTop = doc.y;
      const colWidths = [70, 70, 60, 120, 60, 70, 60];
      const headers = ['Prijavljeno', 'Prijavio', 'Lokacija', 'Opis', 'Prioritet', 'Dodeljen', 'Status'];

      doc.fontSize(9).font('Helvetica-Bold');
      let x = 40;
      headers.forEach((header, i) => {
        doc.text(header, x, tableTop, { width: colWidths[i], align: 'left' });
        x += colWidths[i];
      });

      doc.moveTo(40, tableTop + 15).lineTo(555, tableTop + 15).stroke();

      doc.font('Helvetica').fontSize(8);
      let y = tableTop + 20;

      for (const task of options.tasks) {
        if (y > 750) {
          doc.addPage();
          y = 40;
        }

        const createdAt = new Date(task.created_at);
        const dateStr = `${createdAt.getDate().toString().padStart(2, '0')}.${(createdAt.getMonth() + 1).toString().padStart(2, '0')}. ${createdAt.getHours().toString().padStart(2, '0')}:${createdAt.getMinutes().toString().padStart(2, '0')}`;
        
        const priority = task.priority === 'urgent' ? 'Hitno' : task.priority === 'normal' ? 'Normalno' : 'Nisko';
        const status = task.status === 'completed' ? 'Zavrseno' : task.status === 'with_operator' ? 'U toku' : 'Novo';
        const description = (task.description || task.title || '').substring(0, 40);

        const row = [
          dateStr,
          (task.created_by_name || 'N/A').substring(0, 15),
          (task.location || '').substring(0, 15),
          description,
          priority,
          (task.assigned_to_name || 'Nije dodeljeno').substring(0, 15),
          status
        ];

        x = 40;
        row.forEach((cell, i) => {
          doc.text(cell, x, y, { width: colWidths[i], align: 'left' });
          x += colWidths[i];
        });

        y += 18;
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateTaskReportPdf(task: Task, history: any[]): Promise<Buffer> {
  // Pre-fetch image buffers BEFORE entering the synchronous PDF generation
  const reporterBuffers = task.images && task.images.length > 0
    ? await resolveImageBuffers(task.images)
    : null;
  const workerBuffers = task.worker_images && task.worker_images.length > 0
    ? await resolveImageBuffers(task.worker_images)
    : null;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const formatDate = (d: string | Date | null | undefined): string => {
        if (!d) return 'N/A';
        const date = new Date(d);
        return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      };

      const priorityLabel = task.priority === 'urgent' ? 'Hitno' : task.priority === 'normal' ? 'Normalno' : 'Moze sacekati';
      const statusLabel = task.status === 'completed' ? 'Zavrseno' : task.status === 'cancelled' ? 'Otkazano' : task.status === 'with_external' ? 'Kod eksterne firme' : task.status === 'assigned_to_radnik' ? 'Dodijeljeno radniku' : task.status === 'with_operator' ? 'Kod operatera' : task.status === 'new' ? 'Novo' : task.status;

      doc.fontSize(16).font('Helvetica-Bold').text('IZVJESTAJ O ZADATKU', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(9).font('Helvetica').text(`Generisan: ${formatDate(new Date())}`, { align: 'center' });
      doc.moveDown(0.5);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke('#cccccc');
      doc.moveDown(0.5);

      doc.fontSize(14).font('Helvetica-Bold').text(task.title || 'Bez naslova');
      doc.moveDown(0.5);

      const sectionTitle = (title: string) => {
        doc.moveDown(0.3);
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#333333').text(title);
        doc.moveDown(0.2);
        doc.font('Helvetica').fillColor('#000000');
      };

      const fieldRow = (label: string, value: string) => {
        doc.fontSize(9).font('Helvetica-Bold').text(`${label}: `, { continued: true });
        doc.font('Helvetica').text(value);
      };

      sectionTitle('OSNOVNI PODACI');
      fieldRow('Lokacija', task.location || 'N/A');
      if (task.room_number) fieldRow('Broj sobe', task.room_number);
      fieldRow('Prioritet', priorityLabel);
      fieldRow('Status', statusLabel);
      fieldRow('Kreirano', formatDate(task.created_at));
      fieldRow('Kreirao', task.created_by_name || 'N/A');
      fieldRow('Odeljenje', task.created_by_department || 'N/A');
      doc.moveDown(0.3);

      sectionTitle('OPIS REKLAMACIJE');
      doc.fontSize(10).text(task.description || 'Nema opisa', { lineGap: 2 });
      doc.moveDown(0.3);

      sectionTitle('DODIJELJENO');
      if (task.sef_name) fieldRow('Sef', task.sef_name);
      if (task.operator_name) fieldRow('Operater', task.operator_name);
      if (task.assigned_to_name) fieldRow('Radnik/Serviser', task.assigned_to_name);
      if (task.external_company_name) fieldRow('Eksterna firma', task.external_company_name);
      if (!task.sef_name && !task.operator_name && !task.assigned_to_name && !task.external_company_name) {
        doc.fontSize(10).text('Nije dodijeljeno');
      }
      doc.moveDown(0.3);

      sectionTitle('VREMENSKI OKVIR');
      if (task.estimated_arrival_time) fieldRow('Planirani dolazak', formatDate(task.estimated_arrival_time));
      if (task.actual_arrival_time) fieldRow('Stvarni dolazak', formatDate(task.actual_arrival_time));
      if (task.actual_completion_time) fieldRow('Zavrseno', formatDate(task.actual_completion_time));
      if (task.completed_at) fieldRow('Datum zavrsetka', formatDate(task.completed_at));
      if (task.completed_by_name) fieldRow('Zavrsio', task.completed_by_name);
      if (task.deadline_at) fieldRow('Rok', formatDate(task.deadline_at));
      if (!task.estimated_arrival_time && !task.actual_arrival_time && !task.actual_completion_time && !task.completed_at) {
        doc.fontSize(10).text('Nema podataka o vremenskom okviru');
      }
      doc.moveDown(0.3);

      if (task.worker_report) {
        sectionTitle('IZVJESTAJ SERVISERA / RADNIKA');
        doc.fontSize(10).text(task.worker_report, { lineGap: 2 });
        doc.moveDown(0.3);
      }

      if (task.receipt_confirmed_at) {
        sectionTitle('POTVRDA PRIJEMA');
        fieldRow('Potvrdio', task.receipt_confirmed_by_name || 'N/A');
        fieldRow('Datum potvrde', formatDate(task.receipt_confirmed_at));
        doc.moveDown(0.3);
      }

      if (history && history.length > 0) {
        if (doc.y > 650) doc.addPage();
        sectionTitle('ISTORIJA ZADATKA');

        const sortedHistory = [...history].sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        for (const entry of sortedHistory) {
          if (doc.y > 730) doc.addPage();
          const actionLabel = entry.action === 'task_created' ? 'Kreiran' :
            entry.action === 'status_changed' ? 'Promjena statusa' :
            entry.action === 'assigned' ? 'Dodijeljeno' :
            entry.action === 'message_sent' ? 'Poruka' :
            entry.action === 'task_returned' ? 'Vraceno' :
            entry.action === 'completed' ? 'Zavrseno' : entry.action;

          doc.fontSize(8).font('Helvetica-Bold').text(
            `${formatDate(entry.timestamp)} - ${actionLabel}`,
            { continued: true }
          );
          doc.font('Helvetica').text(` (${entry.user_name || 'N/A'}, ${entry.user_role || 'N/A'})`);

          if (entry.action === 'document_uploaded') {
            const fileName = entry.assigned_to || 'Dokument';
            doc.fontSize(8).fillColor('#2563eb').text(`   Sadržaj: ${fileName}`, { indent: 15 });
            doc.fillColor('#000000');
          } else if (entry.notes) {
            doc.fontSize(8).text(`   ${entry.notes}`, { indent: 15 });
          }
          if (entry.status_to) {
            const toLabel = entry.status_to === 'completed' ? 'Zavrseno' : entry.status_to === 'with_external' ? 'Kod externe firme' : entry.status_to === 'assigned_to_radnik' ? 'Dodijeljeno radniku' : entry.status_to;
            doc.fontSize(8).text(`   Status: ${toLabel}`, { indent: 15 });
          }
          if (entry.assigned_to_name) {
            doc.fontSize(8).text(`   Dodijeljeno: ${entry.assigned_to_name}`, { indent: 15 });
          }
          doc.moveDown(0.2);
        }
      }

      if (reporterBuffers) {
        if (doc.y > 500) doc.addPage();
        sectionTitle('SLIKE REKLAMACIJE');
        embedImages(doc, reporterBuffers);
      }

      if (workerBuffers) {
        if (doc.y > 500) doc.addPage();
        sectionTitle('SLIKE SERVISERA');
        embedImages(doc, workerBuffers);
      }

      doc.moveDown(1);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke('#cccccc');
      doc.moveDown(0.5);
      doc.fontSize(8).fillColor('#999999').text('Hotel Budvanska Rivijera - Sistem za upravljanje zadacima', { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export interface WorkerAnalysisRow {
  name: string;
  completed: number;
  returned: number;
  pending: number;
  total: number;
}

export interface WorkerAnalysisOptions {
  periodLabel: string;
  workers: WorkerAnalysisRow[];
  totals: { completed: number; returned: number; pending: number };
}

export async function generateWorkerAnalysisPdf(options: WorkerAnalysisOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const now = new Date();
      const generatedAt = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      doc.fontSize(16).font('Helvetica-Bold').fillColor('#000000').text('ANALIZA PO MAJSTORIMA', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica').text(`Period: ${options.periodLabel}`, { align: 'center' });
      doc.fontSize(9).text(`Generisan: ${generatedAt}`, { align: 'center' });
      doc.moveDown(0.5);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke('#cccccc');
      doc.moveDown(0.6);

      // Summary line
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#16a34a').text(`Zavrseno: ${options.totals.completed}`, { continued: true });
      doc.fillColor('#000000').text('    ', { continued: true });
      doc.fillColor('#ea580c').text(`Vraceno: ${options.totals.returned}`, { continued: true });
      doc.fillColor('#000000').text('    ', { continued: true });
      doc.fillColor('#dc2626').text(`Nezavrseno: ${options.totals.pending}`);
      doc.fillColor('#000000');
      doc.moveDown(0.6);

      // Table layout
      const startX = 40;
      const colWidths = { idx: 30, name: 235, completed: 70, returned: 70, pending: 70 };
      const colX = {
        idx: startX,
        name: startX + colWidths.idx,
        completed: startX + colWidths.idx + colWidths.name,
        returned: startX + colWidths.idx + colWidths.name + colWidths.completed,
        pending: startX + colWidths.idx + colWidths.name + colWidths.completed + colWidths.returned,
      };
      const tableRight = colX.pending + colWidths.pending;

      const drawHeader = () => {
        const y = doc.y;
        doc.rect(startX, y, tableRight - startX, 20).fill('#f1f5f9');
        doc.fillColor('#333333').fontSize(9).font('Helvetica-Bold');
        doc.text('#', colX.idx + 4, y + 6, { width: colWidths.idx - 8 });
        doc.text('Majstor', colX.name + 4, y + 6, { width: colWidths.name - 8 });
        doc.text('Zavrseno', colX.completed, y + 6, { width: colWidths.completed, align: 'center' });
        doc.text('Vraceno', colX.returned, y + 6, { width: colWidths.returned, align: 'center' });
        doc.text('Nezavrseno', colX.pending, y + 6, { width: colWidths.pending, align: 'center' });
        doc.fillColor('#000000').font('Helvetica');
        doc.y = y + 20;
      };

      drawHeader();

      options.workers.forEach((w, i) => {
        if (doc.y > 760) {
          doc.addPage();
          drawHeader();
        }
        const y = doc.y;
        const rowHeight = 18;
        if (i % 2 === 1) {
          doc.rect(startX, y, tableRight - startX, rowHeight).fill('#fafafa');
        }
        doc.fillColor('#000000').fontSize(9).font('Helvetica');
        doc.text(String(i + 1), colX.idx + 4, y + 5, { width: colWidths.idx - 8 });
        doc.text(w.name, colX.name + 4, y + 5, { width: colWidths.name - 8, ellipsis: true });
        doc.fillColor('#16a34a').font('Helvetica-Bold').text(String(w.completed), colX.completed, y + 5, { width: colWidths.completed, align: 'center' });
        doc.fillColor('#ea580c').text(String(w.returned), colX.returned, y + 5, { width: colWidths.returned, align: 'center' });
        doc.fillColor('#dc2626').text(String(w.pending), colX.pending, y + 5, { width: colWidths.pending, align: 'center' });
        doc.fillColor('#000000').font('Helvetica');
        doc.y = y + rowHeight;
      });

      if (options.workers.length === 0) {
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor('#888888').text('Nema dodijeljenih zadataka za izabrani period', { align: 'center' });
        doc.fillColor('#000000');
      }

      // Totals row
      if (doc.y > 760) doc.addPage();
      const ty = doc.y;
      doc.rect(startX, ty, tableRight - startX, 20).fill('#f8fafc');
      doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
      doc.text('UKUPNO', colX.name + 4, ty + 6, { width: colWidths.name - 8 });
      doc.text(String(options.totals.completed), colX.completed, ty + 6, { width: colWidths.completed, align: 'center' });
      doc.text(String(options.totals.returned), colX.returned, ty + 6, { width: colWidths.returned, align: 'center' });
      doc.text(String(options.totals.pending), colX.pending, ty + 6, { width: colWidths.pending, align: 'center' });
      doc.font('Helvetica');
      doc.y = ty + 20;

      doc.moveDown(1);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke('#cccccc');
      doc.moveDown(0.5);
      doc.fontSize(8).fillColor('#999999').text('Hotel Budvanska Rivijera - Sistem za upravljanje zadacima', { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateTasksCsv(tasks: Task[]): Promise<string> {
  const headers = ['Prijavljeno', 'Prijavio', 'Lokacija', 'Opis', 'Prioritet', 'Dodeljen', 'Status'];
  const rows = tasks.map(task => {
    const createdAt = new Date(task.created_at);
    const dateStr = `${createdAt.getDate().toString().padStart(2, '0')}.${(createdAt.getMonth() + 1).toString().padStart(2, '0')}.${createdAt.getFullYear()} ${createdAt.getHours().toString().padStart(2, '0')}:${createdAt.getMinutes().toString().padStart(2, '0')}`;
    const priority = task.priority === 'urgent' ? 'Hitno' : task.priority === 'normal' ? 'Normalno' : 'Nisko';
    const status = task.status === 'completed' ? 'Zavrseno' : task.status === 'with_operator' ? 'U toku' : 'Novo';
    
    return [
      dateStr,
      task.created_by_name || 'N/A',
      task.location || '',
      (task.description || task.title || '').replace(/"/g, '""'),
      priority,
      task.assigned_to_name || 'Nije dodeljeno',
      status
    ].map(cell => `"${cell}"`).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
