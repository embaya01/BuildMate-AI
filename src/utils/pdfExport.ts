import jsPDF from 'jspdf';
import autoTable, { type RowInput } from 'jspdf-autotable';
import type { CategoryMap, CostCategoryKey, CostSettings } from '../types';
import type { CategoryTotal, FinancialBreakdown } from './calculations';
import { CATEGORY_LABELS, formatCurrency } from './calculations';

interface PdfOptions {
  projectName?: string | null;
  clientName?: string | null;
  location?: string | null;
  preparedBy?: string | null;
  totals: CategoryTotal[];
  financials: FinancialBreakdown;
  settings: CostSettings;
  categories: CategoryMap;
  totalSqFt: number;
  unitLabel: string;
  notes?: string | null;
}

const accent = { r: 23, g: 61, b: 94 };
const softBackground = { r: 241, g: 246, b: 251 };

const asDisplay = (value?: string | null, fallback = 'N/A') => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
};

const toNumberString = (value: number) => {
  if (!Number.isFinite(value)) {
    return '0';
  }
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

const toSlug = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'estimate';
};

const sectionSpacer = (doc: jsPDF) => {
  const lastY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
  return typeof lastY === 'number' ? lastY + 8 : 48;
};

const addSectionHeading = (doc: jsPDF, label: string, y: number) => {
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(accent.r, accent.g, accent.b);
  doc.setFontSize(12);
  doc.text(label, 14, y);
  doc.setTextColor(33, 37, 41);
  doc.setFont('helvetica', 'normal');
};

export const generateEstimatePdf = (options: PdfOptions) => {
  const doc = new jsPDF();

  const projectName = asDisplay(options.projectName, 'Untitled Project');
  const clientName = asDisplay(options.clientName);
  const location = asDisplay(options.location);
  const preparedBy = asDisplay(options.preparedBy, 'ScopeSmart');
  const issuedOn = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });

  // Header ribbon
  doc.setFillColor(accent.r, accent.g, accent.b);
  doc.rect(0, 0, 210, 36, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('ScopeSmart Proposal', 14, 16);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Project: ' + projectName, 14, 24);
  doc.text('Client: ' + clientName, 14, 30);
  doc.text('Prepared by: ' + preparedBy, 130, 16);
  doc.text('Issued: ' + issuedOn, 130, 22);
  doc.text('Location: ' + location, 130, 28);
  doc.text('Area: ' + toNumberString(options.totalSqFt) + ' ' + options.unitLabel, 130, 34);
  doc.setTextColor(33, 37, 41);

  // Executive summary
  addSectionHeading(doc, 'Executive Summary', 46);
  const summaryRows: RowInput[] = [
    ['Direct Cost Subtotal', formatCurrency(options.financials.subtotal)],
    ['Overhead (' + options.settings.overhead + '%)', formatCurrency(options.financials.overheadAmount)],
    ['Contingency (' + options.settings.contingency + '%)', formatCurrency(options.financials.contingencyAmount)],
    ['Markup Base', formatCurrency(options.financials.markupBase)],
    ['Profit (' + options.settings.profitMargin + '%)', formatCurrency(options.financials.profitAmount)],
    ['Taxable Amount', formatCurrency(options.financials.taxableAmount)],
    ['Sales Tax (' + options.settings.taxRate + '%)', formatCurrency(options.financials.taxAmount)],
    ['Total Proposal Value', formatCurrency(options.financials.grandTotal)],
  ];
  autoTable(doc, {
    startY: 50,
    head: [['Line Item', 'Amount']],
    body: summaryRows,
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [accent.r, accent.g, accent.b], textColor: 255 },
    columnStyles: { 1: { halign: 'right' } },
    alternateRowStyles: { fillColor: [softBackground.r, softBackground.g, softBackground.b] },
  });

  // Category totals
  const totalsY = sectionSpacer(doc);
  addSectionHeading(doc, 'Cost by Category', totalsY);
  const categoryRows: RowInput[] = options.totals.map((entry) => [
    CATEGORY_LABELS[entry.key] ?? entry.label,
    formatCurrency(entry.total),
  ]);
  autoTable(doc, {
    startY: totalsY + 4,
    head: [['Category', 'Amount']],
    body: categoryRows,
    theme: 'striped',
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [34, 45, 56], textColor: 255 },
    columnStyles: { 1: { halign: 'right' } },
  });

  // Itemized breakdowns
  const order: CostCategoryKey[] = ['materials', 'labor', 'equipment', 'subcontractors', 'permits'];
  let nextY = sectionSpacer(doc);
  order.forEach((key) => {
    const items = options.categories[key] ?? [];
    const rows: RowInput[] =
      items.length > 0
        ? items.map((item) => [
            item.name || 'Item',
            toNumberString(item.quantity),
            item.unit || options.unitLabel,
            formatCurrency(item.unitCost),
            formatCurrency(item.quantity * item.unitCost),
          ])
        : [['No items added', '', '', '', '']];

    addSectionHeading(doc, CATEGORY_LABELS[key], nextY);
    autoTable(doc, {
      startY: nextY + 4,
      head: [['Item', 'Qty', 'Unit', 'Rate', 'Total']],
      body: rows,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [softBackground.r, softBackground.g, softBackground.b] },
      columnStyles: {
        1: { halign: 'right', cellWidth: 16 },
        2: { halign: 'left', cellWidth: 22 },
        3: { halign: 'right', cellWidth: 28 },
        4: { halign: 'right', cellWidth: 32 },
      },
      didParseCell: (hookData) => {
        if (hookData.section === 'body' && hookData.row.index % 2 === 1) {
          hookData.cell.styles.fillColor = [247, 249, 252];
        }
      },
    });
    nextY = sectionSpacer(doc);
  });

  // Notes / assumptions
  if (options.notes && options.notes.trim().length > 0) {
    const y = Math.max(nextY, 48);
    addSectionHeading(doc, 'Assumptions & Notes', y);
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);
    const wrapped = doc.splitTextToSize(options.notes.trim(), 182);
    doc.text(wrapped, 14, y + 6);
  }

  const fileName = 'scopesmart-' + toSlug(projectName) + '-estimate.pdf';
  doc.save(fileName);
};
