import React from 'react';
import { Box, Text } from 'ink';
import { getEventsForDay } from '../calendarData.js';

const monthNames = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December'
];

const MonthEventList = ({ year, month, selectedDay, selectedEventIndex }) => {
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	const eventBlocks = [];
	let eventCounter = 0;
	for (let day = 1; day <= daysInMonth; day++) {
		const events = getEventsForDay(year, month, day);
		if (events.length > 0) {
			if (eventBlocks.length > 0) {
				eventBlocks.push(
					React.createElement(Text, { key: 'sep-' + day }, '───────────────────────')
				);
			}
			eventBlocks.push(
				React.createElement(Box, { key: 'day-' + day, flexDirection: 'column', marginBottom: 1 },
					React.createElement(Text, { bold: true }, `${monthNames[month]} ${day}`),
					...events.map((e, i) => {
						const isSelected = selectedDay === day && selectedEventIndex === i;
						return React.createElement(Text, {
							key: 'event-' + i,
							inverse: isSelected
						}, `- ${e.text}`);
					})
				)
			);
		}
	}
	if (eventBlocks.length === 0) {
		eventBlocks.push(React.createElement(Text, { dimColor: true, key: 'no-events' }, 'No events this month.'));
	}
	return React.createElement(Box, { flexDirection: 'column', marginLeft: 2 }, ...eventBlocks,
		(selectedDay && selectedEventIndex !== null && selectedEventIndex !== undefined) &&
			React.createElement(Text, { color: 'yellow', dimColor: true }, 'Press e to edit selected event'),
		(selectedDay && selectedEventIndex !== null && selectedEventIndex !== undefined) &&
			React.createElement(Text, { color: 'red', dimColor: true }, 'Press d to delete selected event')
	);
};

export default MonthEventList; 