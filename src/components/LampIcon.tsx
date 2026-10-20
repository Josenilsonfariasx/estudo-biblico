// Lâmpada a óleo em traço fino (mesmo desenho do ícone do app).
export function LampIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.6 4.5c.9 1.4 1.4 2.4.9 3.4-.4.8-1.6 1-2.2.3-.6-.7-.2-1.7.5-2.5.4-.4.7-.8.8-1.2Z" />
      <path d="M3.5 14c0-2 3-3 7-3 2.4 0 3.6.3 4.6.7l2.1-.3c.6-.1.9.5.5.9L16 14c-.5 2-2.6 3.4-5.5 3.4-4 0-7-1.4-7-3.4Z" />
      <path d="M3.8 13.4c-2 0-2 2.4 0 2.2" />
      <path d="M8.5 19.5h4" />
    </svg>
  );
}
