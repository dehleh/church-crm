import clsx from 'clsx';

export default function FormField({ label, error, required: isRequired, children, className }) {
  return (
    <div className={className}>
      {label && (
        <label className="label">
          {label} {isRequired && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
