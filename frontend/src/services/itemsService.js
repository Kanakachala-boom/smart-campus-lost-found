
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
    return api.get(ENDPOINTS.LOST_ITEMS, { params: filters });
  }

  if (type === "found") {
    return api.get(ENDPOINTS.FOUND_ITEMS, { params: filters });
  }

  const [lostItems, foundItems] = await Promise.all([
    api.get(ENDPOINTS.LOST_ITEMS, { params: filters }),
    api.get(ENDPOINTS.FOUND_ITEMS, { params: filters }),
  ]);

  return [
    ...lostItems.map((item) => ({ ...item, item_type: "lost" })),
    ...foundItems.map((item) => ({ ...item, item_type: "found" })),
  ];
}

export async function getItem(type, id) {
  if (USE_MOCK) {
    return getMockItem(type, id);
  }

  const endpoint =
    type === "lost"
      ? `/lost-items/${id}`
      : `/found-items/${id}`;

  return api.get(endpoint);
}

export async function createLostItem(payload) {
  if (USE_MOCK) {
    return createMockLostItem(payload);
  }

  const body = { ...payload };
  delete body.image;

  return api.post(ENDPOINTS.LOST_ITEMS, body);
}

export async function createFoundItem(payload) {
  if (USE_MOCK) {
    return createMockFoundItem(payload);
  }

  const body = { ...payload };
  delete body.image;

  return api.post(ENDPOINTS.FOUND_ITEMS, body);
}

export default {
  listItems,
  getItem,
  createLostItem,
  createFoundItem,
};
