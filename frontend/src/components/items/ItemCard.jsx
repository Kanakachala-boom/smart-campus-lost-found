import { Link } from "react-router-dom";
import {
  BookOpen,
  Calendar,
  CreditCard,
  Glasses,
  Key,
  Laptop,
  MapPin,
  Package,
  Shirt,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import StatusBadge from "../common/StatusBadge";
import { ITEM_STATUS_META } from "../../utils/statusMaps";
import "./ItemCard.css";

const CATEGORY_ICONS = {
  "Electronics & Gadgets": Laptop,
  "College ID & Cards": CreditCard,
  "Wallets & Purses": Wallet,
  "Keys": Key,
  "Bags & Backpacks": ShoppingBag,
  "Books & Stationery": BookOpen,
  "Personal Accessories": Glasses,
  "Clothing & Lab Coats": Shirt,
};

function CategoryIcon({ category, size = 36, className = "" }) {
  const Icon = CATEGORY_ICONS[category] || Package;
  return <Icon size={size} aria-hidden="true" className={className} />;
}

export function ItemCard({ item }) {
  const isLost = item.type === "lost";
  const statusMeta = ITEM_STATUS_META[item.status] || { label: item.status, tone: "neutral" };

  return (
    <Link
      to={`/items/${item.type}/${item.id}`}
      className="item-card"
      aria-label={`View details for ${item.item_name}`}
    >
      {/* Visual Thumbnail */}
      <div className="item-card__media">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.item_name}
            className="item-card__image"
            loading="lazy"
          />
        ) : (
          <div className="item-card__fallback">
            <CategoryIcon category={item.category} size={36} className="item-card__fallback-icon" />
          </div>
        )}

        {/* Floating Type Pill */}
        <span
          className={`item-card__type-pill ${
            isLost ? "item-card__type-pill--lost" : "item-card__type-pill--found"
          }`}
        >
          {isLost ? "LOST" : "FOUND"}
        </span>

        {/* Status Badge */}
        <div className="item-card__status">
          <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
        </div>
      </div>

      {/* Content Body */}
      <div className="item-card__body">
        <div className="item-card__header-row">
          <span className="item-card__category">{item.category}</span>
          <span className="item-card__ref-id">#{item.id}</span>
        </div>

        <h3 className="item-card__title" title={item.item_name}>
          {item.item_name}
        </h3>

        <p className="item-card__description">
          {item.description}
        </p>

        {/* Footer Meta */}
        <div className="item-card__footer">
          <div className="item-card__meta-item" title={`Location: ${item.location}`}>
            <MapPin size={13} aria-hidden="true" className="item-card__meta-icon" />
            <span className="item-card__meta-text">{item.location}</span>
          </div>

          <div className="item-card__meta-item" title={`Date: ${item.date}`}>
            <Calendar size={13} aria-hidden="true" className="item-card__meta-icon" />
            <span className="item-card__meta-text">{item.date}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default ItemCard;
