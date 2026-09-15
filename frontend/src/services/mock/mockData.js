/**
 * Placeholder fixture data. NOT REAL DATA.
 *
 * Field names mirror the authoritative database schema (users, role,
 * created_at, etc.) so that switching a service from mock data to a real
 * endpoint later requires no changes to any component.
 *
 * Passwords are never stored here.
 */

export const mockUsers = [
  {
    user_id: 1,
    name: "Ananya Rao",
    email: "ananya.rao@example.edu",
    phone: "9876543210",
    role: "STUDENT",
    is_active: true,
    created_at: "2026-08-02 09:14:00",
  },
];

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

/**
 * Adds a new mock user registered during the mock session.
 */
export function addMockUser({ name, email, phone, role = "STUDENT" }) {
  const normalizedEmail = email.trim().toLowerCase();
  const nextId = mockUsers.length > 0 ? Math.max(...mockUsers.map((u) => u.user_id)) + 1 : 1;
  const newUser = {
    user_id: nextId,
    name: name.trim(),
    email: normalizedEmail,
    phone: phone ? phone.trim() : null,
    role,
    is_active: true,
    created_at: new Date().toISOString(),
  };
  mockUsers.push(newUser);
  return newUser;
}

export default {
  mockUsers,
  findMockUserByEmail,
  findMockUserById,
  addMockUser,
};
