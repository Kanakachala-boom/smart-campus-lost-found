/**
 * Placeholder fixture data for The National Institute of Engineering (NIE), Mysuru.
 *
 * All mock accounts strictly use official @nie.ac.in institutional emails.
 * Passwords are never stored here.
 */

export const mockUsers = [];

/**
 * Finds a mock user by email (case-insensitive).
 */
export function findMockUserByEmail(email) {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return mockUsers.find((u) => u.email.toLowerCase() === normalized) ?? null;
}

/**
 * Finds a mock user by user_id.
 */
export function findMockUserById(id) {
  const numericId = Number(id);
  return mockUsers.find((u) => u.user_id === numericId) ?? null;
}

export default {
  mockUsers,
  findMockUserByEmail,
  findMockUserById,
};
