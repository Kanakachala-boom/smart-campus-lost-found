import "./FormField.css";

/**
 * Accessible form field wrapper providing consistent labels, required indicators,
 * contextual hints, character counters, and inline error states.
 */
export function FormField({
  id,
  label,
  required = false,
  optional = false,
  hint = null,
  error = null,
  characterCount = null,
  className = "",
  children,
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={`form-field ${error ? "form-field--error" : ""} ${className}`.trim()}>
      <div className="form-field__label-row">
        <label htmlFor={id} className="form-field__label">
          {label}
          {required && (
            <span className="form-field__required" aria-hidden="true">
              *
            </span>
          )}
          {optional && <span className="form-field__optional">(Optional)</span>}
        </label>
        {characterCount && (
          <span
            className={`form-field__counter ${
              characterCount.current > characterCount.max
                ? "form-field__counter--exceeded"
                : ""
            }`}
            aria-live="polite"
          >
            {characterCount.current}/{characterCount.max}
          </span>
        )}
      </div>

      <div className="form-field__control">{children}</div>

      {hint && !error && (
        <p id={hintId} className="form-field__hint">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} className="form-field__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default FormField;
