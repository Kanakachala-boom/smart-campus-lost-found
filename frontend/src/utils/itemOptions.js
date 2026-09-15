/**
 * Options, campus presets, and validation rules for Lost & Found item reporting
 * at The National Institute of Engineering (NIE), Mysuru.
 */

export const ITEM_CATEGORIES = [
  "Electronics & Gadgets",
  "College ID & Cards",
  "Wallets & Purses",
  "Keys",
  "Bags & Backpacks",
  "Books & Stationery",
  "Personal Accessories",
  "Clothing & Lab Coats",
  "Other",
];

export const CAMPUS_LOCATIONS = [
  "Central Library",
  "Campus Canteen",
  "Diamond Jubilee Sports Complex",
  "Admin Block",
  "Main Auditorium",
  "ECE/ISE Block",
  "Mechanical Engineering Block",
  "Civil & Electrical Block",
  "Department Office / Staff Room",
  "Main Gate & Security Post",
  "Campus Parking Area",
  "Hostel Blocks (Boys / Girls)",
  "Other / Specific Location",
];

export const OTHER_LOCATION_VALUE = "Other / Specific Location";

export const TIME_PERIODS = [
  "Early Morning (6:00 AM – 9:00 AM)",
  "Morning (9:00 AM – 12:00 PM)",
  "Afternoon (12:00 PM – 4:00 PM)",
  "Evening (4:00 PM – 7:00 PM)",
  "Night (7:00 PM onwards)",
  "Unsure / Not remembered",
];

export const CUSTODY_LOCATIONS = [
  "Campus Security Desk — Main Gate",
  "Central Library Enquiry Counter",
  "Department Office",
  "Staff Room / Faculty In-Charge",
  "Hostel Office",
  "Finder's Possession (Available for direct handover)",
  "Other",
];

export const OTHER_CUSTODY_VALUE = "Other";

export const CONTACT_PREFERENCES = [
  "In-App Direct Chat",
  "Coordinate Handover via Campus Security / Admin",
];

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Returns today's date in YYYY-MM-DD format based on local time.
 */
export function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Validates that a date string is a valid past or present calendar date.
 */
export function isValidPastOrPresentDate(dateStr) {
  if (!dateStr) return false;
  const selected = new Date(dateStr);
  if (isNaN(selected.getTime())) return false;

  const todayStr = getTodayDateString();
  return dateStr <= todayStr;
}

export default {
  ITEM_CATEGORIES,
  CAMPUS_LOCATIONS,
  OTHER_LOCATION_VALUE,
  TIME_PERIODS,
  CUSTODY_LOCATIONS,
  OTHER_CUSTODY_VALUE,
  CONTACT_PREFERENCES,
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  getTodayDateString,
  isValidPastOrPresentDate,
};
