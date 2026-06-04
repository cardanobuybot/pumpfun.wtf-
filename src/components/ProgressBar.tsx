interface ProgressBarProps {
  value: number;
  variant?: 'green' | 'yellow';
  label?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md';
}

export default function ProgressBar({ value, variant = 'green', label, showPercentage = true, size = 'md' }: ProgressBarProps) {
  const height = size === 'sm' ? 4 : 6;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        {showPercentage && (
          <span className={`font-bold ${size === 'sm' ? 'text-xs' : 'text-sm'}`} style={{ color: '#22d3ee' }}>
            {value.toFixed(2)}%
          </span>
        )}
        {label && (
          <span className="text-xs font-medium" style={{ color: '#F59E0B' }}>{label}</span>
        )}
      </div>
      <div className="w-full rounded-full overflow-hidden" style={{ height, background: '#1e293b' }}>
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${Math.min(value, 100)}%`,
            background: variant === 'green' ? 'linear-gradient(90deg, #22d3ee, #3B82F6)' : '#F59E0B',
          }}
        />
      </div>
    </div>
  );
}
