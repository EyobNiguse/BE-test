import { updateAggregates } from '../src/utils/aggregateSales';

describe('updateAggregates', () => {
    it('correctly aggregates valid sales', () => {
        const result = {};
        updateAggregates(result, ['Electronics', 'John', '100']);
        updateAggregates(result, ['Electronics', 'Jane', '150']);
        expect(result).toEqual({ Electronics: 250 });
    });

    it('ignores missing department', () => {
        const result = {};
        updateAggregates(result, ['', 'Bob', '50']);
        expect(result).toEqual({});
    });

    it('treats invalid sales as 0', () => {
        const result = {};
        updateAggregates(result, ['Toys', 'Mike', 'notanumber']);
        expect(result).toEqual({ Toys: 0 });
    });
});
