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

export const mockLostItems = [];

export const mockFoundItems = [];

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
