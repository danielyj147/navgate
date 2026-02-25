// All times in minutes from midnight, Eastern Time

/** Overnight restriction starts */
export const OVERNIGHT_START = 3 * 60; // 3:00 AM

/** Overnight restriction ends / business hours start */
export const BUSINESS_START = 7 * 60; // 7:00 AM

/** Business hours end / open hours start */
export const OPEN_START = 16 * 60 + 30; // 4:30 PM

/** Open hours end (next day overnight starts) */
export const OPEN_END = 24 * 60 + 3 * 60; // 3:00 AM next day (treated as 27:00 for math)

/** Minutes before a transition to show yellow/orange */
export const TRANSITION_WINDOW = 30;
