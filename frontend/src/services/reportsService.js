/**
 * Service for managing user-reported lost and found items (My Reports).
 *
 * PROPOSED FASTAPI INTEGRATION:
 * - GET /api/users/me/reports
 */

import api, { USE_MOCK } from "./api";
import ENDPOINTS from "./endpoints";
import { listMockUserReports } from "./mock/mockItems";

export async function getMyReports(userId) {
  if (USE_MOCK) {
    return listMockUserReports(userId || 1);
  }

  return api.get(ENDPOINTS.MY_REPORTS);
}

export default {
  getMyReports,
};
