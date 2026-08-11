import './PillButton.css';

/**
 * Every action in the product is a pill, and every pill clears 44px.
 * teal = the ordinary affirmative · amber = time and filing · coral = breach
 * outline = the quiet alternative · danger = Strike, which asks twice.
 */
export default function PillButton({
  children,
  variant = 'teal',
  size = 'md',
  grow = 1,
  onClick,
  disabled = false,
  type = 'button',
  className = '',
  style,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`pill pill--${variant} pill--${size} ${className}`}
      style={{ flex: grow, ...style }}
    >
      {children}
    </button>
  );
}
