export interface StatutoryHolidayPreset {
  name: string;
  startDate: string;
  endDate: string;
  holidayType: "public_holiday" | "mid_term_break" | "school_recess" | "special_closure";
  description: string;
}

/**
 * Returns gazetted Nigerian statutory public holidays tailored for a given academic year.
 * e.g., '2025/2026' spans from Sept 2025 to July 2026.
 */
export function getStatutoryHolidayPresets(academicYear: string = "2025/2026"): StatutoryHolidayPreset[] {
  const parts = academicYear.split("/");
  const startYear = parseInt(parts[0], 10) || new Date().getFullYear();
  const endYear = parseInt(parts[1], 10) || startYear + 1;

  // Compute Easter / Spring dates approximation or accurate calendar for 2025/2026/2027
  let goodFriday = `${endYear}-04-03`;
  let easterMonday = `${endYear}-04-06`;
  let eidElFitr = `${endYear}-03-20`;
  let eidElKabir = `${endYear}-05-27`;

  if (startYear === 2024 || endYear === 2025) {
    goodFriday = `2025-04-18`;
    easterMonday = `2025-04-21`;
    eidElFitr = `2025-03-31`;
    eidElKabir = `2025-06-06`;
  } else if (startYear === 2025 || endYear === 2026) {
    goodFriday = `2026-04-03`;
    easterMonday = `2026-04-06`;
    eidElFitr = `2026-03-20`;
    eidElKabir = `2026-05-27`;
  } else if (startYear === 2026 || endYear === 2027) {
    goodFriday = `2027-03-26`;
    easterMonday = `2027-03-29`;
    eidElFitr = `2027-03-10`;
    eidElKabir = `2027-05-17`;
  }

  return [
    {
      name: "Independence Day",
      startDate: `${startYear}-10-01`,
      endDate: `${startYear}-10-01`,
      holidayType: "public_holiday",
      description: "Commemorates Nigeria's independence from Great Britain in 1960.",
    },
    {
      name: "Christmas Day",
      startDate: `${startYear}-12-25`,
      endDate: `${startYear}-12-25`,
      holidayType: "public_holiday",
      description: "Annual Christian celebration of the birth of Jesus Christ.",
    },
    {
      name: "Boxing Day",
      startDate: `${startYear}-12-26`,
      endDate: `${startYear}-12-26`,
      holidayType: "public_holiday",
      description: "Public holiday following Christmas Day.",
    },
    {
      name: "New Year's Day",
      startDate: `${endYear}-01-01`,
      endDate: `${endYear}-01-01`,
      holidayType: "public_holiday",
      description: "First day of the Gregorian calendar year.",
    },
    {
      name: "Eid-el-Fitr (End of Ramadan)",
      startDate: eidElFitr,
      endDate: eidElFitr,
      holidayType: "public_holiday",
      description: "Islamic celebration marking the conclusion of the holy month of Ramadan.",
    },
    {
      name: "Good Friday",
      startDate: goodFriday,
      endDate: goodFriday,
      holidayType: "public_holiday",
      description: "Christian holy day commemorating the crucifixion of Jesus Christ.",
    },
    {
      name: "Easter Monday",
      startDate: easterMonday,
      endDate: easterMonday,
      holidayType: "public_holiday",
      description: "Celebration following Easter Sunday.",
    },
    {
      name: "Workers' Day (May Day)",
      startDate: `${endYear}-05-01`,
      endDate: `${endYear}-05-01`,
      holidayType: "public_holiday",
      description: "International celebration honoring workers and labor rights.",
    },
    {
      name: "Eid-el-Kabir (Feast of Sacrifice)",
      startDate: eidElKabir,
      endDate: eidElKabir,
      holidayType: "public_holiday",
      description: "Major Islamic festival honoring the willingness of Ibrahim to sacrifice his son.",
    },
    {
      name: "Democracy Day",
      startDate: `${endYear}-06-12`,
      endDate: `${endYear}-06-12`,
      holidayType: "public_holiday",
      description: "National commemoration of democratic governance in Nigeria (June 12, 1993).",
    },
  ];
}
