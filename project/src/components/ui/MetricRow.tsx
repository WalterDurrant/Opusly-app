import { Star } from 'lucide-react';

interface Props {
  label: string;
  score: number;
  interactive?: boolean;
  onScore?: (s: number) => void;
}

export default function MetricRow({ label, score, interactive = false, onScore }: Props) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-600 font-medium">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(s => (
          <button
            key={s}
            disabled={!interactive}
            onClick={() => onScore?.(s)}
            className={interactive ? 'cursor-pointer' : 'cursor-default'}
          >
            <Star
              className={`w-4 h-4 transition-colors ${s <= score ? 'text-indigo-500 fill-indigo-500' : 'text-gray-200'}`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
