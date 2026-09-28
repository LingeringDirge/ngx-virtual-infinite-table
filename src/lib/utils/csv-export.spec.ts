import { exportToCsv } from './csv-export';

describe('exportToCsv', () => {
    let originalCreateElement: typeof document.createElement;
    let clickSpy: jest.Mock;
    let appendChildSpy: jest.SpyInstance;
    let removeChildSpy: jest.SpyInstance;

    beforeEach(() => {
        clickSpy = jest.fn();
        originalCreateElement = document.createElement.bind(document);

        window.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
        window.URL.revokeObjectURL = jest.fn();

        jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
            if (tagName === 'a') {
                const el = originalCreateElement('a');
                el.click = clickSpy;
                return el;
            }
            return originalCreateElement(tagName);
        });

        appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
        removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should do nothing if items or columns are empty', () => {
        exportToCsv([], [{ title: 'Name', dataKey: 'name' }]);
        expect(clickSpy).not.toHaveBeenCalled();

        exportToCsv([{ name: 'Test' }], []);
        expect(clickSpy).not.toHaveBeenCalled();
    });

    it('should generate and trigger CSV download with headers and rows', () => {
        const items = [
            { id: 1, name: 'Alpha, Inc.', role: 'Admin' },
            { id: 2, name: 'Beta "The Great"', role: null }
        ];

        const columns = [
            { title: 'ID', dataKey: 'id' },
            { title: 'Full Name', dataKey: 'name' },
            {
                title: 'User Role',
                dataKey: 'role',
                formatter: (val: any) => val ?? 'Guest'
            }
        ];

        exportToCsv(items, columns, 'users.csv');

        expect(window.URL.createObjectURL).toHaveBeenCalled();
        expect(clickSpy).toHaveBeenCalled();
        expect(appendChildSpy).toHaveBeenCalled();
        expect(removeChildSpy).toHaveBeenCalled();
        expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });
});
