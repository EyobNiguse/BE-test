import { Range } from "../types";

/**
 * Parse the Content-Range header
 * Format: bytes start-end/total
 * Example: bytes 0-1048575/5242880
 */
export const parseRange = (
    rangeHeader: string
): { start: number; end: number; total: number } | null => {
    if (!rangeHeader) return null;

    try {
        console.log(`Parsing range header: ${rangeHeader}`);

        // Parse the range header
        // Format: bytes start-end/total
        let matches = rangeHeader.match(/bytes (\d+)-(\d+)\/(\d+)/);
        if (!matches || matches.length !== 4) {
            // Try alternative format without 'bytes' prefix
            const altMatches = rangeHeader.match(/(\d+)-(\d+)\/(\d+)/);
            if (!altMatches || altMatches.length !== 4) {
                console.log(`Invalid range format: ${rangeHeader}`);
                return null;
            }
            matches = altMatches;
        }

        const start = parseInt(matches[1], 10);
        const end = parseInt(matches[2], 10);
        const total = parseInt(matches[3], 10);

        console.log(`Parsed range: start=${start}, end=${end}, total=${total}`);

        // Validate the range values
        if (isNaN(start) || isNaN(end) || isNaN(total)) {
            console.log(
                `Invalid range values: start=${start}, end=${end}, total=${total}`
            );
            return null;
        }

        if (start > end || end >= total) {
            console.log(
                `Invalid range boundaries: start=${start}, end=${end}, total=${total}`
            );
            return null;
        }

        return { start, end, total };
    } catch (error) {
        console.error(`Error parsing range header: ${error}`);
        return null;
    }
};
