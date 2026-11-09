import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Sidebar from './components/layout/Sidebar';
import Overview from './sections/Overview';
import LiveSimulation from './sections/LiveSimulation';
import SourceCode from './sections/SourceCode';
import { useSimulation } from './hooks/useSimulation';

// Two pages:
//   /      Overview + Live Simulation (one scrolling page)
//   /code  Source Code, on its own page
// The dev server and server/index.js both serve index.html for /code.
const CODE_PATH = '/code';
const HOME_IDS = ['overview', 'simulation'];
const isCodePath = () => window.location.pathname.replace(/\/+$/, '') === CODE_PATH;

// Highlight the sidebar item for whichever home section is near the top.
function useActiveSection(ids, enabled) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    if (!enabled) return undefined;
    const onScroll = () => {
      const line = window.innerHeight * 0.3;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [ids, enabled]);
  return [active, setActive];
}

export default function App() {
  const sim = useSimulation();
  const [onCodePage, setOnCodePage] = useState(isCodePath);
  const [active, setActive] = useActiveSection(HOME_IDS, !onCodePage);

  // Browser Back/Forward between the two pages.
  useEffect(() => {
    const onPop = () => setOnCodePage(isCodePath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const openCodePage = useCallback(() => {
    if (!isCodePath()) history.pushState(null, '', CODE_PATH);
    setOnCodePage(true);
    window.scrollTo(0, 0);
  }, []);

  const goHome = useCallback((id = 'overview') => {
    if (isCodePath()) history.pushState(null, '', id === 'overview' ? '/' : `/#${id}`);
    else history.replaceState(null, '', id === 'overview' ? '/' : `#${id}`);
    setOnCodePage(false);
    setActive(id);
    // Wait one frame so the home sections exist before scrolling to them.
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [setActive]);

  const navigate = useCallback((id) => (id === 'source' ? openCodePage() : goHome(id)), [openCodePage, goHome]);

  // Opening the site with a #simulation link.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!isCodePath() && HOME_IDS.includes(id)) setTimeout(() => document.getElementById(id)?.scrollIntoView(), 50);
  }, []);

  const startFromHero = () => {
    goHome('simulation');
    sim.start();
  };

  return (
    <div className="min-h-screen bg-ivory">
      <Sidebar active={onCodePage ? 'source' : active} onNavigate={navigate} running={sim.running} />
      <main className="lg:pl-[264px] min-w-0">
        {onCodePage ? (
          <>
            <div className="px-5 sm:px-8 xl:px-12 pt-16 lg:pt-6">
              <div className="max-w-[1320px] mx-auto">
                <button
                  onClick={() => goHome('overview')}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3.5 py-2 text-sm font-medium text-charcoal/70 shadow-card hover:bg-ivory hover:text-forest transition-colors"
                >
                  <ArrowLeft size={15} /> Back to simulation
                </button>
              </div>
            </div>
            <SourceCode />
          </>
        ) : (
          <>
            <Overview onStart={startFromHero} onOpenSource={openCodePage} />
            <LiveSimulation sim={sim} />
          </>
        )}
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
