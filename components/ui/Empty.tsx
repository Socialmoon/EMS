export default function Empty({ message = "No records found." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <svg className="h-12 w-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 17v-2a4 4 0 014-4h0a4 4 0 014 4v2M9 11a4 4 0 110-8 4 4 0 010 8z" />
      </svg>
      <p className="text-sm">{message}</p>
    </div>
  );
}
