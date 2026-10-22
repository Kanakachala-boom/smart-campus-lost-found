/**
 * Mock Automated Matching Store for NIE Mysuru.
 *
 * NOTE: The matching algorithm and score computation belong strictly to FastAPI/backend.
 * This mock store supplies precomputed match records that mirror the backend contract.
 */

import { mockResponse, mockError } from "./mockClient";
import { mockLostItems, mockFoundItems } from "./mockItems";

export let mockMatches = [];

function enrichMatch(match) {
  const lostItem = mockLostItems.find((li) => li.id === match.lost_item_id);
  const foundItem = mockFoundItems.find((fi) => fi.id === match.found_item_id);

  return {
    ...match,
    lost_item: lostItem
      ? {
          id: lostItem.id,
          item_name: lostItem.item_name,
          category: lostItem.category,
          location: lostItem.location,
          date: lostItem.date,
          image_url: lostItem.image_url,
          status: lostItem.status,
          user_id: lostItem.user_id,
        }
      : null,
    found_item: foundItem
      ? {
          id: foundItem.id,
          item_name: foundItem.item_name,
          category: foundItem.category,
          location: foundItem.location,
          custody_location: foundItem.custody_location,
          date: foundItem.date,
          image_url: foundItem.image_url,
          status: foundItem.status,
          user_id: foundItem.user_id,
        }
      : null,
  };
}

/**
 * Returns matches involving items reported by the user.
 */
export function listMockUserMatches(userId) {
  const uid = Number(userId);
  const userMatches = mockMatches
    .map(enrichMatch)
    .filter(
      (m) =>
        m.lost_item?.user_id === uid || m.found_item?.user_id === uid,
    );

  return mockResponse(userMatches);
}

/**
 * Returns all matches (for Admin view).
 */
export function listAllMockMatches() {
  return mockResponse(mockMatches.map(enrichMatch));
}

/**
 * Returns matches for a specific item (lost or found).
 */
export function getMockItemMatches(type, itemId) {
  const id = Number(itemId);
  const isLost = String(type).toLowerCase() === "lost";

  const matches = mockMatches
    .filter((m) => (isLost ? m.lost_item_id === id : m.found_item_id === id))
    .map(enrichMatch);

  return mockResponse(matches);
}

/**
 * Updates a match status (e.g. ACCEPTED or REJECTED).
 */
export function updateMockMatchStatus(matchId, newStatus) {
  const mid = Number(matchId);
  const index = mockMatches.findIndex((m) => m.match_id === mid);
  if (index === -1) {
    return mockError("Match record not found", 404);
  }

  mockMatches[index] = {
    ...mockMatches[index],
    status: newStatus,
  };

  return mockResponse(enrichMatch(mockMatches[index]));
}
