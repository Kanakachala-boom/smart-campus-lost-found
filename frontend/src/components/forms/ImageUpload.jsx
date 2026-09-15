import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Image as ImageIcon, Trash2, UploadCloud, AlertCircle } from "lucide-react";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_BYTES,
} from "../../utils/itemOptions";
import "./ImageUpload.css";

/**
 * Single-image upload primitive with drag-and-drop, format & size validation,
 * thumbnail preview, and memory-safe object URL management.
 */
export function ImageUpload({
  id = "item-image",
  label = "Item Photo",
  hint = "PNG, JPG, JPEG, or WEBP up to 5 MB. Exactly one image.",
  value = null, // File object or null
  onChange,
  className = "",
}) {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  // Derive preview URL and clean up object URLs when value changes or component unmounts
  const previewUrl = useMemo(() => {
    if (!value) return null;
    if (typeof value === "string") return value;
    if (value instanceof File) {
      return URL.createObjectURL(value);
    }
    return null;
  }, [value]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const validateAndSelectFile = (file) => {
    setError(null);
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
      setError("Please upload an image in JPG, PNG, or WEBP format.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setError(`Image size (${sizeMB} MB) exceeds the maximum allowed limit of 5 MB.`);
      return;
    }

    onChange?.(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSelectFile(e.target.files[0]);
    }
  };

  const handleRemove = () => {
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onChange?.(null);
  };

  const handleTriggerBrowse = () => {
    inputRef.current?.click();
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`image-upload ${className}`.trim()}>
      <div className="image-upload__header">
        <label htmlFor={id} className="image-upload__label">
          <Camera size={15} aria-hidden="true" className="image-upload__icon" />
          <span>{label}</span>
          <span className="image-upload__optional">(Optional)</span>
        </label>
      </div>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        onChange={handleChange}
        className="sr-only"
        aria-describedby={`${id}-hint`}
      />

      {!previewUrl ? (
        <div
          className={`image-upload__dropzone ${
            dragActive ? "image-upload__dropzone--active" : ""
          } ${error ? "image-upload__dropzone--error" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={handleTriggerBrowse}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleTriggerBrowse();
            }
          }}
          aria-label="Upload item photograph"
        >
          <div className="image-upload__dropzone-content">
            <div className="image-upload__emblem">
              <UploadCloud size={24} aria-hidden="true" />
            </div>
            <div className="image-upload__text-group">
              <p className="image-upload__primary-text">
                <span className="image-upload__action-link">Click to browse</span> or drag and drop image here
              </p>
              <p id={`${id}-hint`} className="image-upload__hint">
                {hint}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="image-upload__preview-card">
          <div className="image-upload__thumbnail-wrapper">
            <img
              src={previewUrl}
              alt="Item preview"
              className="image-upload__thumbnail"
            />
          </div>
          <div className="image-upload__details">
            <div className="image-upload__meta">
              <ImageIcon size={16} aria-hidden="true" className="image-upload__file-icon" />
              <div className="image-upload__file-info">
                <span className="image-upload__file-name">
                  {value instanceof File ? value.name : "Uploaded image"}
                </span>
                {value instanceof File && (
                  <span className="image-upload__file-size">
                    {formatFileSize(value.size)}
                  </span>
                )}
              </div>
            </div>
            <div className="image-upload__actions">
              <button
                type="button"
                onClick={handleTriggerBrowse}
                className="image-upload__btn image-upload__btn--replace"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="image-upload__btn image-upload__btn--remove"
                aria-label="Remove selected image"
              >
                <Trash2 size={14} aria-hidden="true" />
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="image-upload__error" role="alert">
          <AlertCircle size={14} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export default ImageUpload;
