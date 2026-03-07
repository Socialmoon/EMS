const variantMap: Record<string, string> = {
  green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700",
  yellow: "bg-yellow-100 text-yellow-700",
  blue: "bg-blue-100 text-blue-700",
  gray: "bg-gray-100 text-gray-600",
};

export default function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${className ?? "bg-gray-100 text-gray-600"}`}
    >
      {children}
    </span>
  );
}

export function statusVariant(status: string): string {
  const map: Record<string, string> = {
    active: variantMap.green, present: variantMap.green, approved: variantMap.green, finalized: variantMap.green, completed: variantMap.green,
    inactive: variantMap.gray, absent: variantMap.red, rejected: variantMap.red, terminated: variantMap.red,
    pending: variantMap.yellow, late: variantMap.yellow, draft: variantMap.yellow, "half-day": variantMap.yellow,
    "in-progress": variantMap.blue,
  };
  return map[status?.toLowerCase()] ?? variantMap.gray;
}
