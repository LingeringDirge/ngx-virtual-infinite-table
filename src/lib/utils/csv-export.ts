/**
 * Column export descriptor for CSV export utility.
 */
export interface ICsvExportColumn<T = any> {
    /** Header title in exported CSV. Defaults to stringified dataKey if omitted. */
    title?: string;
    /** Property key on row object. */
    dataKey?: keyof T | string;
    /** Optional custom cell value formatter. */
    formatter?: (value: any, row: T) => string | number | boolean | null | undefined;
}

/**
 * Utility helper to export table data to a downloadable CSV file.
 * Compatible with all modern browsers and server-side SSR safe.
 *
 * @param items Array of row data objects to export.
 * @param columns Column definitions with titles and data keys.
 * @param filename Default 'table-export.csv'.
 */
export function exportToCsv<T = any>(
    items: T[],
    columns: ICsvExportColumn<T>[],
    filename = 'table-export.csv'
): void {
    if (!items || !items.length || !columns || !columns.length) {
        return;
    }

    if (typeof document === 'undefined' || typeof window === 'undefined') {
        return;
    }

    const headers = columns
        .map((col) => {
            const label = col.title || String(col.dataKey || '');
            return `"${label.replace(/"/g, '""')}"`;
        })
        .join(',');

    const rows = items.map((row) =>
        columns
            .map((col) => {
                let rawValue = col.dataKey ? (row as any)[col.dataKey] : '';
                if (col.formatter) {
                    rawValue = col.formatter(rawValue, row);
                }
                const str = rawValue === null || rawValue === undefined ? '' : String(rawValue);
                return `"${str.replace(/"/g, '""')}"`;
            })
            .join(',')
    );

    const csvContent = [headers, ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
