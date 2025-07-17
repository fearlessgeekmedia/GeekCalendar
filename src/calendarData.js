import fs from 'fs';

// Simple in-memory event store
const events = [];

function addEvent(year, month, day, text) {
	events.push({ year, month, day, text });
}

function getEventsForDay(year, month, day) {
	return events.filter(e => e.year === year && e.month === month && e.day === day);
}

function getEventDaysForMonth(year, month) {
	// Returns a Set of days in the month that have events
	return new Set(events.filter(e => e.year === year && e.month === month).map(e => e.day));
}

function deleteEvent(year, month, day, eventIndex) {
	const idx = events.findIndex((e, i) => e.year === year && e.month === month && e.day === day && getEventsForDay(year, month, day).indexOf(e) === eventIndex);
	if (idx !== -1) {
		events.splice(idx, 1);
	}
}

function saveEventsToFile(filename) {
	fs.writeFileSync(filename, JSON.stringify(events, null, 2), 'utf8');
}

function loadEventsFromFile(filename) {
	if (fs.existsSync(filename)) {
		const data = fs.readFileSync(filename, 'utf8');
		const loaded = JSON.parse(data);
		events.length = 0;
		events.push(...loaded);
	}
}

export { addEvent, getEventsForDay, getEventDaysForMonth, deleteEvent, saveEventsToFile, loadEventsFromFile };
