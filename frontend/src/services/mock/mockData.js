/**
 * Placeholder fixture data for The National Institute of Engineering (NIE), Mysuru.
 *
 * All mock accounts strictly use official @nie.ac.in institutional emails.
 * Passwords are never stored here.
 */

export const mockUsers = [
  {
    user_id: 1,
    name: "Kanakachala A",
    email: "2024is_kanakachala_a@nie.ac.in",
    phone: "9876543210",
    role: "STUDENT",
    is_active: true,
    created_at: "2026-08-01 09:00:00",
  },
  {
    user_id: 2,
    name: "Ananya Rao",
    email: "2024is_ananya_r@nie.ac.in",
    phone: "9876543211",
    role: "STUDENT",
    is_active: true,
    created_at: "2026-08-02 09:14:00",
  },
  {
    user_id: 3,
    name: "Prof. S. N. Murthy (Admin)",
    email: "admin@nie.ac.in",
    phone: "9876543212",
    role: "ADMIN",
    is_active: true,
    created_at: "2026-08-01 08:30:00",
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

export default {
  mockUsers,
  findMockUserByEmail,
  findMockUserById,
};
