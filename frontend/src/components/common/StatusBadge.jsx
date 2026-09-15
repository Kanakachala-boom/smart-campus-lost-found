/**
 * Status pill.
 *
 * Accessibility: the label text always renders. Colour reinforces the
 * status but never carries it alone.
 */

import { TONES } from "../../utils/statusMaps";
import "./StatusBadge.css";

export function StatusBadge({ label, tone = TONES.NEUTRAL, icon: Icon = null }) {
  return (
    <span className={`badge badge--${tone}`}>
      {Icon && <Icon size={12} aria-hidden="true" />}
      {label}
    </span>
  );
}

export default StatusBadge;
