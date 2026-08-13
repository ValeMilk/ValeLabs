/**
 * Utility function to merge classNames conditionally
 * Similar to clsx or classnames library
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes
    .filter((c) => typeof c === 'string' && c.length > 0)
    .join(' ');
}
