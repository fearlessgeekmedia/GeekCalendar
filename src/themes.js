// Color themes for GeekCalendar
export const themes = {
	// Classic rainbow theme
	rainbow: {
		name: 'Rainbow',
		header: ['red', 'yellow', 'green', 'cyan', 'magenta', 'blue', 'red', 'yellow', 'green', 'cyan', 'magenta', 'blue'],
		monthYear: 'cyan',
		calendar: {
			border: 'cyan',
			header: {
				weekday: 'cyan',
				weekend: 'magenta'
			},
			days: {
				empty: 'gray',
				weekday: 'white',
				weekend: 'magenta',
				today: 'green',
				event: 'cyan'
			},
			backgrounds: {
				today: 'green',
				event: 'blue'
			}
		},
		events: {
			separator: 'magenta',
			dayHeader: 'cyan',
			event: 'white',
			selected: 'yellow',
			noEvents: 'gray'
		},
		messages: {
			success: 'green',
			error: 'red',
			warning: 'yellow',
			info: 'cyan'
		}
	},

	// Dark theme
	dark: {
		name: 'Dark',
		header: ['white', 'white', 'white', 'white', 'white', 'white', 'white', 'white', 'white', 'white', 'white', 'white'],
		monthYear: 'white',
		calendar: {
			border: 'white',
			header: {
				weekday: 'white',
				weekend: 'cyan'
			},
			days: {
				empty: 'gray',
				weekday: 'white',
				weekend: 'cyan',
				today: 'green',
				event: 'yellow'
			},
			backgrounds: {
				today: 'green',
				event: 'yellow'
			}
		},
		events: {
			separator: 'gray',
			dayHeader: 'white',
			event: 'white',
			selected: 'cyan',
			noEvents: 'gray'
		},
		messages: {
			success: 'green',
			error: 'red',
			warning: 'yellow',
			info: 'white'
		}
	},

	// Ocean theme
	ocean: {
		name: 'Ocean',
		header: ['blue', 'cyan', 'blue', 'cyan', 'blue', 'cyan', 'blue', 'cyan', 'blue', 'cyan', 'blue', 'cyan'],
		monthYear: 'cyan',
		calendar: {
			border: 'blue',
			header: {
				weekday: 'cyan',
				weekend: 'blue'
			},
			days: {
				empty: 'gray',
				weekday: 'cyan',
				weekend: 'blue',
				today: 'green',
				event: 'yellow'
			},
			backgrounds: {
				today: 'green',
				event: 'blue'
			}
		},
		events: {
			separator: 'blue',
			dayHeader: 'cyan',
			event: 'white',
			selected: 'yellow',
			noEvents: 'gray'
		},
		messages: {
			success: 'green',
			error: 'red',
			warning: 'yellow',
			info: 'cyan'
		}
	},

	// Forest theme
	forest: {
		name: 'Forest',
		header: ['green', 'yellow', 'green', 'yellow', 'green', 'yellow', 'green', 'yellow', 'green', 'yellow', 'green', 'yellow'],
		monthYear: 'green',
		calendar: {
			border: 'green',
			header: {
				weekday: 'green',
				weekend: 'yellow'
			},
			days: {
				empty: 'gray',
				weekday: 'green',
				weekend: 'yellow',
				today: 'red',
				event: 'cyan'
			},
			backgrounds: {
				today: 'red',
				event: 'green'
			}
		},
		events: {
			separator: 'green',
			dayHeader: 'green',
			event: 'white',
			selected: 'yellow',
			noEvents: 'gray'
		},
		messages: {
			success: 'green',
			error: 'red',
			warning: 'yellow',
			info: 'green'
		}
	},

	// Sunset theme
	sunset: {
		name: 'Sunset',
		header: ['red', 'yellow', 'red', 'yellow', 'red', 'yellow', 'red', 'yellow', 'red', 'yellow', 'red', 'yellow'],
		monthYear: 'yellow',
		calendar: {
			border: 'red',
			header: {
				weekday: 'yellow',
				weekend: 'red'
			},
			days: {
				empty: 'gray',
				weekday: 'yellow',
				weekend: 'red',
				today: 'green',
				event: 'cyan'
			},
			backgrounds: {
				today: 'green',
				event: 'red'
			}
		},
		events: {
			separator: 'red',
			dayHeader: 'yellow',
			event: 'white',
			selected: 'cyan',
			noEvents: 'gray'
		},
		messages: {
			success: 'green',
			error: 'red',
			warning: 'yellow',
			info: 'yellow'
		}
	}
};

export const defaultTheme = 'rainbow'; 