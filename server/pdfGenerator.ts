import PDFDocument from 'pdfkit';
import { Task } from '@shared/schema';

interface ReportOptions {
  title: string;
  date: string;
  tasks: Task[];
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
