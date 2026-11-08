import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Users, Utensils, KeyRound, ArrowDown } from 'lucide-react';
import DiningTable from '../components/simulation/DiningTable';
import { Sprig } from '../components/dashboard/Decor';
import { PHI_STATE } from '../engine/simulationEngine';

const PREVIEW = [PHI_STATE.EATING, PHI_STATE.THINKING, PHI_STATE.HUNGRY, PHI_STATE.EATING, PHI_STATE.HUNGRY];

const INDICATORS = [
  { icon: Users, value: '5', label: 'Philosophers' },
  { icon: Utensils, value: '5', label: 'Forks' },
  { icon: KeyRound, value: 'Semaphore', label: 'Synchronization' },
];

const fade = (delay) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5, delay } });

// Hero photo: save the image as public/overview-table.png.
// If the file is missing, the drawn table is shown instead.
const HERO_PHOTO = '/overview-table.png';

export default function Overview({ onStart }) {
  const [photoOk, setPhotoOk] = useState(true);
  return (
    <section id="overview" data-section className="relative overflow-hidden scroll-mt-6 px-5 sm:px-8 xl:px-12 pt-20 lg:pt-16 pb-16">
      {/* Leaves in the page corners, as in the reference design */}
      <Sprig flip className="pointer-events-none absolute -top-3 -right-6 w-44 opacity-60" />
      <Sprig className="pointer-events-none absolute bottom-0 -left-8 w-32 opacity-40 rotate-[200deg]" />
      <div className="max-w-[1320px] mx-auto grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center min-h-[calc(100vh-8rem)]">
        <div>
          <motion.div {...fade(0)} className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5 text-xs text-charcoal/65 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-forest" />
            Operating Systems · Process Synchronization
          </motion.div>

          <motion.h1 {...fade(0.05)} className="text-[44px] sm:text-[56px] xl:text-[64px] leading-[1.04] tracking-[-0.02em] text-charcoal">
            DINING<br />PHILOSOPHERS<br /><span className="text-forest">PROBLEM</span>
          </motion.h1>

          <motion.p {...fade(0.12)} className="mt-6 font-serif text-xl sm:text-[22px] text-charcoal/80 leading-snug max-w-xl">
            Understanding Process Synchronization Through Semaphores.
          </motion.p>

          <motion.p {...fade(0.18)} className="mt-4 text-[15.5px] text-charcoal/60 leading-relaxed max-w-lg">
            An interactive demonstration of resource sharing, mutual exclusion and synchronization in Operating Systems.
          </motion.p>

          <motion.dl {...fade(0.24)} className="mt-9 flex flex-wrap gap-3">
            {INDICATORS.map(({ icon: Icon, value, label }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 shadow-card">
                <span className="w-9 h-9 rounded-lg bg-ivory flex items-center justify-center">
                  <Icon size={17} strokeWidth={1.8} className="text-forest" />
                </span>
                <div className="leading-tight">
                  <dd className="text-[15px] font-semibold text-charcoal">{value}</dd>
                  <dt className="text-[11.5px] text-charcoal/50">{label}</dt>
                </div>
              </div>
            ))}
          </motion.dl>

          <motion.div {...fade(0.3)} className="mt-10 flex flex-wrap items-center gap-5">
            <button
              onClick={onStart}
              className="inline-flex items-center gap-2.5 rounded-xl bg-forest px-7 py-4 text-[15px] font-semibold tracking-wide text-white shadow-card-md hover:bg-forest-dark transition-colors active:scale-[0.98]"
            >
              <Play size={16} fill="currentColor" /> START SIMULATION
            </button>
            <a href="#concepts" onClick={(e) => { e.preventDefault(); document.getElementById('concepts')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-charcoal/60 hover:text-forest transition-colors">
              Read the concepts first <ArrowDown size={14} />
            </a>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.15 }}
          className="relative hidden md:block rounded-[28px] border border-border bg-white p-4 shadow-card">
          {photoOk ? (
            <img
              src={HERO_PHOTO}
              alt="Five philosophers seated around a round wooden table with five plates and five forks"
              onError={() => setPhotoOk(false)}
              className="w-full h-auto rounded-2xl"
            />
          ) : (
            <DiningTable phiStates={PREVIEW} algPhil={null} mutex={1} />
          )}
          <div className="flex justify-center gap-5 pt-3 pb-1 text-xs text-charcoal/60">
            {[['#DCEAF4', '#9DBFD9', 'Thinking'], ['#F7E5B7', '#DDB65A', 'Hungry'], ['#D7E9D9', '#7DB487', 'Eating']].map(([f, s, l]) => (
              <span key={l} className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: f, borderColor: s }} /> {l}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
