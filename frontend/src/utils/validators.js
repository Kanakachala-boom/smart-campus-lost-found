/**
 * Validation helpers for The National Institute of Engineering (NIE), Mysuru.
 */

export const NIE_EMAIL_DOMAIN = "@nie.ac.in";

/**
 * Validates that an email address is properly formatted and belongs to the official
 * NIE institutional domain (@nie.ac.in).
 *
 * Examples accepted:
 * - 2024is_kanakachala_a@nie.ac.in
 * - student@nie.ac.in
 *
 * Examples rejected:
 * - student@gmail.com
 * - student@yahoo.com
 * - student@example.com
 *
 * @param {string} email
 * @returns {boolean}
 */
export function isValidNieEmail(email) {
  if (!email || typeof email !== "string") return false;
  const normalized = email.trim().toLowerCase();
  const pattern = /^[a-zA-Z0-9._%+-]+@nie\.ac\.in$/;
  return pattern.test(normalized);
}

export default {
  NIE_EMAIL_DOMAIN,
  isValidNieEmail,
};
