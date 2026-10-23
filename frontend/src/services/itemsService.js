
import api, { USE_MOCK } from "./api";
import { ENDPOINTS } from "./endpoints";
import {
  createMockFoundItem,
  createMockLostItem,
  getMockItem,
  listMockItems,
} from "./mock/mockItems";

export async function listItems(params = {}) {
  if (USE_MOCK) {
    return listMockItems(params);
  }

  const { type = "all", ...filters } = params;

  if (type === "lost") {
    const res = await api.get(ENDPOINTS.LOST_ITEMS, { params: filters });
    return res && Array.isArray(res.items) ? res : { items: Array.isArray(res) ? res : [], total: res?.total || 0, total_pages: res?.total_pages || 1 };
  }

  if (type === "found") {
    const res = await api.get(ENDPOINTS.FOUND_ITEMS, { params: filters });
    return res && Array.isArray(res.items) ? res : { items: Array.isArray(res) ? res : [], total: res?.total || 0, total_pages: res?.total_pages || 1 };
  }

  const [lostRes, foundRes] = await Promise.all([
    api.get(ENDPOINTS.LOST_ITEMS, { params: filters }),
    api.get(ENDPOINTS.FOUND_ITEMS, { params: filters }),
  ]);

  const lostList = Array.isArray(lostRes?.items) ? lostRes.items : (Array.isArray(lostRes) ? lostRes : []);
  const foundList = Array.isArray(foundRes?.items) ? foundRes.items : (Array.isArray(foundRes) ? foundRes : []);

  const combined = [
    ...lostList.map((item) => ({ ...item, item_type: "lost" })),
    ...foundList.map((item) => ({ ...item, item_type: "found" })),
  ];

  return {
    items: combined,
    total: (lostRes?.total || lostList.length) + (foundRes?.total || foundList.length),
    total_pages: Math.max(lostRes?.total_pages || 1, foundRes?.total_pages || 1),
  };
}

export async function getItem(type, id) {
  if (USE_MOCK) {
    return getMockItem(type, id);
  }

  const endpoint = ENDPOINTS.ITEM_DETAIL(type, id);

  return api.get(endpoint);
}

export async function createLostItem(payload) {
  if (USE_MOCK) {
    return createMockLostItem(payload);
  }

  if (payload instanceof FormData) {
    return api.upload(ENDPOINTS.LOST_ITEMS, payload);
  }

  if (payload.image instanceof File) {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        formData.append(key, value);
      }
    });
    return api.upload(ENDPOINTS.LOST_ITEMS, formData);
  }

  const body = { ...payload };
  delete body.image;

  return api.post(ENDPOINTS.LOST_ITEMS, body);
}

export async function createFoundItem(payload) {
  if (USE_MOCK) {
    return createMockFoundItem(payload);
  }

  if (payload instanceof FormData) {
    return api.upload(ENDPOINTS.FOUND_ITEMS, payload);
  }

  if (payload.image instanceof File) {
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        formData.append(key, value);
      }
    });
    return api.upload(ENDPOINTS.FOUND_ITEMS, formData);
  }

  const body = { ...payload };
  delete body.image;

  return api.post(ENDPOINTS.FOUND_ITEMS, body);
}

/**
 * Updates an item's details (owner or admin).
 *
 * @param {string} type 'lost' | 'found'
 * @param {string|number} id
 * @param {Object} data
 */
export async function updateItem(type, id, data) {
  if (USE_MOCK) {
    return { ...data, id };
  }
  return api.put(ENDPOINTS.ITEM_DETAIL(type, id), data);
}

/**
 * Updates an item's status (owner or admin).
 *
 * @param {string} type 'lost' | 'found'
 * @param {string|number} id
 * @param {string} status
 */
export async function updateItemStatus(type, id, status) {
  if (USE_MOCK) {
    return { status, id };
  }
  return api.patch(ENDPOINTS.ITEM_STATUS(type, id), { status });
}

/**
 * Deletes or archives an item (owner or admin).
 *
 * @param {string} type 'lost' | 'found'
 * @param {string|number} id
 */
export async function deleteItem(type, id) {
  if (USE_MOCK) {
    return { success: true };
  }
  return api.delete(ENDPOINTS.ITEM_DETAIL(type, id));
}

export default {
  listItems,
  getItem,
  createLostItem,
  createFoundItem,
  updateItem,
  updateItemStatus,
  deleteItem,
};
