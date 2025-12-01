import { RFQStatus } from '@/types/rfq';
import { getRFQStatusColor, formatRFQStatus } from '@/lib/rfq-utils';

interface RFQStatusBadgeProps {
  status: RFQStatus;
  size?: 'sm' | 'md';
}

export default function RFQStatusBadge({ status, size = 'md' }: RFQStatusBadgeProps) {
  const colorClasses = getRFQStatusColor(status);
  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${colorClasses} ${sizeClasses}`}
    >
      {formatRFQStatus(status)}
    </span>
  );
}
