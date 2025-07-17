import React from 'react';
import { Box, Text } from 'ink';

function getMonthMatrix(year, month) {
	const firstDay = new Date(year, month, 1);
	const lastDay = new Date(year, month + 1, 0);
	const matrix = [];
	let week = [];
	let dayOfWeek = firstDay.getDay(); // 0 = Sunday

	// Fill initial empty days
	for (let i = 0; i < dayOfWeek; i++) {
		week.push(null);
	}

	for (let day = 1; day <= lastDay.getDate(); day++) {
		week.push(day);
		if (week.length === 7) {
			matrix.push(week);
			week = [];
		}
	}
	// Fill trailing empty days
	if (week.length > 0) {
		while (week.length < 7) week.push(null);
		matrix.push(week);
	}
	return matrix;
}

const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const Calendar = ({ year, month, eventDays }) => {
	const matrix = getMonthMatrix(year, month);
	const today = new Date();
	const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
	const todayDate = today.getDate();
	return React.createElement(Box, { flexDirection: 'column', borderStyle: 'round', borderColor: 'cyan', padding: 1 },
		// Day names header
		React.createElement(Box, { flexDirection: 'row' },
			...dayNames.map((name, i) =>
				React.createElement(Box, {
					key: 'header-' + i,
					width: 5,
					alignItems: 'center',
					justifyContent: 'center',
					borderStyle: 'single',
					borderColor: 'gray'
				},
					React.createElement(Text, { bold: true }, name)
				)
			)
		),
		// Weeks
		...matrix.map((week, wi) =>
			React.createElement(Box, { flexDirection: 'row', key: 'week-' + wi },
				...week.map((day, di) => {
					let color = day ? undefined : 'gray';
					if (isCurrentMonth && day === todayDate) {
						color = 'green';
					} else if (eventDays && day && eventDays.has(day)) {
						color = 'blue';
					}
					return React.createElement(Box, {
						key: 'day-' + wi + '-' + di,
						width: 5,
						alignItems: 'center',
						justifyContent: 'center',
						borderStyle: 'single',
						borderColor: 'white'
					},
						React.createElement(Text, { color }, day ? String(day).padStart(2, ' ') : '  ')
					);
				})
			)
		)
	);
};

export default Calendar; 