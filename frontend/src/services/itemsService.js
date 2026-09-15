/**
 * Service module for Lost and Found item reporting.
 *
 * PROPOSED — BACKEND NOT IMPLEMENTED.
 * Communicates with FastAPI backend via multipart/form-data once live.
 * In development, uses the isolated mock layer in src/services/mock/.
 */

import api, { USE_MOCK } from "./api";
import { ENDPOINTS } from "./endpoints";
import {
  createMockFoundItem,
  createMockLostItem,
  getMockItem,
  listMockItems,
} from "./mock/mockItems";

/**
 * Builds FormData for multipart submission, handling text fields and optional file.
 */
function buildItemFormData(payload) {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    if (key === "image" && value instanceof File) {
      formData.append("image", value);
    } else if (key !== "image") {
      formData.append(key, String(value));
    }
  });

  return formData;
}

/**
 * Lists items with search, filter, and pagination support.
 *
 * Proposed endpoint: GET /api/items?type=&search=&category=&location=&status=&page=&limit=
 * (PROPOSED — BACKEND NOT IMPLEMENTED)
 *
 * @param {Object} [params]
 * @param {string} [params.type='all'] 'all' | 'lost' | 'found'
 * @param {string} [params.search='']
 * @param {string} [params.category='']
 * @param {string} [params.location='']
 * @param {string} [params.status='ACTIVE']
 * @param {number} [params.page=1]
 * @param {number} [params.limit=9]
 */
export async function listItems(params = {}) {
  if (USE_MOCK) {
    return listMockItems(params);
  }

  const endpoint =
    params.type === "lost"
      ? ENDPOINTS.LOST_ITEMS
      : params.type === "found"
      ? ENDPOINTS.FOUND_ITEMS
      : ENDPOINTS.ITEMS;

  return api.get(endpoint, { params });
}

/**
 * Retrieves details for a single item by type ('lost' | 'found') and ID.
 *
 * Proposed endpoint: GET /api/lost-items/{id} or GET /api/found-items/{id}
 * (PROPOSED — BACKEND NOT IMPLEMENTED)
 *
 * @param {string} type 'lost' | 'found'
 * @param {string|number} id
 */
export async function getItem(type, id) {
  if (USE_MOCK) {
    return getMockItem(type, id);
  }

  return api.get(ENDPOINTS.ITEM_DETAIL(type, id));
}

/**
 * Submits a new Lost Item report.
 *
 * Proposed endpoint: POST /api/lost-items (PROPOSED — BACKEND NOT IMPLEMENTED)
 *
 * @param {Object} payload
 */
export async function createLostItem(payload) {
  if (USE_MOCK) {
    return createMockLostItem(payload);
  }

  const formData = buildItemFormData(payload);
  return api.upload(ENDPOINTS.LOST_ITEMS, formData);
}

/**
 * Submits a new Found Item report.
 *
 * Proposed endpoint: POST /api/found-items (PROPOSED — BACKEND NOT IMPLEMENTED)
 *
 * @param {Object} payload
 */
export async function createFoundItem(payload) {
  if (USE_MOCK) {
    return createMockFoundItem(payload);
  }

  const formData = buildItemFormData(payload);
  return api.upload(ENDPOINTS.FOUND_ITEMS, formData);
}

export default {
  listItems,
  getItem,
  createLostItem,
  createFoundItem,
};
