import fs from 'fs';

// Parse Calcure's events.csv: id,year,month,day,"event text",...
function importCalcureEventsFromFile(filename) {
	const events = [];
	const lines = fs.readFileSync(filename, 'utf8').split(/\r?\n/);
	for (const line of lines) {
		if (!line.trim()) continue;
		// Split CSV, handle quoted event text with commas
		const match = line.match(/^(\d+),(\d{4}),(\d{1,2}),(\d{1,2}),"((?:[^"]|"")+)"/);
		if (match) {
			const year = parseInt(match[2], 10);
			const month = parseInt(match[3], 10) - 1;
			const day = parseInt(match[4], 10);
			const text = match[5].replace(/""/g, '"');
			events.push({ year, month, day, text });
		}
	}
	return events;
}

export { importCalcureEventsFromFile }; 