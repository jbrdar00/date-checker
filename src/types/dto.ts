/** Person data (top card): name, OIB, date of birth. */
export interface PersonDto {
  name: string;
  oib: string;
  dateOfBirth: string;
}

/** Single date range row (one range with hours per day). */
export interface DateRangeRowDto {
  id: number;
  start: string;
  end: string;
  /** Hours per day (0.1–8), e.g. 8 = full day, 2.4 = part-time. */
  hours: number;
  poslodavac: string;
  /** If true, this row is included in neprekidni staž (continuous employment). */
  javnaUstanova?: boolean;
  /** Hex color for calendar/list marker (e.g. #2563eb). */
  color?: string;
}

/** One partial day (date with less than 8 combined hours). */
export interface PartialDayDto {
  date: string;
  dateDisplay: string;
  hours: number;
  hoursToAdd: number;
}

/** Result of getPartialAndFullDays. */
export interface PartialAndFullDaysResult {
  fullDaysCount: number;
  partialList: PartialDayDto[];
  partialHoursSum: number;
  partialDaysCount: number;
  hoursToAddForFull: number;
  workingDaysWithAddition: number;
}

/** One continuous period (ranges with gap ≤ maxGap days). */
export interface ContinuousPeriodResult {
  /** First day of this period (YYYY-MM-DD). */
  start: string;
  /** Last day of this period (YYYY-MM-DD). */
  end: string;
  /** Original row indices (into rows array) that fall in this period. */
  rowIndices: number[];
  /** Working days in this period (without addition). */
  workingDays: number;
  /** Working days in this period (with addition: partial days counted as full). */
  workingDaysWithAddition: number;
}

/** One break (gap > 8 days) between two continuous blocks. */
export interface ContinuousStazBreak {
  /** Last day of previous block (YYYY-MM-DD). */
  endDate: string;
  /** First day of next block (YYYY-MM-DD). */
  startDate: string;
  /** Number of days between endDate and startDate. */
  gapDays: number;
  /** Employer name ending before the break (optional). */
  endPoslodavac?: string;
  /** Employer name starting after the break (optional). */
  startPoslodavac?: string;
}

/** Result of getContinuousStaz. */
export interface ContinuousStazResult {
  /** Total working days in all continuous periods (without addition). */
  totalWorkingDays: number;
  /** Total working days in all continuous periods (with addition). */
  totalWorkingDaysWithAddition: number;
  periods: ContinuousPeriodResult[];
  /** All gaps > 8 days that split continuous employment (chronological order). */
  breaks: ContinuousStazBreak[];
}

/** Map of date key (YYYY-MM-DD) to total hours. */
export type HoursPerDateMap = Record<string, number>;

/** Saved calculation (person + rows) stored in local DB. */
export interface SavedCalculationDto {
  id: string;
  createdAt: number;
  updatedAt: number;
  person: PersonDto;
  rows: DateRangeRowDto[];
}
