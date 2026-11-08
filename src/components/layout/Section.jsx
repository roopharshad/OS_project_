import { motion } from 'framer-motion';

export default function Section({ id, index, title, subtitle, children, aside }) {
  return (
    <section id={id} data-section className="scroll-mt-6 px-5 sm:px-8 xl:px-12 py-14 border-t border-border first:border-t-0">
      <div className="max-w-[1320px] mx-auto">
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.4 }}
          className="flex flex-wrap items-end justify-between gap-4 mb-8"
        >
          <div>
            <div className="eyebrow mb-2">Section {String(index).padStart(2, '0')}</div>
            <h2 className="text-[30px] sm:text-[34px] leading-tight text-charcoal">{title}</h2>
            {subtitle && <p className="mt-2 text-[15px] text-charcoal/60 max-w-2xl leading-relaxed">{subtitle}</p>}
          </div>
          {aside}
        </motion.header>
        {children}
      </div>
    </section>
  );
}
