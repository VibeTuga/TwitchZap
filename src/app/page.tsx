export default function LiveViewPage() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary-dim/20 flex items-center justify-center mx-auto">
          <span
            className="material-symbols-outlined text-primary-dim text-3xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            sensors
          </span>
        </div>
        <h2 className="text-2xl font-headline font-bold text-on-surface">
          Live View coming soon
        </h2>
        <p className="text-on-surface-variant">
          The stream player and voting interface will appear here.
        </p>
      </div>
    </div>
  );
}
