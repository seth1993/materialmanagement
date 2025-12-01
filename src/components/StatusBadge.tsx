import { ShipmentStatus } from '@/types/shipment';
import { ExceptionStatus, ExceptionType } from '@/types/exception';

interface StatusBadgeProps {
  status: ShipmentStatus | ExceptionStatus;
  count?: number;
  type?: 'shipment' | 'exception';
  exceptionType?: ExceptionType;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ 
  status, 
  count, 
  type = 'shipment', 
  exceptionType,
  size = 'md' 
}: StatusBadgeProps) {
  const getShipmentStatusConfig = (status: ShipmentStatus) => {
    switch (status) {
      case ShipmentStatus.PENDING:
        return { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' };
      case ShipmentStatus.IN_TRANSIT:
        return { color: 'bg-blue-100 text-blue-800', label: 'In Transit' };
      case ShipmentStatus.DELIVERED:
        return { color: 'bg-green-100 text-green-800', label: 'Delivered' };
      case ShipmentStatus.DELAYED:
        return { color: 'bg-orange-100 text-orange-800', label: 'Delayed' };
      case ShipmentStatus.CANCELLED:
        return { color: 'bg-gray-100 text-gray-800', label: 'Cancelled' };
      case ShipmentStatus.EXCEPTION:
        return { color: 'bg-red-100 text-red-800', label: 'Exception' };
      default:
        return { color: 'bg-gray-100 text-gray-800', label: 'Unknown' };
    }
  };

  const getExceptionStatusConfig = (status: ExceptionStatus) => {
    switch (status) {
      case ExceptionStatus.OPEN:
        return { color: 'bg-red-100 text-red-800', label: 'Open' };
      case ExceptionStatus.IN_PROGRESS:
        return { color: 'bg-yellow-100 text-yellow-800', label: 'In Progress' };
      case ExceptionStatus.RESOLVED:
        return { color: 'bg-green-100 text-green-800', label: 'Resolved' };
      case ExceptionStatus.CLOSED:
        return { color: 'bg-gray-100 text-gray-800', label: 'Closed' };
      default:
        return { color: 'bg-gray-100 text-gray-800', label: 'Unknown' };
    }
  };

  const getExceptionTypeIcon = (exceptionType: ExceptionType) => {
    switch (exceptionType) {
      case ExceptionType.LATE:
        return '⏰';
      case ExceptionType.PARTIAL:
        return '📦';
      case ExceptionType.DAMAGED:
        return '💥';
      case ExceptionType.WRONG_ITEM:
        return '❌';
      case ExceptionType.MISSING:
        return '🔍';
      case ExceptionType.OTHER:
        return '❓';
      default:
        return '⚠️';
    }
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs';
      case 'lg':
        return 'px-4 py-2 text-base';
      default:
        return 'px-3 py-1 text-sm';
    }
  };

  const config = type === 'shipment' 
    ? getShipmentStatusConfig(status as ShipmentStatus)
    : getExceptionStatusConfig(status as ExceptionStatus);

  const sizeClasses = getSizeClasses(size);

  return (
    <span className={`
      inline-flex items-center rounded-full font-medium
      ${config.color} ${sizeClasses}
    `}>
      {exceptionType && (
        <span className="mr-1">{getExceptionTypeIcon(exceptionType)}</span>
      )}
      {config.label}
      {count !== undefined && count > 0 && (
        <span className="ml-1 bg-white bg-opacity-50 rounded-full px-1.5 py-0.5 text-xs">
          {count}
        </span>
      )}
    </span>
  );
}

interface ExceptionCountBadgeProps {
  count: number;
  size?: 'sm' | 'md' | 'lg';
}

export function ExceptionCountBadge({ count, size = 'md' }: ExceptionCountBadgeProps) {
  if (count === 0) return null;

  const sizeClasses = getSizeClasses(size);

  return (
    <span className={`
      inline-flex items-center rounded-full font-medium
      bg-red-100 text-red-800 ${sizeClasses}
    `}>
      ⚠️ {count} Issue{count > 1 ? 's' : ''}
    </span>
  );
}

function getSizeClasses(size: string) {
  switch (size) {
    case 'sm':
      return 'px-2 py-1 text-xs';
    case 'lg':
      return 'px-4 py-2 text-base';
    default:
      return 'px-3 py-1 text-sm';
  }
}
