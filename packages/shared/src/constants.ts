// Fixed vocabularies used by the API, the database and the web app.

export const ROLES = ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST'] as const;
export type Role = (typeof ROLES)[number];

/** Roles a hospital admin may give to staff. SUPER_ADMIN is platform-level and can't be assigned through the API. */
export const STAFF_ROLES = ['HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST'] as const satisfies readonly Role[];
export type StaffRole = (typeof STAFF_ROLES)[number];

export const GENDERS = ['Male', 'Female', 'Other'] as const;
export type Gender = (typeof GENDERS)[number];

/** OPD = outpatient (visits), IPD = inpatient (admitted). */
export const PATIENT_TYPES = ['OPD', 'IPD'] as const;
export type PatientType = (typeof PATIENT_TYPES)[number];

export const PATIENT_STATUSES = ['Active', 'Discharged'] as const;
export type PatientStatus = (typeof PATIENT_STATUSES)[number];
