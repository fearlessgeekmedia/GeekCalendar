#!/usr/bin/env node
import React, { useState } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import Calendar from './components/Calendar.js';
import MonthEventList from './components/MonthEventList.js';
import { addEvent, getEventDaysForMonth, getEventsForDay, deleteEvent, saveEventsToFile, loadEventsFromFile } from './calendarData.js';
import { importCalcureEventsFromFile } from './importers/calcure.js';
import { importCalcurseEventsFromFile } from './importers/calcurse.js';
import os from 'os';
import path from 'path';
import fs from 'fs';

const now = new Date();
const SAVE_DIR = path.join(os.homedir(), '.config', 'geekcalendar');
const SAVE_FILE = path.join(SAVE_DIR, 'calendar.json');
const CALCURE_FILE = path.join(os.homedir(), '.config', 'calcure', 'events.csv');
const CALCURSE_FILE = path.join(os.homedir(), '.local', 'share', 'calcurse', 'apts');

function ensureSaveDir() {
	if (!fs.existsSync(SAVE_DIR)) {
		fs.mkdirSync(SAVE_DIR, { recursive: true });
	}
}

function getAllEventsForMonth(year, month) {
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	const events = [];
	for (let day = 1; day <= daysInMonth; day++) {
		const dayEvents = getEventsForDay(year, month, day);
		for (let i = 0; i < dayEvents.length; i++) {
			events.push({ day, index: i, text: dayEvents[i].text });
		}
	}
	return events;
}

const App = ({ onRequestQuit }) => {
	const [year, setYear] = useState(now.getFullYear());
	const [month, setMonth] = useState(now.getMonth());
	const [inputMode, setInputMode] = useState(null); // null | 'day' | 'text'
	const [inputDay, setInputDay] = useState('');
	const [inputText, setInputText] = useState('');
	const [message, setMessage] = useState('');
	const [selected, setSelected] = useState(null); // {day, index}
	const [confirmDelete, setConfirmDelete] = useState(false);
	const [editMode, setEditMode] = useState(false);
	const [editText, setEditText] = useState('');
	const [confirmQuit, setConfirmQuit] = useState(false); // NEW STATE
    const [shouldQuit, setShouldQuit] = useState(false); // NEW STATE
	const { exit } = useApp();

	const eventDays = getEventDaysForMonth(year, month);
	const allEvents = getAllEventsForMonth(year, month);

	// Load events from file on startup
	React.useEffect(() => {
		try {
			loadEventsFromFile(SAVE_FILE);
			setMessage('Events loaded from file.');
		} catch (e) {
			// ignore if file doesn't exist
		}
	}, []);

	// Reset selection if month/year changes or no events
	React.useEffect(() => {
		if (allEvents.length === 0) setSelected(null);
		else if (!selected || !allEvents.some(e => e.day === selected.day && e.index === selected.index)) setSelected(allEvents[0]);
	}, [year, month, allEvents.length]);

	useInput((input, key) => {
		if (confirmQuit) {
			if (input.toLowerCase() === 'y') {
				ensureSaveDir();
				saveEventsToFile(SAVE_FILE);
                onRequestQuit && onRequestQuit();
			} else if (input.toLowerCase() === 'n') {
                onRequestQuit && onRequestQuit();
			} else if (key.escape) {
				setConfirmQuit(false);
				setMessage('Quit cancelled.');
			}
			return;
		}
		if (confirmDelete) {
			if (input.toLowerCase() === 'y') {
				deleteEvent(year, month, selected.day, selected.index);
				setMessage('Event deleted!');
				setSelected(null);
				setConfirmDelete(false);
			} else if (input.toLowerCase() === 'n' || key.escape) {
				setMessage('Delete cancelled.');
				setConfirmDelete(false);
			}
			return;
		}
		if (editMode) {
			if (key.return) {
				// Update event text
				const eventsForDay = getEventsForDay(year, month, selected.day);
				if (eventsForDay && eventsForDay[selected.index]) {
					eventsForDay[selected.index].text = editText;
					setMessage('Event updated!');
				}
				setEditMode(false);
				setEditText('');
			} else if (key.escape) {
				setEditMode(false);
				setEditText('');
				setMessage('Edit cancelled.');
			} else if (key.backspace || key.delete) {
				setEditText(editText.slice(0, -1));
			} else {
				setEditText(editText + input);
			}
			return;
		}
		if (inputMode === 'day') {
			if (key.return) {
				const dayNum = parseInt(inputDay, 10);
				if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
					setInputMode('text');
				} else {
					setMessage('Invalid day. Try again.');
					setInputDay('');
				}
			} else if (key.backspace || key.delete) {
				setInputDay(inputDay.slice(0, -1));
			} else if (/^[0-9]$/.test(input)) {
				setInputDay(inputDay + input);
			}
			return;
		}
		if (inputMode === 'text') {
			if (key.return) {
				const dayNum = parseInt(inputDay, 10);
				addEvent(year, month, dayNum, inputText);
				setInputMode(null);
				setInputDay('');
				setInputText('');
				setMessage('Event added!');
			} else if (key.backspace || key.delete) {
				setInputText(inputText.slice(0, -1));
			} else {
				setInputText(inputText + input);
			}
			return;
		}
		if (key.leftArrow || input === 'h') {
			let newMonth = month - 1;
			let newYear = year;
			if (newMonth < 0) {
				newMonth = 11;
				newYear--;
			}
			setMonth(newMonth);
			setYear(newYear);
			setSelected(null);
		}
		if (key.rightArrow || input === 'l') {
			let newMonth = month + 1;
			let newYear = year;
			if (newMonth > 11) {
				newMonth = 0;
				newYear++;
			}
			setMonth(newMonth);
			setYear(newYear);
			setSelected(null);
		}
		// Shift+j (J) and Shift+k (K) for year navigation
		if (input === 'J') {
			setYear(year + 1);
			setSelected(null);
		}
		if (input === 'K') {
			setYear(year - 1);
			setSelected(null);
		}
		// Only move event selection if events exist
		if ((key.downArrow || input === 'j') && allEvents.length > 0 && selected) {
			const idx = allEvents.findIndex(e => e.day === selected.day && e.index === selected.index);
			const next = allEvents[(idx + 1) % allEvents.length];
			setSelected(next);
		}
		if ((key.upArrow || input === 'k') && allEvents.length > 0 && selected) {
			const idx = allEvents.findIndex(e => e.day === selected.day && e.index === selected.index);
			const prev = allEvents[(idx - 1 + allEvents.length) % allEvents.length];
			setSelected(prev);
		}
		if (input === 'g') {
			setYear(now.getFullYear());
			setMonth(now.getMonth());
			setSelected(null);
		}
		if (input === 'a') {
			setInputMode('day');
			setInputDay('');
			setInputText('');
			setMessage('');
		}
		if (input === 'd' && selected) {
			setConfirmDelete(true);
			setMessage('Delete this event? (y/n)');
			return;
		}
		if (input === 's') {
			ensureSaveDir();
			saveEventsToFile(SAVE_FILE);
			setMessage('Events saved to file.');
		}
		if (input === 'S') {
			loadEventsFromFile(SAVE_FILE);
			setMessage('Events loaded from file.');
			setSelected(null);
		}
		if (input === 'c') {
			try {
				const imported = importCalcureEventsFromFile(CALCURE_FILE);
				for (const e of imported) addEvent(e.year, e.month, e.day, e.text);
				saveEventsToFile(SAVE_FILE);
				setMessage(`Imported events from Calcure (${CALCURE_FILE}).`);
			} catch (e) {
				setMessage(`Failed to import from Calcure (${CALCURE_FILE}).`);
			}
		}
		if (input === 'u') {
			try {
				const imported = importCalcurseEventsFromFile(CALCURSE_FILE);
				for (const e of imported) addEvent(e.year, e.month, e.day, e.text);
				saveEventsToFile(SAVE_FILE);
				setMessage(`Imported events from Calcurse (${CALCURSE_FILE}).`);
			} catch (e) {
				setMessage(`Failed to import from Calcurse (${CALCURSE_FILE}).`);
			}
		}
		if (input === 'q') {
			setConfirmQuit(true);
			// Do not setMessage here, the prompt is rendered below
			return;
		}
		if (input === 'e' && selected) {
			const eventsForDay = getEventsForDay(year, month, selected.day);
			if (eventsForDay && eventsForDay[selected.index]) {
				setEditText(eventsForDay[selected.index].text);
				setEditMode(true);
				setMessage('Edit event text:');
			}
			return;
		}
	});

    React.useEffect(() => {
        if (shouldQuit) {
            exit({ exit: false });
        }
    }, [shouldQuit, exit]);

	const monthNames = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];

	return React.createElement(Box, { flexDirection: 'column' },
		React.createElement(Text, { color: 'cyan' }, 'GeekCalendar'),
		React.createElement(Box, { marginTop: 1, marginBottom: 1 },
			React.createElement(Text, { bold: true }, `${monthNames[month]} ${year}`)
		),
		React.createElement(Box, { flexDirection: 'row' },
			React.createElement(Calendar, { year, month, eventDays }),
			React.createElement(MonthEventList, {
				year,
				month,
				selectedDay: selected ? selected.day : null,
				selectedEventIndex: selected ? selected.index : null
			})
		),
		inputMode === 'day' && React.createElement(Box, { marginTop: 1 },
			React.createElement(Text, null, 'Enter day of month: '),
			React.createElement(Text, { inverse: true }, inputDay || ' ')
		),
		inputMode === 'text' && React.createElement(Box, { marginTop: 1 },
			React.createElement(Text, null, `Event for day ${inputDay}: `),
			React.createElement(Text, { inverse: true }, inputText || ' ')
		),
		message && React.createElement(Box, { marginTop: 1 },
			React.createElement(Text, { color: 'green' }, message)
		),
		confirmDelete && React.createElement(Box, { marginTop: 1 },
			React.createElement(Text, { color: 'red', bold: true }, 'Delete this event? (y/n)')
		),
		editMode && React.createElement(Box, { marginTop: 1 },
			React.createElement(Text, null, 'Edit event: '),
			React.createElement(Text, { inverse: true }, editText || ' ')
		),
		confirmQuit && React.createElement(Box, { marginTop: 1 },
			React.createElement(Text, { color: 'yellow', bold: true }, 'Save before quitting? (y/n, esc to cancel)')
		),
		React.createElement(Box, { marginTop: 1 },
			React.createElement(Text, { dimColor: true }, '←/h: prev month  →/l: next month  SHIFT+J: next year  SHIFT+K: prev year  g: today  a: add event  d: delete event  s: save  S: load  c: import Calcure  u: import Calcurse  q: quit')
		)
	);
};

console.clear();
let inkInstance;
function handleRequestQuit() {
  if (inkInstance) {
    inkInstance.unmount();
    setTimeout(() => {
      process.stdout.write('\x1b[2J\x1b[0;0H'); // clear screen
      process.stdout.write('\nYou can financially support the development of this app at https://ko-fi.com/fearlessgeekmedia\n');
      process.exit();
    }, 50);
  }
}
inkInstance = render(React.createElement(App, { onRequestQuit: handleRequestQuit }), {
  exitOnCtrlC: false
});
