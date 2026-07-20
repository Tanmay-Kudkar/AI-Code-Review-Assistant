
/**
 * Skeleton component for rendering placeholder loading states.
 * Uses Tailwind's pulse animation.
 */
export default function Skeleton({ className, ...props }) {
  return (
    <div
      className={`animate-pulse bg-surface-800 rounded-md ${className}`}
      {...props}
    />
  );
}
