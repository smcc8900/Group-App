import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export interface ReceiptData {
  userEmail: string;
  month: string;
  amount: number;
  status: string;
  paidDate: string;
  paymentID?: string;
}

export function generateReceiptPDF({ userEmail, month, amount, status, paidDate, paymentID }: ReceiptData) {
  const doc = new jsPDF();
  // Header
  doc.setFillColor(200, 0, 0);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text('Group Contribution App', 10, 20);
  doc.setFontSize(16);
  doc.text('Payment Receipt', 160, 20, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  // Format month as 'Month YYYY'
  let formattedMonth = month;
  try {
    if (/^\d{4}-\d{2}$/.test(month)) {
      const [year, mon] = month.split('-');
      const date = new Date(Number(year), Number(mon) - 1);
      formattedMonth = format(date, 'MMMM yyyy');
    }
  } catch {}
  // User/payment info
  doc.text(`User: ${userEmail}`, 10, 40);
  doc.text(`Month: ${formattedMonth}`, 10, 48);
  doc.text(`Payment Date: ${paidDate}`, 10, 56);
  if (paymentID) doc.text(`Payment ID: ${paymentID}`, 10, 64);
  // Table for amounts (fix number rendering and alignment)
  const tableRows = [
    ['Base Amount', + (amount > 1000 ? 1000 : amount).toLocaleString('en-IN')],
    ['Fine', + (amount > 1000 ? amount - 1000 : 0).toLocaleString('en-IN')],
    ['Total Amount', + amount.toLocaleString('en-IN')],
  ];
  autoTable(doc, {
    startY: 75,
    head: [['Description', 'Amount']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [200, 0, 0] },
    styles: { halign: 'center', font: 'helvetica', fontStyle: 'normal', fontSize: 12 },
    columnStyles: {
      0: { halign: 'left', font: 'helvetica', fontStyle: 'normal' },
      1: { halign: 'right', font: 'courier', fontStyle: 'normal' },
    },
  });
  // Status
  doc.text(`Status: ${status}`, 10, (doc as any).lastAutoTable.finalY + 10);

  // Add green PAID stamp if status is 'paid'
  if (status.toLowerCase() === 'paid') {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.saveGraphicsState && doc.saveGraphicsState();
    doc.setTextColor(0, 180, 0); // green
    doc.setFontSize(60);
    doc.setFont('helvetica', 'bold');
    doc.text('PAID', pageWidth / 2, pageHeight / 2, {
      angle: 30,
      align: 'center'
    });
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.restoreGraphicsState && doc.restoreGraphicsState();
  }
  doc.save(`receipt-${month}.pdf`);
} 