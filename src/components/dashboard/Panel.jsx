// White card with the dark-green header bar used across the dashboard.
export default function Panel({ icon: Icon, title, right, children, className = '', bodyClassName = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-line shadow-card overflow-hidden flex flex-col ${className}`}>
      <div className="flex items-center gap-2.5 px-4 h-11 shrink-0 bg-forest-dark text-white">
        {Icon && <Icon size={16} strokeWidth={2} className="opacity-90" />}
        <h3 className="font-serif text-[15.5px] font-semibold tracking-[0.005em]">{title}</h3>
        {right && <div className="ml-auto flex items-center">{right}</div>}
      </div>
      <div className={`flex-1 min-h-0 ${bodyClassName}`}>{children}</div>
    </div>
  );
}

export function HeaderButton({ icon: Icon, children, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="inline-flex items-center gap-1.5 rounded-md border border-white/25 bg-white/10 px-2.5 py-1 text-[12px] font-medium text-white hover:bg-white/20 transition-colors"
    >
      {Icon && <Icon size={13} />} {children}
    </button>
  );
}
