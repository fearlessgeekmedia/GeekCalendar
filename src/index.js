#!/usr/bin/env node
import React, { useState } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import Calendar from './components/Calendar.js';
import MonthEventList from './components/MonthEventList.js';
import { addEvent, getEventDaysForMonth, getEventsForDay, deleteEvent, saveEventsToFile, loadEventsFromFile } from './calendarData.js';
import { importCalcureEventsFromFile } from './importers/calcure.js';
import { importCalcurseEventsFromFile } from './importers/calcurse.js';
import { syncWithGitHub, listRemoteCommits, getFileContentAtRef, listLocalBackups } from './githubSync.js';
import { themes, defaultTheme } from './themes.js';
import os from 'os';
import path from 'path';
import fs from 'fs';

const now = new Date();
const SAVE_DIR = path.join(os.homedir(), '.config', 'geekcalendar');
const SAVE_FILE = path.join(SAVE_DIR, 'calendar.json');
const THEME_FILE = path.join(SAVE_DIR, 'theme.json');
const CALCURE_FILE = path.join(os.homedir(), '.config', 'calcure', 'events.csv');
const CALCURSE_FILE = path.join(os.homedir(), '.local', 'share', 'calcurse', 'apts');

function ensureSaveDir() {
	if (!fs.existsSync(SAVE_DIR)) {
		fs.mkdirSync(SAVE_DIR, { recursive: true });
	}
}

function saveThemeToFile(themeName) {
	try {
		ensureSaveDir();
		fs.writeFileSync(THEME_FILE, JSON.stringify({ theme: themeName }, null, 2), 'utf8');
	} catch (e) {
		console.error('Failed to save theme:', e);
	}
}

function loadThemeFromFile() {
	try {
		if (fs.existsSync(THEME_FILE)) {
			const content = fs.readFileSync(THEME_FILE, 'utf8');
			const config = JSON.parse(content);
			return config.theme && themes[config.theme] ? config.theme : defaultTheme;
		}
	} catch (e) {
		console.error('Failed to load theme:', e);
	}
	return defaultTheme;
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
    const [restoreMode, setRestoreMode] = useState(null); // null | 'chooseSource' | 'chooseLocal' | 'chooseRemote'
    const [localBackups, setLocalBackups] = useState([]);
    const [remoteCommits, setRemoteCommits] = useState([]);
    const [recurrenceStage, setRecurrenceStage] = useState(null); // null | 'ask' | 'type' | 'count'
    const [recurrenceType, setRecurrenceType] = useState(null); // 'weekly' | 'monthly' | 'yearly'
    const [recurrenceInput, setRecurrenceInput] = useState(''); // count input
    const [pendingEvent, setPendingEvent] = useState(null); // { year, month, day, text }
    const [currentTheme, setCurrentTheme] = useState(loadThemeFromFile());
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

        // Recurrence flow handling
        if (recurrenceStage) {
            if (recurrenceStage === 'ask') {
                if (input.toLowerCase() === 'y') {
                    setRecurrenceStage('type');
                    setMessage('Recurring type? (w) weekly  (m) monthly  (y) yearly  (esc to cancel)');
                } else if (input.toLowerCase() === 'n' || key.escape) {
                    setRecurrenceStage(null);
                    setPendingEvent(null);
                    setMessage('Event added.');
                }
                return;
            }
            if (recurrenceStage === 'type') {
                if (input.toLowerCase() === 'w') {
                    setRecurrenceType('weekly');
                    setRecurrenceStage('count');
                    setRecurrenceInput('');
                    setMessage('How many additional weekly occurrences? (enter a number, esc to cancel)');
                } else if (input.toLowerCase() === 'm') {
                    setRecurrenceType('monthly');
                    setRecurrenceStage('count');
                    setRecurrenceInput('');
                    setMessage('How many additional monthly occurrences? (enter a number, esc to cancel)');
                } else if (input.toLowerCase() === 'y') {
                    setRecurrenceType('yearly');
                    setRecurrenceStage('count');
                    setRecurrenceInput('');
                    setMessage('How many additional yearly occurrences? (enter a number, esc to cancel)');
                } else if (key.escape) {
                    setRecurrenceStage(null);
                    setPendingEvent(null);
                    setMessage('Recurring cancelled.');
                }
                return;
            }
            if (recurrenceStage === 'count') {
                if (key.return) {
                    const count = parseInt(recurrenceInput, 10);
                    if (!isNaN(count) && count > 0 && pendingEvent) {
                        // Helpers for date math
                        const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
                        const addWeeks = (y, m, d, weeks) => {
                            const base = new Date(y, m, d);
                            base.setDate(base.getDate() + weeks * 7);
                            return { year: base.getFullYear(), month: base.getMonth(), day: base.getDate() };
                        };
                        const addMonthsClamped = (y, m, d, months) => {
                            const targetMonth = m + months;
                            const targetYear = y + Math.floor(targetMonth / 12);
                            const normalizedMonth = ((targetMonth % 12) + 12) % 12;
                            const dim = daysInMonth(targetYear, normalizedMonth);
                            const targetDay = Math.min(d, dim);
                            return { year: targetYear, month: normalizedMonth, day: targetDay };
                        };
                        const addYearsClamped = (y, m, d, years) => {
                            const targetYear = y + years;
                            const dim = daysInMonth(targetYear, m);
                            const targetDay = Math.min(d, dim);
                            return { year: targetYear, month: m, day: targetDay };
                        };

                        let added = 0;
                        for (let i = 1; i <= count; i++) {
                            let nextDate;
                            if (recurrenceType === 'weekly') nextDate = addWeeks(pendingEvent.year, pendingEvent.month, pendingEvent.day, i);
                            else if (recurrenceType === 'monthly') nextDate = addMonthsClamped(pendingEvent.year, pendingEvent.month, pendingEvent.day, i);
                            else if (recurrenceType === 'yearly') nextDate = addYearsClamped(pendingEvent.year, pendingEvent.month, pendingEvent.day, i);
                            if (nextDate) {
                                addEvent(nextDate.year, nextDate.month, nextDate.day, pendingEvent.text);
                                added++;
                            }
                        }
                        setMessage(`Event added with ${added} additional ${recurrenceType} occurrences.`);
                    } else {
                        setMessage('Invalid number for occurrences.');
                    }
                    setRecurrenceStage(null);
                    setRecurrenceType(null);
                    setRecurrenceInput('');
                    setPendingEvent(null);
                } else if (key.backspace || key.delete) {
                    setRecurrenceInput(recurrenceInput.slice(0, -1));
                } else if (/^[0-9]$/.test(input)) {
                    setRecurrenceInput(recurrenceInput + input);
                } else if (key.escape) {
                    setRecurrenceStage(null);
                    setRecurrenceType(null);
                    setRecurrenceInput('');
                    setPendingEvent(null);
                    setMessage('Recurring cancelled.');
                }
                return;
            }
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
        if (restoreMode === 'chooseSource') {
            if (input.toLowerCase() === 'l') {
                try {
                    const backups = listLocalBackups();
                    setLocalBackups(backups);
                    setRestoreMode('chooseLocal');
                    setMessage('Choose a local backup to restore (1-9), esc to cancel.');
                } catch (e) {
                    setMessage('Failed to list local backups.');
                    setRestoreMode(null);
                }
            } else if (input.toLowerCase() === 'g') {
                setMessage('Fetching GitHub history...');
                listRemoteCommits(5).then(commits => {
                    setRemoteCommits(commits);
                    setRestoreMode('chooseRemote');
                    setMessage('Choose a GitHub revision to restore (1-5), esc to cancel.');
                }).catch(err => {
                    setMessage(`Failed to fetch GitHub history: ${err.message}`);
                    setRestoreMode(null);
                });
            } else if (key.escape) {
                setRestoreMode(null);
                setMessage('Restore cancelled.');
            }
            return;
        }
        if (restoreMode === 'chooseLocal') {
            if (/^[1-9]$/.test(input)) {
                const idx = parseInt(input, 10) - 1;
                if (localBackups[idx]) {
                    try {
                        ensureSaveDir();
                        fs.copyFileSync(localBackups[idx].fullPath, SAVE_FILE);
                        loadEventsFromFile(SAVE_FILE);
                        setMessage(`Restored from backup: ${localBackups[idx].fileName}`);
                    } catch (e) {
                        setMessage('Failed to restore from backup.');
                    }
                    setRestoreMode(null);
                }
            } else if (key.escape) {
                setRestoreMode(null);
                setMessage('Restore cancelled.');
            }
            return;
        }
        if (restoreMode === 'chooseRemote') {
            if (/^[1-5]$/.test(input)) {
                const idx = parseInt(input, 10) - 1;
                if (remoteCommits[idx]) {
                    setMessage('Restoring from GitHub...');
                    getFileContentAtRef(remoteCommits[idx].sha).then(content => {
                        try {
                            const parsed = JSON.parse(content);
                            ensureSaveDir();
                            fs.writeFileSync(SAVE_FILE, JSON.stringify(parsed, null, 2), 'utf8');
                            loadEventsFromFile(SAVE_FILE);
                            setMessage(`Restored from GitHub commit ${remoteCommits[idx].sha.substring(0,7)}.`);
                        } catch (e) {
                            setMessage('Remote file at selected commit is not valid JSON.');
                        }
                    }).catch(err => {
                        setMessage(`Failed to restore from GitHub: ${err.message}`);
                    }).finally(() => {
                        setRestoreMode(null);
                    });
                }
            } else if (key.escape) {
                setRestoreMode(null);
                setMessage('Restore cancelled.');
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
			} else if (key.escape) {
				setInputMode(null);
				setInputDay('');
				setMessage('Add event cancelled.');
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
				setPendingEvent({ year, month, day: dayNum, text: inputText });
				setInputMode(null);
				setInputDay('');
				setInputText('');
				setRecurrenceStage('ask');
				setMessage('Make this event recurring? (y/n)');
			} else if (key.escape) {
				setInputMode(null);
				setInputText('');
				setMessage('Add event cancelled.');
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
        if (input === 'r') {
            setRestoreMode('chooseSource');
            setMessage('Restore: l = local backups, g = GitHub history (esc to cancel)');
            return;
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
        if (input === 'y') {
            // Autosave current in-memory events to avoid losing unsaved changes
            ensureSaveDir();
            saveEventsToFile(SAVE_FILE);
            setMessage('Syncing with GitHub...');
            syncWithGitHub(SAVE_FILE).then(() => {
                loadEventsFromFile(SAVE_FILE); // Reload events from disk
                setMessage('Synced with GitHub!');
            }).catch(err => {
                setMessage(`GitHub sync failed: ${err.message}`);
            });
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
		if (input === 't') {
			const themeNames = Object.keys(themes);
			const currentIndex = themeNames.indexOf(currentTheme);
			const nextIndex = (currentIndex + 1) % themeNames.length;
			const nextTheme = themeNames[nextIndex];
			setCurrentTheme(nextTheme);
			saveThemeToFile(nextTheme);
			setMessage(`Theme changed to: ${themes[nextTheme].name}`);
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
		// Colorful header with theme colors
		React.createElement(Box, { marginTop: 1, marginBottom: 1, alignItems: 'center' },
			...themes[currentTheme].header.map((color, i) => 
				React.createElement(Text, { 
					key: i,
					color: color, 
					bold: true 
				}, 'GeekCalendar'[i])
			)
		),
		React.createElement(Box, { marginTop: 1, marginBottom: 1, alignItems: 'center' },
			React.createElement(Text, { color: themes[currentTheme].monthYear, bold: true, italic: true }, `${monthNames[month]} ${year}`)
		),
		React.createElement(Box, { flexDirection: 'row' },
			React.createElement(Calendar, { year, month, eventDays, theme: themes[currentTheme] }),
			React.createElement(MonthEventList, {
				year,
				month,
				selectedDay: selected ? selected.day : null,
				selectedEventIndex: selected ? selected.index : null,
				theme: themes[currentTheme]
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
			React.createElement(Text, { color: themes[currentTheme].messages.success }, message)
		),
		confirmDelete && React.createElement(Box, { marginTop: 1 },
			React.createElement(Text, { color: themes[currentTheme].messages.error, bold: true }, 'Delete this event? (y/n)')
		),
		editMode && React.createElement(Box, { marginTop: 1 },
			React.createElement(Text, null, 'Edit event: '),
			React.createElement(Text, { inverse: true }, editText || ' ')
		),
		confirmQuit && React.createElement(Box, { marginTop: 1 },
			React.createElement(Text, { color: themes[currentTheme].messages.warning, bold: true }, 'Save before quitting? (y/n, esc to cancel)')
		),
		React.createElement(Box, { marginTop: 1 },
			React.createElement(Text, { dimColor: true }, '←/h: prev  →/l: next  SHIFT+J: next yr  SHIFT+K: prev yr  g: today  a: add  e: edit  d: delete  s: save  S: load  c: Calcure  u: Calcurse  y: sync  r: restore  t: theme  q: quit')
		),
        restoreMode === 'chooseSource' && React.createElement(Box, { marginTop: 1 },
            React.createElement(Text, { color: 'yellow' }, 'Restore: l = local backups, g = GitHub history (esc to cancel)')
        ),
        restoreMode === 'chooseLocal' && React.createElement(Box, { marginTop: 1, flexDirection: 'column' },
            React.createElement(Text, { bold: true }, 'Local backups (choose 1-9):'),
            ...localBackups.slice(0, 9).map((b, i) => React.createElement(Text, { key: b.fileName }, `${i+1}. ${b.fileName}`))
        ),
        restoreMode === 'chooseRemote' && React.createElement(Box, { marginTop: 1, flexDirection: 'column' },
            React.createElement(Text, { bold: true }, 'GitHub history (choose 1-5):'),
            ...remoteCommits.slice(0, 5).map((c, i) => {
                const shortSha = c.sha ? c.sha.substring(0,7) : 'unknown';
                const date = c.date ? new Date(c.date).toISOString().slice(0,10) : '';
                const msg = (c.message || '').split('\n')[0];
                return React.createElement(Text, { key: c.sha || String(i) }, `${i+1}. ${shortSha} ${date} ${msg}`);
            })
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
