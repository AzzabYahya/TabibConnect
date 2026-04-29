import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

function Input({
  id,
  label,
  error,
  helperText,
  suggestions = [],
  type = 'text',
  className = '',
  containerClassName = '',
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPasswordField = type === 'password';
  const inputType = isPasswordField && showPassword ? 'text' : type;
  const suggestionId = suggestions.length ? `${id}-suggestions` : undefined;

  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label ? (
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          id={id}
          type={inputType}
          list={suggestionId}
          className={`w-full rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2.5 text-sm text-slate-800 shadow-sm transition-all duration-200 placeholder:text-slate-400 focus:border-med-primary focus:outline-none focus:ring-2 focus:ring-med-primary/30 ${
            isPasswordField ? 'pr-11' : ''
          } ${className}`}
          {...props}
        />
        {isPasswordField ? (
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-slate-500 transition hover:text-med-primary"
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        ) : null}
      </div>
      {suggestions.length ? (
        <datalist id={suggestionId}>
          {suggestions.map((suggestion) => (
            <option key={`${id}-${suggestion}`} value={suggestion} />
          ))}
        </datalist>
      ) : null}
      {helperText ? <p className="text-xs text-slate-500">{helperText}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export default Input;
