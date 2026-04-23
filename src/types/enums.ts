/** Common working hours per day (for reference). Decimals like 2.4 are allowed in rows. */
export const WORKING_HOURS_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export type WorkingHours = (typeof WORKING_HOURS_OPTIONS)[number];

export const FULL_DAY_HOURS = 8;
