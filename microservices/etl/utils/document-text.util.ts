import * as ExcelJS from 'exceljs';

export async function extractDocumentText(buffer: Buffer, contentType: string, nombreArchivo: string): Promise<string> {
  try {
    if (contentType === 'application/pdf') {
      const pdfParse = require('pdf-parse');
      const result = await pdfParse(buffer);
      return result.text || '';
    }

    if (contentType === 'text/plain' || contentType === 'application/json' || contentType === 'text/csv') {
      return buffer.toString('utf-8');
    }

    if (
      contentType === 'application/vnd.ms-excel' ||
      contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as any);
      const lines: string[] = [];
      workbook.eachSheet((sheet) => {
        lines.push(`# Hoja: ${sheet.name}`);
        sheet.eachRow((row) => {
          lines.push((row.values as any[]).filter((v) => v !== undefined && v !== null).join(' | '));
        });
      });
      return lines.join('\n');
    }

    return `[No se pudo interpretar el tipo de archivo ${contentType} para "${nombreArchivo}"]`;
  } catch (error: any) {
    return `[Error al leer "${nombreArchivo}": ${error.message}]`;
  }
}
