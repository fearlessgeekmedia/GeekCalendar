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

const Calendar = ({ year, month, eventDays, theme }) => {
	const matrix = getMonthMatrix(year, month);
	const today = new Date();
	const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
	const todayDate = today.getDate();
	
	// Color scheme for different types of days
	const getDayColor = (day, dayIndex) => {
		if (!day) return theme.calendar.days.empty;
		
		// Weekend colors
		if (dayIndex === 0 || dayIndex === 6) return theme.calendar.days.weekend;
		
		// Today
		if (isCurrentMonth && day === todayDate) return theme.calendar.days.today;
		
		// Event days
		if (eventDays && eventDays.has(day)) return theme.calendar.days.event;
		
		// Regular weekdays
		return theme.calendar.days.weekday;
	};
	
	const getDayBackground = (day, dayIndex) => {
		if (!day) return undefined;
		
		// Today gets special background
		if (isCurrentMonth && day === todayDate) return theme.calendar.backgrounds.today;
		
		// Event days get subtle background
		if (eventDays && eventDays.has(day)) return theme.calendar.backgrounds.event;
		
		return undefined;
	};
	
	// Get appropriate text color for background
	const getTextColorForBackground = (backgroundColor, fallbackColor) => {
		if (!backgroundColor) return fallbackColor;
		
		// Colors that work well with white text
		const darkBackgrounds = ['blue', 'red', 'green', 'magenta', 'cyan'];
		// Colors that work well with black text  
		const lightBackgrounds = ['yellow', 'white'];
		
		if (darkBackgrounds.includes(backgroundColor)) {
			return 'white';
		} else if (lightBackgrounds.includes(backgroundColor)) {
			return 'black';
		} else {
			// Default to white for unknown backgrounds
			return 'white';
		}
	};
	
	return React.createElement(Box, { 
		flexDirection: 'column', 
		borderStyle: 'round', 
		borderColor: theme.calendar.border, 
		padding: 1
	},
		// Day names header with gradient colors
		React.createElement(Box, { flexDirection: 'row' },
			...dayNames.map((name, i) => {
				const isWeekend = i === 0 || i === 6;
				const headerColor = isWeekend ? theme.calendar.header.weekend : theme.calendar.header.weekday;
				return React.createElement(Box, {
					key: 'header-' + i,
					width: 5,
					alignItems: 'center',
					justifyContent: 'center',
					borderStyle: isWeekend ? 'double' : 'single',
					borderColor: headerColor
				},
					React.createElement(Text, { 
						bold: true, 
						color: headerColor,
						italic: isWeekend
					}, name)
				);
			})
		),
		// Weeks
		...matrix.map((week, wi) =>
			React.createElement(Box, { flexDirection: 'row', key: 'week-' + wi },
				...week.map((day, di) => {
					const dayColor = getDayColor(day, di);
					const dayBackground = getDayBackground(day, di);
					const isWeekend = di === 0 || di === 6;
					
					return React.createElement(Box, {
						key: 'day-' + wi + '-' + di,
						width: 5,
						alignItems: 'center',
						justifyContent: 'center',
						borderStyle: isWeekend ? 'double' : 'single',
						borderColor: dayColor,
						backgroundColor: dayBackground
					},
						React.createElement(Text, { 
							color: getTextColorForBackground(dayBackground, dayColor),
							bold: day === todayDate || (eventDays && day && eventDays.has(day)),
							italic: isWeekend
						}, day ? String(day).padStart(2, ' ') : '  ')
					);
				})
			)
		)
	);
};

export default Calendar; 