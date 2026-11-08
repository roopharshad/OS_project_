import { useCallback, useEffect, useState } from 'react';
import Sidebar, { NAV } from './components/layout/Sidebar';
import Overview from './sections/Overview';
import LiveSimulation from './sections/LiveSimulation';
import SemaphoreSection from './sections/SemaphoreSection';
import Algorithm from './sections/Algorithm';
import Concepts from './sections/Concepts';
import SourceCode from './sections/SourceCode';
import Statistics from './sections/Statistics';
import { useSimulation } from './hooks/useSimulation';

// Highlight the sidebar item for whichever section is near the top of the viewport.
function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const onScroll = () => {
      const line = window.innerHeight * 0.3;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      // At the very bottom, the last section is active even if it is short.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = ids[ids.length - 1];
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [ids]);
  return [active, setActive];
}

const IDS = NAV.map((n) => n.id);

export default function App() {
  const sim = useSimulation();
  const [active, setActive] = useActiveSection(IDS);

  const navigate = useCallback((id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActive(id);
    history.replaceState(null, '', `#${id}`);
  }, [setActive]);

  // Support opening the page with a #section link.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (IDS.includes(id)) setTimeout(() => document.getElementById(id)?.scrollIntoView(), 50);
  }, []);

  const startFromHero = () => {
    navigate('simulation');
    sim.start();
  };

  return (
    <div className="min-h-screen bg-ivory">
      <Sidebar active={active} onNavigate={navigate} running={sim.running} />
      <main className="lg:pl-[264px] min-w-0">
        <Overview onStart={startFromHero} />
        <LiveSimulation sim={sim} />
        <SemaphoreSection sim={sim} />
        <Algorithm sim={sim} />
        <Concepts />
        <SourceCode />
        <Statistics sim={sim} />
        <footer className="border-t border-border px-5 sm:px-8 xl:px-12 py-8 text-xs text-charcoal/45">
          <div className="max-w-[1320px] mx-auto flex flex-wrap justify-between gap-2">
            <span>Dining Philosophers Problem · Semaphore-Based Synchronization</span>
            <span>Operating Systems Laboratory</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
