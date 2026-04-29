function Skeleton({ className = '' }) {
  return (
    <div
      className={`overflow-hidden rounded-xl bg-slate-200/80 ${className}`}
      aria-hidden="true"
    >
      <div className="h-full w-full animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200" />
    </div>
  );
}

export default Skeleton;
