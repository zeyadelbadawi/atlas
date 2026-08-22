export function PageInitialLoader() {
  return (
    <div className="min-h-screen bg-[#152C24] flex items-center justify-center">
      <div className="text-center px-4">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />

        <p className="text-white/80 text-sm">Loading content...</p>
      </div>
    </div>
  );
}
