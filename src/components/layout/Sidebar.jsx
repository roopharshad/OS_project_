import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, PlayCircle, Activity, Workflow, BookOpen, FileCode2, BarChart3, Menu, X,
} from 'lucide-react';
import { Sprig, Building } from '../dashboard/Decor';

// Leaves behind the sidebar content (top corner and bottom corner).
function SidebarDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden="true">
      <Sprig flip className="absolute -top-2 -right-4 w-28 opacity-45" />
      <Sprig className="absolute bottom-24 -left-6 w-24 opacity-35 rotate-[200deg]" />
    </div>
  );
}

export const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'simulation', label: 'Live Simulation', icon: PlayCircle },
  { id: 'semaphore', label: 'Semaphore Monitor', icon: Activity },
  { id: 'algorithm', label: 'Algorithm', icon: Workflow },
  { id: 'concepts', label: 'Concepts & Learning', icon: BookOpen },
  { id: 'source', label: 'Source Code', icon: FileCode2 },
  { id: 'statistics', label: 'Statistics & Results', icon: BarChart3 },
];

function Brand({ compact = false }) {
  return (
    <div className={`relative z-10 pl-6 pt-7 pb-6 ${compact ? 'pr-14' : 'pr-6'}`}>
      <div className="flex items-center gap-3">
        <svg width="36" height="36" viewBox="0 0 32 32" aria-hidden="true">
          <rect width="32" height="32" rx="9" fill="#315C46" />
          <circle cx="16" cy="16" r="7.5" fill="none" stroke="#F7F6F1" strokeWidth="1.8" />
          <g fill="#F7F6F1">
            <circle cx="16" cy="5.6" r="1.9" /><circle cx="25.9" cy="12.8" r="1.9" /><circle cx="22.1" cy="24.4" r="1.9" />
            <circle cx="9.9" cy="24.4" r="1.9" /><circle cx="6.1" cy="12.8" r="1.9" />
          </g>
        </svg>
        <div className="leading-tight">
          <div className="font-serif text-[17px] text-charcoal">Dining Philosophers</div>
          <div className="text-[11px] text-charcoal/50 mt-0.5">Synchronization Simulator</div>
        </div>
      </div>
    </div>
  );
}

function NavList({ active, onNavigate }) {
  return (
    <nav className="relative z-10 flex-1 px-3 overflow-y-auto" aria-label="Sections">
      <div className="eyebrow px-3 mb-2">Contents</div>
      <ul className="space-y-0.5">
        {NAV.map(({ id, label, icon: Icon }, idx) => {
          const isActive = active === id;
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                onClick={(e) => { e.preventDefault(); onNavigate(id); }}
                aria-current={isActive ? 'true' : undefined}
                className={`relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-xl text-sm transition-colors duration-150 ${
                  isActive ? 'bg-eating/60 text-forest font-medium' : 'text-charcoal/70 hover:bg-ivory hover:text-charcoal'}`}
              >
                {isActive && (
                  <motion.span layoutId="nav-indicator" className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-forest"
                    transition={{ type: 'spring', stiffness: 400, damping: 34 }} />
                )}
                <Icon size={17} strokeWidth={1.8} className={isActive ? 'text-forest' : 'text-charcoal/45'} />
                <span className="flex-1">{label}</span>
                <span className={`text-[10px] tabular-nums ${isActive ? 'text-forest/70' : 'text-charcoal/25'}`}>0{idx + 1}</span>
              </a>
            </li>
          );
        })}
      </ul>

      {/* University logo, directly under the last navigation item */}
      <div className="mt-5 mb-4 mx-1 rounded-xl border border-border bg-white px-4 py-3 flex items-center justify-center">
        <img
          src="/SRMAP-Logo.png"
          alt="SRM University AP, Andhra Pradesh"
          width={5368}
          height={1925}
          decoding="async"
          className="block w-full max-w-[200px] h-auto object-contain select-none"
          draggable={false}
        />
      </div>
    </nav>
  );
}

function Footer({ running }) {
  return (
    <div className="relative z-10 px-6 pt-3 pb-5 border-t border-border">
      <Building className="w-full h-16 mb-2 opacity-75" />
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${running ? 'bg-forest animate-pulse' : 'bg-olive'}`} />
        <span className="text-[11px] text-charcoal/50">{running ? 'Simulation running' : 'Simulation idle'}</span>
      </div>
      <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-olive">Operating Systems Laboratory</p>
    </div>
  );
}

export default function Sidebar({ active, onNavigate, running }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const go = (id) => { onNavigate(id); setOpen(false); };

  return (
    <>
      {/* Desktop: permanent sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-[264px] flex-col bg-white border-r border-border z-30">
        <SidebarDecor />
        <Brand />
        <NavList active={active} onNavigate={go} />
        <Footer running={running} />
      </aside>

      {/* Mobile: drawer toggle */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 w-11 h-11 rounded-xl bg-white border border-border shadow-card-md flex items-center justify-center text-charcoal"
        aria-label="Open navigation"
      >
        <Menu size={19} />
      </button>

      <AnimatePresence>
        {open && (
          <div className="lg:hidden fixed inset-0 z-50">
            <motion.div className="absolute inset-0 bg-charcoal/25" onClick={() => setOpen(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            <motion.aside
              className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] bg-white border-r border-border flex flex-col shadow-card-md"
              initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            >
              <SidebarDecor />
              <button onClick={() => setOpen(false)} className="absolute z-20 top-5 right-4 p-2 rounded-lg hover:bg-ivory text-charcoal/60" aria-label="Close navigation">
                <X size={18} />
              </button>
              <Brand compact />
              <NavList active={active} onNavigate={go} />
              <Footer running={running} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
