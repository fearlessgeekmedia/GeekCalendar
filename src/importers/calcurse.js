import fs from 'fs';

// Parse Calcurse's apts file: MM/DD/YYYY @ HH:MM -> ...|Event text
function importCalcurseEventsFromFile(filename) {
	const events = [];
	const lines = fs.readFileSync(filename, 'utf8').split(/\r?\n/);
	for (const line of lines) {
		if (!line.trim()) continue;
		const match = line.match(/(\d{2})\/(\d{2})\/(\d{4}) @ \d{2}:\d{2}.*\|(.+)/);
		if (match) {
			const month = parseInt(match[1], 10) - 1;
			const day = parseInt(match[2], 10);
			const year = parseInt(match[3], 10);
			const text = match[4].trim();
			events.push({ year, month, day, text });
		}
	}
	return events;
}

export { importCalcurseEventsFromFile }; 