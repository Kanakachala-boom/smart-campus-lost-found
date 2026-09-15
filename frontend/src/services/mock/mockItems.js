/**
 * In-memory mock repository for Lost and Found items.
 *
 * All mock data is strictly isolated in this file.
 * Simulates network latency and response payloads without fake cryptography.
 */

import { ApiError } from "../api";
import { mockResponse } from "./mockClient";

let lostIdCounter = 101;
let foundIdCounter = 201;

export const mockLostItems = [
  {
    lost_item_id: 1,
    user_id: 1,
    notify_on_match: true,
    item_name: "Black Wildhorn Leather Wallet",
    category: "Wallets & Purses",
    location_lost: "Campus Canteen",
    specific_location: "Near juice counter seating",
    date_lost: "2026-09-12",
    time_lost: "Afternoon (12:00 PM – 4:00 PM)",
    description: "Black Wildhorn bifold wallet with contrast stitching, containing bus pass and student cards.",
    identifying_marks: "Student ID card ending in 2024 and silver zipper inside coin compartment.",
    image_url: null,
    status: "ACTIVE",
    created_at: "2026-09-12T14:30:00Z",
  },
  {
    lost_item_id: 2,
    user_id: 1,
    notify_on_match: true,
    item_name: "Dell 65W USB-C Laptop Charger",
    category: "Electronics & Gadgets",
    location_lost: "Central Library",
    specific_location: "1st Floor digital reference room, desk #4",
    date_lost: "2026-09-13",
    time_lost: "Morning (9:00 AM – 12:00 PM)",
    description: "Black cylindrical Dell USB-C laptop charger with Velcro cable tie.",
    identifying_marks: "Small red tape wrapped around adapter pin end.",
    image_url: null,
    status: "ACTIVE",
    created_at: "2026-09-13T11:15:00Z",
  },
  {
    lost_item_id: 3,
    user_id: 2,
    notify_on_match: true,
    item_name: "Hero Splendor Bike Key",
    category: "Keys",
    location_lost: "Campus Parking Area",
    specific_location: "Two-wheeler shed near Mechanical Block",
    date_lost: "2026-09-14",
    time_lost: "Morning (9:00 AM – 12:00 PM)",
    description: "Single Hero ignition key with blue rubber keychain and small brass ring.",
    identifying_marks: "Slight bend near the key tip and number 42 stamped.",
    image_url: null,
    status: "ACTIVE",
    created_at: "2026-09-14T09:40:00Z",
  },
  {
    lost_item_id: 4,
    user_id: 1,
    notify_on_match: true,
    item_name: "NIE Student Identity Card",
    category: "College ID & Cards",
    location_lost: "Diamond Jubilee Sports Complex",
    specific_location: "Badminton court spectator benches",
    date_lost: "2026-09-14",
    time_lost: "Evening (4:00 PM – 7:00 PM)",
    description: "Laminated official NIE Mysuru smart ID card in blue institutional lanyard.",
    identifying_marks: "Roll number ending in 045, ISE Department.",
    image_url: null,
    status: "ACTIVE",
    created_at: "2026-09-14T18:20:00Z",
  },
  {
    lost_item_id: 5,
    user_id: 1,
    notify_on_match: true,
    item_name: "Fastrack Classic Sunglasses",
    category: "Personal Accessories",
    location_lost: "Main Auditorium",
    specific_location: "Row F, center seat",
    date_lost: "2026-09-10",
    time_lost: "Afternoon (12:00 PM – 4:00 PM)",
    description: "Matte black aviator sunglasses in a black zippered hard case.",
    identifying_marks: "Initials KA lightly scratched inside left temple arm.",
    image_url: null,
    status: "POTENTIAL_MATCH",
    created_at: "2026-09-10T15:00:00Z",
  },
  {
    lost_item_id: 6,
    user_id: 1,
    notify_on_match: false,
    item_name: "Machine Drawing Record Book",
    category: "Books & Stationery",
    location_lost: "Mechanical Engineering Block",
    specific_location: "CAD/CAM Lab 1",
    date_lost: "2026-09-08",
    time_lost: "Morning (9:00 AM – 12:00 PM)",
    description: "A3 spiral-bound engineering drawing sheets with brown craft paper cover.",
    identifying_marks: "Signatures from Lab Instructor on Sheet 3 and 4.",
    image_url: null,
    status: "RETURNED",
    created_at: "2026-09-08T10:00:00Z",
  },
];

export const mockFoundItems = [
  {
    found_item_id: 1,
    user_id: 2,
    notify_on_match: true,
    item_name: "Casio Scientific Calculator fx-991EX",
    category: "Electronics & Gadgets",
    location_found: "Central Library",
    specific_location: "2nd Floor study table #14",
    date_found: "2026-09-13",
    time_found: "Morning (9:00 AM – 12:00 PM)",
    description: "Casio fx-991EX Classwiz scientific calculator in black slide cover. Excellent working condition.",
    custody_location: "Central Library Enquiry Counter",
    contact_preference: "In-App Direct Chat",
    image_url: null,
    status: "AVAILABLE",
    created_at: "2026-09-13T10:45:00Z",
  },
  {
    found_item_id: 2,
    user_id: 1,
    notify_on_match: true,
    item_name: "Blue Milton Stainless Steel Water Bottle",
    category: "Personal Accessories",
    location_found: "Campus Canteen",
    specific_location: "Left corner dining table",
    date_found: "2026-09-14",
    time_found: "Afternoon (12:00 PM – 4:00 PM)",
    description: "750ml insulated dark blue bottle with metallic cap and loop handle.",
    custody_location: "Finder's Possession (Available for direct handover)",
    contact_preference: "In-App Direct Chat",
    image_url: null,
    status: "AVAILABLE",
    created_at: "2026-09-14T13:30:00Z",
  },
  {
    found_item_id: 3,
    user_id: 2,
    notify_on_match: true,
    item_name: "Boat Rockerz 255 Wireless Earphones",
    category: "Electronics & Gadgets",
    location_found: "ECE/ISE Block",
    specific_location: "3rd Floor corridor near Seminar Hall",
    date_found: "2026-09-14",
    time_found: "Morning (9:00 AM – 12:00 PM)",
    description: "Teal and black neckband style Bluetooth earphones, clean condition.",
    custody_location: "Department Office",
    contact_preference: "Coordinate Handover via Campus Security / Admin",
    image_url: null,
    status: "AVAILABLE",
    created_at: "2026-09-14T11:00:00Z",
  },
  {
    found_item_id: 4,
    user_id: 2,
    notify_on_match: true,
    item_name: "Godrej Brass Keys on Metal Ring",
    category: "Keys",
    location_found: "Main Gate & Security Post",
    specific_location: "Found on the pathway near security boom barrier",
    date_found: "2026-09-15",
    time_found: "Early Morning (6:00 AM – 9:00 AM)",
    description: "Three brass cabinet keys on a circular stainless steel keyring.",
    custody_location: "Campus Security Desk — Main Gate",
    contact_preference: "Coordinate Handover via Campus Security / Admin",
    image_url: null,
    status: "AVAILABLE",
    created_at: "2026-09-15T08:15:00Z",
  },
  {
    found_item_id: 5,
    user_id: 1,
    notify_on_match: true,
    item_name: "Black Skybags Campus Backpack",
    category: "Bags & Backpacks",
    location_found: "Civil & Electrical Block",
    specific_location: "Classroom 204 second bench",
    date_found: "2026-09-11",
    time_found: "Evening (4:00 PM – 7:00 PM)",
    description: "3-compartment black water-resistant college backpack with orange accents.",
    custody_location: "Staff Room / Faculty In-Charge",
    contact_preference: "Coordinate Handover via Campus Security / Admin",
    image_url: null,
    status: "POTENTIAL_MATCH",
    created_at: "2026-09-11T17:45:00Z",
  },
  {
    found_item_id: 6,
    user_id: 2,
    notify_on_match: false,
    item_name: "White Chemistry Laboratory Coat",
    category: "Clothing & Lab Coats",
    location_found: "Admin Block",
    specific_location: "Staircase landing leading to 1st Floor",
    date_found: "2026-09-09",
    time_found: "Afternoon (12:00 PM – 4:00 PM)",
    description: "Cotton full-sleeve white lab apron with plastic buttons, size M.",
    custody_location: "Central Library Enquiry Counter",
    contact_preference: "Coordinate Handover via Campus Security / Admin",
    image_url: null,
    status: "RETURNED",
    created_at: "2026-09-09T14:10:00Z",
  },
];

/**
 * Strips confidential identifying marks and returns safe public item representation.
 */
function sanitizeItemForPublic(item, type) {
  const safe = {
    id: type === "lost" ? item.lost_item_id : item.found_item_id,
    type, // 'lost' | 'found'
    item_name: item.item_name,
    category: item.category,
    description: item.description,
    location: type === "lost" ? item.location_lost : item.location_found,
    specific_location: item.specific_location || null,
    date: type === "lost" ? item.date_lost : item.date_found,
    time: type === "lost" ? item.time_lost : item.time_found,
    image_url: item.image_url || null,
    status: item.status,
    created_at: item.created_at,
  };

  if (type === "found") {
    safe.custody_location = item.custody_location;
    safe.contact_preference = item.contact_preference;
  }

  // NOTE: identifying_marks, user_id, and personal data are strictly excluded
  return safe;
}

/**
 * Simulates listing items with search, filter, and pagination.
 */
export async function listMockItems({
  type = "all", // 'all' | 'lost' | 'found'
  search = "",
  category = "",
  location = "",
  status = "ACTIVE", // 'ACTIVE' | 'ALL' | specific status
  page = 1,
  limit = 9,
} = {}) {
  let combined = [];

  if (type === "all" || type === "lost") {
    const lostList = mockLostItems.map((item) => sanitizeItemForPublic(item, "lost"));
    combined = combined.concat(lostList);
  }

  if (type === "all" || type === "found") {
    const foundList = mockFoundItems.map((item) => sanitizeItemForPublic(item, "found"));
    combined = combined.concat(foundList);
  }

  // Sort descending by date/created_at
  combined.sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));

  // Apply search query across item_name and description
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    combined = combined.filter(
      (item) =>
        item.item_name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        (item.specific_location && item.specific_location.toLowerCase().includes(q)),
    );
  }

  // Apply category filter
  if (category && category !== "ALL") {
    combined = combined.filter((item) => item.category === category);
  }

  // Apply campus location filter
  if (location && location !== "ALL") {
    combined = combined.filter((item) => item.location === location);
  }

  // Apply status filter ('ACTIVE' by default; 'ALL' shows everything)
  if (status && status !== "ALL") {
    if (status === "ACTIVE") {
      combined = combined.filter((item) => item.status === "ACTIVE" || item.status === "AVAILABLE");
    } else {
      combined = combined.filter((item) => item.status === status);
    }
  }

  const total = combined.length;
  const total_pages = Math.ceil(total / limit) || 1;
  const currentPage = Math.max(1, Math.min(Number(page) || 1, total_pages));
  const startIndex = (currentPage - 1) * limit;
  const paginatedItems = combined.slice(startIndex, startIndex + limit);

  return mockResponse(
    {
      items: paginatedItems,
      total,
      page: currentPage,
      total_pages,
      limit,
    },
    250,
  );
}

/**
 * Simulates retrieving a single item's details by type and ID.
 */
export async function getMockItem(type, id) {
  const numericId = Number(id);
  const normalizedType = String(type).toLowerCase();

  let foundRaw = null;
  if (normalizedType === "lost") {
    foundRaw = mockLostItems.find((i) => i.lost_item_id === numericId);
  } else if (normalizedType === "found") {
    foundRaw = mockFoundItems.find((i) => i.found_item_id === numericId);
  }

  if (!foundRaw) {
    throw new ApiError(`The requested ${normalizedType} item (#${id}) could not be found.`, {
      status: 404,
    });
  }

  const safeDetail = sanitizeItemForPublic(foundRaw, normalizedType);
  return mockResponse(safeDetail, 200);
}

/**
 * Simulates creating a new lost item report.
 */
export async function createMockLostItem(payload, userId = 1) {
  const newItem = {
    lost_item_id: lostIdCounter++,
    user_id: Number(userId),
    notify_on_match: payload.notify_on_match ?? true,
    item_name: payload.item_name,
    category: payload.category,
    location_lost: payload.location_lost,
    specific_location: payload.specific_location || null,
    date_lost: payload.date_lost,
    time_lost: payload.time_lost || null,
    description: payload.description,
    identifying_marks: payload.identifying_marks || null,
    image_url: payload.image instanceof File ? URL.createObjectURL(payload.image) : null,
    status: "ACTIVE",
    created_at: new Date().toISOString(),
  };

  mockLostItems.unshift(newItem);
  return mockResponse(newItem, 200);
}

/**
 * Simulates creating a new found item report.
 */
export async function createMockFoundItem(payload, userId = 1) {
  const newItem = {
    found_item_id: foundIdCounter++,
    user_id: Number(userId),
    notify_on_match: payload.notify_on_match ?? true,
    item_name: payload.item_name,
    category: payload.category,
    location_found: payload.location_found,
    specific_location: payload.specific_location || null,
    date_found: payload.date_found,
    time_found: payload.time_found || null,
    description: payload.description,
    custody_location: payload.custody_location,
    contact_preference: payload.contact_preference || "In-App Direct Chat",
    image_url: payload.image instanceof File ? URL.createObjectURL(payload.image) : null,
    status: "AVAILABLE",
    created_at: new Date().toISOString(),
  };

  mockFoundItems.unshift(newItem);
  return mockResponse(newItem, 200);
}

/**
 * Returns all reports created by a specific user.
 */
export async function listMockUserReports(userId) {
  const uid = Number(userId);

  const userLost = mockLostItems
    .filter((i) => i.user_id === uid)
    .map((item) => ({
      id: item.lost_item_id,
      type: "lost",
      item_name: item.item_name,
      category: item.category,
      description: item.description,
      location: item.location_lost,
      specific_location: item.specific_location,
      date: item.date_lost,
      time: item.time_lost,
      image_url: item.image_url,
      status: item.status,
      created_at: item.created_at,
      notify_on_match: item.notify_on_match,
      // Identifying marks are accessible to the reporting owner
      identifying_marks: item.identifying_marks,
    }));

  const userFound = mockFoundItems
    .filter((i) => i.user_id === uid)
    .map((item) => ({
      id: item.found_item_id,
      type: "found",
      item_name: item.item_name,
      category: item.category,
      description: item.description,
      location: item.location_found,
      specific_location: item.specific_location,
      date: item.date_found,
      time: item.time_found,
      custody_location: item.custody_location,
      contact_preference: item.contact_preference,
      image_url: item.image_url,
      status: item.status,
      created_at: item.created_at,
      notify_on_match: item.notify_on_match,
    }));

  const allReports = [...userLost, ...userFound].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );

  return mockResponse(allReports, 200);
}

/**
 * Returns all items for Admin view.
 */
export async function adminListAllMockItems() {
  const lost = mockLostItems.map((item) => ({
    id: item.lost_item_id,
    type: "lost",
    item_name: item.item_name,
    category: item.category,
    description: item.description,
    location: item.location_lost,
    date: item.date_lost,
    status: item.status,
    created_at: item.created_at,
    user_id: item.user_id,
  }));

  const found = mockFoundItems.map((item) => ({
    id: item.found_item_id,
    type: "found",
    item_name: item.item_name,
    category: item.category,
    description: item.description,
    location: item.location_found,
    custody_location: item.custody_location,
    date: item.date_found,
    status: item.status,
    created_at: item.created_at,
    user_id: item.user_id,
  }));

  return mockResponse([...lost, ...found], 200);
}

/**
 * Admin action: update status of an item.
 */
export async function updateMockItemStatus(type, id, newStatus) {
  const numericId = Number(id);
  const isLost = String(type).toLowerCase() === "lost";

  if (isLost) {
    const item = mockLostItems.find((i) => i.lost_item_id === numericId);
    if (!item) throw new ApiError("Lost item not found", { status: 404 });
    item.status = newStatus;
    return mockResponse(sanitizeItemForPublic(item, "lost"), 200);
  } else {
    const item = mockFoundItems.find((i) => i.found_item_id === numericId);
    if (!item) throw new ApiError("Found item not found", { status: 404 });
    item.status = newStatus;
    return mockResponse(sanitizeItemForPublic(item, "found"), 200);
  }
}

export default {
  mockLostItems,
  mockFoundItems,
  listMockItems,
  getMockItem,
  createMockLostItem,
  createMockFoundItem,
  listMockUserReports,
  adminListAllMockItems,
  updateMockItemStatus,
};
