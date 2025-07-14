import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, User, UserCheck, X, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import axiosInstance from '../../utils/axios';
import { useSeatAvailability } from '../../hooks/useSeatAvailability';
import { toast } from 'react-toastify';
import styles from './SeatMap.module.css';

const SeatMap = ({
  flightId,
  aircraftId,
  passengerCount,
  selectedSeats,
  onSeatSelect,
  seatPrices = {},
  selectedFareClass = 'economy',
  disabled = false,
  allowFlexibleSelection = true, // New prop to allow seat selection across all fare classes
  flightDetails = null, // Flight details containing fare pricing
  enableRealTimeUpdates = true // Enable real-time seat availability updates
}) => {
  const [seatMap, setSeatMap] = useState(null);
  const [occupiedSeats, setOccupiedSeats] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSeatClass, setSelectedSeatClass] = useState(selectedFareClass); // Track which class user is selecting from
  const [lastRefresh, setLastRefresh] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use seat availability hook for real-time updates (with fallback)
  const seatAvailabilityHook = enableRealTimeUpdates ? useSeatAvailability(flightId, selectedSeats) : {
    isChecking: false,
    lastChecked: null,
    unavailableSeats: [],
    allAvailable: true,
    error: null,
    checkSeats: async () => ({ allAvailable: true, unavailableSeats: [] }),
    startPeriodicCheck: () => { },
    stopPeriodicCheck: () => { },
    isStale: false
  };

  const {
    isChecking: isCheckingAvailability,
    lastChecked,
    unavailableSeats,
    allAvailable,
    error: availabilityError,
    checkSeats,
    startPeriodicCheck,
    stopPeriodicCheck,
    isStale
  } = seatAvailabilityHook;

  // Manual refresh function
  const refreshSeatMap = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      // Fetch flight details which includes seat information
      const flightResponse = await axiosInstance.get(`/flight-service/api/v1/fs/flights/${flightId}/details`);
      const flightData = flightResponse.data;

      console.log('SeatMap - Refresh flight data received:', flightData);
      console.log('SeatMap - Refresh occupied seats from API:', flightData.occupiedSeats);

      if (flightData?.availableFares) {
        // Transform fare data to seat sections format
        const sections = {};
        flightData.availableFares.forEach(fare => {
          if (fare.seats && fare.seats.length > 0) {
            sections[fare.fareType] = fare.seats;
          }
        });
        
        const convertedSeatMap = convertSeatSectionsToSeatMap(sections);
        setSeatMap(convertedSeatMap);

        const occupiedSeatsList = flightData.occupiedSeats || [];
        console.log('SeatMap - Refresh setting occupied seats:', occupiedSeatsList);
        setOccupiedSeats(new Set(occupiedSeatsList));

        setLastRefresh(new Date());

        // Check if any selected seats are now occupied
        const newlyOccupied = selectedSeats.filter(seat => occupiedSeatsList.includes(seat));
        if (newlyOccupied.length > 0) {
          toast.warning(
            `Seats ${newlyOccupied.join(', ')} are no longer available and have been removed from your selection.`,
            { toastId: `occupied-${flightId}` }
          );

          // Remove newly occupied seats from selection
          const remainingSeats = selectedSeats.filter(seat => !newlyOccupied.includes(seat));
          onSeatSelect(remainingSeats);
        }

        toast.success('Seat map updated successfully', {
          toastId: `refresh-${flightId}`,
          autoClose: 2000
        });
      }
    } catch (err) {
      console.error('Failed to refresh seat map:', err);
      toast.error('Failed to refresh seat availability. Please try again.');
    } finally {
      setIsRefreshing(false);
    }
  }, [aircraftId, flightId, selectedSeats, onSeatSelect, isRefreshing]);

  // Handle unavailable seats from real-time checks
  useEffect(() => {
    if (unavailableSeats.length > 0) {
      // Remove unavailable seats from selection
      const availableSelected = selectedSeats.filter(seat => !unavailableSeats.includes(seat));
      if (availableSelected.length !== selectedSeats.length) {
        onSeatSelect(availableSelected);
      }
    }
  }, [unavailableSeats, selectedSeats, onSeatSelect]);

  const convertSeatSectionsToSeatMap = (seatSections) => {
    const sections = [];

    const sectionConfig = {
      'FIRST_CLASS': { name: 'First Class', color: '#8B5CF6', layout: '2-2', frontendKey: 'first' },
      'BUSINESS': { name: 'Business Class', color: '#3B82F6', layout: '2-2', frontendKey: 'business' },
      'ECONOMY': { name: 'Economy Class', color: '#10B981', layout: '3-3', frontendKey: 'economy' }
    };

    const availableApiKeys = Object.keys(seatSections);

    const orderedApiKeys = ['FIRST_CLASS', 'BUSINESS', 'ECONOMY'].filter(key => availableApiKeys.includes(key));

    orderedApiKeys.forEach(apiKey => {
      const seats = seatSections[apiKey];
      const config = sectionConfig[apiKey];

      if (seats && seats.length > 0) {
        const rowMap = {};
        seats.forEach(seatCode => {
          const rowMatch = seatCode.match(/(\d+)([A-Z])/);
          if (rowMatch) {
            const rowNum = parseInt(rowMatch[1]);
            const seatLetter = rowMatch[2];

            if (!rowMap[rowNum]) {
              rowMap[rowNum] = [];
            }
            rowMap[rowNum].push(seatCode);
          } else {
            console.warn(`SeatMap - Failed to parse seat code: ${seatCode}`);
          }
        });

        const rows = Object.entries(rowMap)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([rowNum, seatCodes]) => {
            const sortedSeats = seatCodes.sort((a, b) => {
              const letterA = a.match(/[A-Z]/)[0];
              const letterB = b.match(/[A-Z]/)[0];
              return letterA.localeCompare(letterB);
            });

            let formattedSeats = [...sortedSeats];
            if (config.layout === '3-3' && sortedSeats.length >= 3) {
              formattedSeats.splice(3, 0, '');
            } else if (config.layout === '2-2' && sortedSeats.length >= 2) {
              formattedSeats.splice(2, 0, '');
            }

            return {
              number: parseInt(rowNum),
              seats: formattedSeats
            };
          });

        sections.push({
          class: config.frontendKey,
          name: config.name,
          rows: rows,
          layout: config.layout,
          color: config.color
        });
      } else {
        console.log(`SeatMap - No seats found for ${apiKey} class`);
      }
    });

    const unhandledKeys = availableApiKeys.filter(key => !['FIRST_CLASS', 'BUSINESS', 'ECONOMY'].includes(key));
    unhandledKeys.forEach(apiKey => {
      const seats = seatSections[apiKey];
      console.log(`SeatMap - Processing unknown fare class ${apiKey}:`, seats);

      if (seats && seats.length > 0) {
        const config = {
          name: apiKey.charAt(0).toUpperCase() + apiKey.slice(1).toLowerCase().replace('_', ' '),
          color: '#6B7280',
          layout: '3-3',
          frontendKey: apiKey.toLowerCase()
        };

        const rowMap = {};
        seats.forEach(seatCode => {
          const rowMatch = seatCode.match(/(\d+)([A-Z])/);
          if (rowMatch) {
            const rowNum = parseInt(rowMatch[1]);
            const seatLetter = rowMatch[2];
            if (!rowMap[rowNum]) {
              rowMap[rowNum] = [];
            }
            rowMap[rowNum].push(seatCode);
          }
        });

        const rows = Object.entries(rowMap)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([rowNum, seatCodes]) => {
            const sortedSeats = seatCodes.sort((a, b) => {
              const letterA = a.match(/[A-Z]/)[0];
              const letterB = b.match(/[A-Z]/)[0];
              return letterA.localeCompare(letterB);
            });

            let formattedSeats = [...sortedSeats];
            if (config.layout === '3-3' && sortedSeats.length >= 3) {
              formattedSeats.splice(3, 0, '');
            }

            return {
              number: parseInt(rowNum),
              seats: formattedSeats
            };
          });

        sections.push({
          class: config.frontendKey,
          name: config.name,
          rows: rows,
          layout: config.layout,
          color: config.color
        });
      }
    });
    return { sections };
  };

  useEffect(() => {
    const fetchSeatMap = async () => {
      setLoading(true);
      setError(null);

      try {
        const flightResponse = await axiosInstance.get(`/flight-service/api/v1/fs/flights/${flightId}/details`);
        const flightData = flightResponse.data;

        // Transform fare data to seat sections format
        const sections = {};
        if (flightData?.availableFares) {
          flightData.availableFares.forEach(fare => {
            if (fare.seats && fare.seats.length > 0) {
              sections[fare.fareType] = fare.seats;
            }
          });
        }

        const convertedSeatMap = convertSeatSectionsToSeatMap(sections);
        setSeatMap(convertedSeatMap);

        const occupiedSeatsList = flightData.occupiedSeats || [];

        // Special check for seats 1A and 1G
        const checkSeats = ['1A', '1G'];
        checkSeats.forEach(seat => {
          const isOccupied = occupiedSeatsList.includes(seat);
        });
        setOccupiedSeats(new Set(occupiedSeatsList));

        // Also log what we're putting in the Set
        const occupiedSet = new Set(occupiedSeatsList);

        setLoading(false);
      } catch (err) {
        console.error('Failed to load seat map from real API:', err);
        setError('Failed to load seat map. Please try again later.');
        setLoading(false);
      }
    };

    if (aircraftId && flightId) {
      fetchSeatMap();
    } else {
      console.warn('SeatMap - Missing aircraftId or flightId:', { aircraftId, flightId });
      setError('Missing aircraft or flight information');
      setLoading(false);
    }
  }, [aircraftId, flightId]);

  const getSeatStatus = (seatCode) => {

    if (occupiedSeats.has(seatCode)) return 'occupied';
    if (unavailableSeats.includes(seatCode)) return 'unavailable';
    if (selectedSeats.includes(seatCode)) return 'selected';
    return 'available';
  };

  const getSeatClassName = (seatCode) => {
    const status = getSeatStatus(seatCode);
    const baseClass = styles.seat;

    switch (status) {
      case 'occupied':
        return `${baseClass} ${styles.occupied}`;
      case 'unavailable':
        return `${baseClass} ${styles.unavailable}`;
      case 'selected':
        return `${baseClass} ${styles.selected}`;
      default:
        return `${baseClass} ${styles.available}`;
    }
  };

  const getSeatPrice = (seatCode, seatClass) => {
    // Use the flightDetails prop which contains the correct data for the current flight tab.
    if (!flightDetails?.availableFares) {
      return 0; // Return 0 if no fare data is available
    }

    // Map the frontend class key (e.g., 'first') to the backend fare type (e.g., 'FIRST_CLASS')
    const fareTypeMap = {
      'first': 'FIRST_CLASS',
      'business': 'BUSINESS',
      'economy': 'ECONOMY',
    };

    const targetFareType = fareTypeMap[seatClass];

    // If the class is unknown, there is no price.
    if (!targetFareType) {
      return 0;
    }

    // Find the fare object that exactly matches the target fare type.
    const matchingFare = flightDetails.availableFares.find(
      (fare) => fare.fareType === targetFareType
    );

    // Return the price of the matched fare, or 0 if no match was found.
    return matchingFare?.price || 0;
  };
  // Allow seat selection across all classes
  const handleSeatClick = async (seatCode, seatClass) => {
    const status = getSeatStatus(seatCode);

    // Prevent selection of occupied or unavailable seats
    if (disabled || status === 'occupied' || status === 'unavailable') {
      if (status === 'unavailable') {
        toast.warning(`Seat ${seatCode} is currently unavailable. Please select a different seat.`);
      } else if (status === 'occupied') {
        toast.warning(`Seat ${seatCode} is already taken. Please select a different seat.`);
      }
      return;
    }

    // Toggle selection
    if (selectedSeats.includes(seatCode)) {
      onSeatSelect(selectedSeats.filter(s => s !== seatCode));
    } else {
      // Check if we can select more seats
      if (selectedSeats.length >= passengerCount) {
        // If we already have selected the maximum number of seats, replace the last one
        const newSelectedSeats = [...selectedSeats];
        newSelectedSeats.pop(); // Remove the last seat
        newSelectedSeats.push(seatCode); // Add the new one
        onSeatSelect(newSelectedSeats);
      } else {
        // Verify seat is still available before selection
        if (enableRealTimeUpdates && checkSeats) {
          try {
            const { allAvailable } = await checkSeats([seatCode]);
            if (!allAvailable) {
              toast.warning(`Seat ${seatCode} is no longer available. Please select a different seat.`);
              // Refresh the seat map to get latest data
              refreshSeatMap();
              return;
            }
          } catch (error) {
            console.warn('Could not verify seat availability, proceeding with selection:', error);
            // Still allow selection but warn the user
            toast.info('Unable to verify seat availability. Selection may be subject to confirmation.');
          }
        }

        onSeatSelect([...selectedSeats, seatCode]);
      }

      // Update selected seat class for UI feedback
      setSelectedSeatClass(seatClass);
    }
  };

  // Helper function to get fare info for a seat
  const getSeatFareInfo = (seatCode) => {
    // Find which section this seat belongs to
    if (!seatMap) return null;

    // First, check if we can find the exact seat class from the aircraft data
    let exactSeatClass = null;
    let exactSeatType = null;

    if (flightDetails?.aircraft?.seatSections) {
      for (const [className, seats] of Object.entries(flightDetails.aircraft.seatSections)) {
        if (Array.isArray(seats) && seats.includes(seatCode)) {
          exactSeatClass = className;

          // Map to frontend class name
          if (className === 'FIRST_CLASS') exactSeatType = 'first';
          else if (className === 'BUSINESS') exactSeatType = 'business';
          else if (className === 'ECONOMY') exactSeatType = 'economy';
          else exactSeatType = className.toLowerCase();

          break;
        }
      }
    }

    // If we found the exact seat class from aircraft data
    if (exactSeatClass) {
      const seatPrice = getSeatPrice(seatCode, exactSeatType || 'economy');
      let fareInfo = null;

      // Try to get actual fare info from flight details
      if (flightDetails?.availableFares) {
        fareInfo = flightDetails.availableFares.find(fare =>
          fare.fareType === exactSeatClass ||
          fare.name.toUpperCase().includes(exactSeatClass)
        );
      }

      console.log(`Found exact seat class for ${seatCode}: ${exactSeatClass}, Price: ${seatPrice}`);

      return {
        name: fareInfo?.name || exactSeatClass.replace('_', ' ').toLowerCase(),
        class: exactSeatType || 'economy',
        price: seatPrice,
        fareType: exactSeatClass
      };
    }

    // Fallback to section-based approach
    for (const section of seatMap.sections) {
      for (const row of section.rows) {
        if (row.seats.includes(seatCode)) {
          const seatPrice = getSeatPrice(seatCode, section.class);

          // Map frontend class to backend fare type
          const fareClassMap = {
            'first': 'FIRST_CLASS',
            'business': 'BUSINESS',
            'economy': 'ECONOMY'
          };

          const fareType = fareClassMap[section.class] || section.class.toUpperCase();
          let fareInfo = null;

          // Try to get actual fare info from flight details
          if (flightDetails?.availableFares) {
            fareInfo = flightDetails.availableFares.find(fare =>
              fare.fareType === fareType || fare.name.toLowerCase().includes(section.class)
            );
          }

          return {
            name: fareInfo?.name || section.name,
            class: section.class,
            price: seatPrice,
            fareType: fareType
          };
        }
      }
    }
    return null;
  };

  const handleRemoveSeat = (seatCode) => {
    const newSelectedSeats = selectedSeats.filter(seat => seat !== seatCode);
    onSeatSelect(newSelectedSeats);
  };

  const renderSeatButton = (seatCode, seatClass, seatIndex) => {
    if (!seatCode) return <div className={styles.spacer} key={`spacer-${seatIndex}`} />;

    const status = getSeatStatus(seatCode);
    const price = getSeatPrice(seatCode, seatClass);
    const isAvailableForSelection = status === 'available';

    return (
      <button
        key={seatCode}
        className={`${styles.seat} ${styles[status]} ${styles[seatClass]}`}
        disabled={!isAvailableForSelection || disabled}
        onClick={() => isAvailableForSelection && handleSeatClick(seatCode, seatClass)}
        title={`Seat ${seatCode}${price ? ` - ${price.toLocaleString('vi-VN')} VND` : ''}`}
        aria-label={`Seat ${seatCode}, ${status}`}
      >
        {seatCode.match(/[A-Z]/)[0]}
      </button>
    );
  };

  const renderSeat = (seatCode, seatClass) => {
    if (!seatCode) return <div key={Math.random()} className={styles.emptySeat}></div>;

    const status = getSeatStatus(seatCode);
    const price = getSeatPrice(seatCode, seatClass);
    const isAvailableForSelection = allowFlexibleSelection || seatClass === selectedFareClass;
    const isDisabled = disabled || status === 'occupied';

    // Different styling for seats that are not in the user's original fare class
    const isPremiumSeat = seatClass !== selectedFareClass && allowFlexibleSelection;

    return (
      <button
        key={seatCode}
        className={`${styles.seat} ${styles[status]} ${styles[seatClass]} ${!isAvailableForSelection ? styles.notAvailable : ''} ${isPremiumSeat ? styles.premiumSeat : ''}`}
        onClick={() => handleSeatClick(seatCode, seatClass)}
        disabled={isDisabled}
        title={`${seatCode} - ${seatClass.charAt(0).toUpperCase() + seatClass.slice(1)} Class ${isPremiumSeat ? '(Premium upgrade available)' : ''} ${price > 0 ? `(+$${price})` : ''}`}
      >
        <span className={styles.seatLabel}>{seatCode}</span>
        {status === 'occupied' && <User size={12} />}
        {status === 'selected' && <UserCheck size={12} />}
        {!isAvailableForSelection && <X size={12} />}
        {isPremiumSeat && <User size={12} className={styles.premiumIcon} />}
      </button>
    );
  };

  const renderSection = (section) => (
    <div key={section.class} className={styles.seatSection}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>{section.name}</h3>
        <div
          className={styles.sectionIndicator}
          style={{ backgroundColor: section.color }}
        ></div>
      </div>

      <div className={styles.seatGrid}>
        {section.rows.map(row => (
          <div key={row.number} className={styles.seatRow}>
            <div className={styles.rowNumber}>{row.number}</div>
            <div className={styles.seatsContainer}>
              {row.seats.map((seat, index) => renderSeat(seat, section.class))}
            </div>
            <div className={styles.rowNumber}>{row.number}</div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={styles.seatMapContainer}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading seat map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.seatMapContainer}>
        <div className={styles.error}>
          <X className={styles.errorIcon} />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.seatMapContainer}>
      {/* Seat Availability Status */}
      {enableRealTimeUpdates && (
        <div className={styles.availabilityStatus}>

          {!allAvailable && unavailableSeats.length > 0 && (
            <div className={`${styles.statusItem} ${styles.warning}`}>
              <AlertTriangle size={16} />
              <span>Seats {unavailableSeats.join(', ')} are no longer available</span>
            </div>
          )}

          {lastChecked && (
            <div className={styles.statusItem}>
              <span className={styles.lastChecked}>
                Last checked: {new Date(lastChecked).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      )}

      <div className={styles.refreshControls}>
        <button
          onClick={refreshSeatMap}
          disabled={isRefreshing}
          className={styles.refreshButton}
          title="Refresh seat availability"
        >
          <RefreshCw size={16} className={isRefreshing ? styles.spinning : ''} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className={styles.aircraftBody}>
        <div className={styles.aircraftNose}></div>

        {seatMap?.sections.map(section => renderSection(section))}

        <div className={styles.aircraftTail}></div>
      </div>

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={`${styles.legendSeat} ${styles.available}`}></div>
          <span>Available</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendSeat} ${styles.selected}`}></div>
          <span>Selected</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendSeat} ${styles.occupied}`}></div>
          <span>Occupied</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendSeat} ${styles.unavailable}`}></div>
          <span>Unavailable</span>
        </div>
        {allowFlexibleSelection && (
          <div className={styles.legendItem}>
            <div className={`${styles.legendSeat} ${styles.premiumSeat}`}>
              <User size={12} />
            </div>
            <span>Premium Upgrade</span>
          </div>
        )}
      </div>

      {allowFlexibleSelection && (
        <div className={styles.flexibleSelectionInfo}>
          <p className={styles.infoText}>
            ✈️ <strong>Flexible Seat Selection:</strong> You can choose seats from any fare class.
            Premium seats may incur additional charges.
          </p>
          {selectedSeatClass !== selectedFareClass && (
            <p className={styles.upgradeNotice}>
              💡 You've selected seats from <strong>{selectedSeatClass}</strong> class.
              This may require a fare upgrade at checkout.
            </p>
          )}
        </div>
      )}

      <div className={styles.selectionStatus}>
        <p>
          Selected {selectedSeats.length} of {passengerCount} seat{passengerCount > 1 ? 's' : ''}
        </p>
        {selectedSeats.length > 0 && (
          <div className={styles.selectedSeats}>
            {selectedSeats.map(seat => (
              <span key={seat} className={styles.selectedSeatTag}>
                {seat}
                {unavailableSeats.includes(seat) && (
                  <AlertTriangle size={12} className={styles.unavailableIcon} title="This seat is no longer available" />
                )}
                <button
                  onClick={() => handleRemoveSeat(seat)}
                  className={styles.removeSeat}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Error Messages */}
      {(error || availabilityError) && (
        <div className={styles.errorMessage}>
          <AlertTriangle size={16} />
          <span>{error || availabilityError}</span>
        </div>
      )}

      {/* Debug Info - for development only */}
      {process.env.NODE_ENV === 'development' && (
        <div className={styles.debugInfo}>
          <button
            onClick={() => {
              console.log('=== SEAT MAP DEBUG INFO ===');
              console.log('Flight ID:', flightId);
              console.log('Aircraft ID:', aircraftId);
              console.log('Occupied Seats Set:', Array.from(occupiedSeats));
              console.log('Selected Seats:', selectedSeats);
              console.log('Unavailable Seats:', unavailableSeats);
              console.log('Seat Map Sections:', seatMap?.sections?.map(s => ({
                class: s.class,
                name: s.name,
                seatCount: s.rows.reduce((total, row) => total + row.seats.filter(seat => seat !== '').length, 0)
              })));
              console.log('=== END DEBUG INFO ===');
            }}
            className={styles.debugButton}
          >
            Debug Seat Map
          </button>
        </div>
      )}
    </div>
  );
};

export default SeatMap;
