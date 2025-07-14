import React from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, Clock, Wifi, WifiOff } from 'lucide-react';
import styles from './SeatAvailabilityStatus.module.css';

/**
 * Component to display seat availability status with real-time updates
 */
const SeatAvailabilityStatus = ({
  isChecking,
  lastChecked,
  unavailableSeats = [],
  allAvailable,
  error,
  isStale,
  onRefresh,
  isRefreshing,
  enableRealTimeUpdates = true
}) => {
  const formatLastChecked = (date) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    
    if (diffSecs < 30) return 'Just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusInfo = () => {
    if (error) {
      return {
        icon: AlertTriangle,
        iconClass: 'error',
        text: 'Unable to verify seat availability',
        subtext: error
      };
    }
    
    if (isChecking) {
      return {
        icon: RefreshCw,
        iconClass: 'checking',
        text: 'Checking seat availability...',
        subtext: null
      };
    }
    
    if (unavailableSeats.length > 0) {
      return {
        icon: AlertTriangle,
        iconClass: 'warning',
        text: `${unavailableSeats.length} seat${unavailableSeats.length > 1 ? 's' : ''} no longer available`,
        subtext: `Seats: ${unavailableSeats.join(', ')}`
      };
    }
    
    if (allAvailable) {
      return {
        icon: CheckCircle,
        iconClass: 'success',
        text: 'All selected seats are available',
        subtext: isStale ? 'Data may be outdated' : null
      };
    }
    
    return {
      icon: Clock,
      iconClass: 'checking',
      text: 'Seat availability unknown',
      subtext: 'Please check seat selection'
    };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div className={styles.availabilityStatus}>
      <div className={styles.statusLeft}>
        <StatusIcon 
          className={`${styles.statusIcon} ${styles[statusInfo.iconClass]}`}
          size={16}
        />
        <div>
          <p className={styles.statusText}>{statusInfo.text}</p>
          {statusInfo.subtext && (
            <p className={`${styles.statusText} ${styles.subtext}`}>
              {statusInfo.subtext}
            </p>
          )}
        </div>
      </div>
      
      <div className={styles.statusRight}>
        {enableRealTimeUpdates && (
          <div className={`${styles.realTimeIndicator} ${
            isChecking || !error ? styles.active : styles.inactive
          }`}>
            <div className={styles.pulseIndicator} />
            <span>
              {isChecking ? 'Updating...' : error ? 'Offline' : 'Live'}
            </span>
          </div>
        )}
        
        <button
          className={`${styles.refreshButton} ${isRefreshing ? styles.refreshing : ''}`}
          onClick={onRefresh}
          disabled={isRefreshing || isChecking}
          title="Refresh seat availability"
        >
          <RefreshCw 
            size={12} 
            className={isRefreshing ? styles.spinning : ''}
          />
          {isRefreshing ? 'Updating...' : 'Refresh'}
        </button>
        
        {lastChecked && (
          <span className={styles.lastUpdated}>
            Updated: {formatLastChecked(lastChecked)}
          </span>
        )}
      </div>
    </div>
  );
};

export default SeatAvailabilityStatus;
