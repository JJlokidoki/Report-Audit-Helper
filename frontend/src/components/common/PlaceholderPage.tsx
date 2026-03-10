export default function PlaceholderPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-base-content/50">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
      </svg>
      <p className="text-xl font-semibold">Раздел в разработке</p>
    </div>
  );
}
