/** The magnifier used in the menu bar, nav footer, object toolbar and palette. */
export function SearchIcon({ size = 11, stroke = 'currentColor' }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={stroke} strokeWidth={1.4}>
      <circle cx="7" cy="7" r="4.4" />
      <path d="M10.4 10.4L14 14" />
    </svg>
  )
}
