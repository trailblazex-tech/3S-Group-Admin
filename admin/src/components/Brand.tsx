import logo from '../assets/3s-logo.png';

export function BrandMark({ className = 'h-10 w-10' }: { className?: string }) {
  return <img src={logo} alt="" width={256} height={256} className={`shrink-0 select-none ${className}`} draggable={false} />;
}

/** The 3S mark with the product name, for dark backgrounds. */
export function BrandLockup({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const large = size === 'lg';
  return (
    <div className="flex items-center gap-3">
      <BrandMark className={large ? 'h-12 w-12' : 'h-10 w-10'} />
      <div className="leading-tight">
        <p className={`font-display font-semibold text-white ${large ? 'text-xl' : 'text-base'}`}>
          3S <span className="text-brand-gold">Group</span>
        </p>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">Website admin</p>
      </div>
    </div>
  );
}
