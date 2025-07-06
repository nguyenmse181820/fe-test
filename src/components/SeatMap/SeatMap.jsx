import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, User, UserCheck, X } from 'lucide-react';
import axiosInstance from '../../utils/axios';
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
  flightDetails = null // Flight details containing fare pricing
}) => {
  const [seatMap, setSeatMap] = useState(null);
  const [occupiedSeats, setOccupiedSeats] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSeatClass, setSelectedSeatClass] = useState(selectedFareClass); // Track which class user is selecting from

  const convertSeatSectionsToSeatMap = (seatSections) => {
    const sections = [];
    
    const sectionConfig = {
      'FIRST_CLASS': { name: 'First Class', color: '#8B5CF6', layout: '2-2', frontendKey: 'first' },
      'BUSINESS': { name: 'Business Class', color: '#3B82F6', layout: '2-2', frontendKey: 'business' }, 
      'ECONOMY': { name: 'Economy Class', color: '#10B981', layout: '3-3', frontendKey: 'economy' }
    };
    
    const availableApiKeys = Object.keys(seatSections);
    console.log('SeatMap - Available seat sections from API:', availableApiKeys);
    console.log('SeatMap - Full seat sections data:', seatSections);
    
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
        const seatSectionsResponse = await axiosInstance.get(`/flight-service/api/v1/fs/aircraft/${aircraftId}/seat-sections`);
        const seatSectionsData = seatSectionsResponse.data;
        
        const flightResponse = await axiosInstance.get(`/flight-service/api/v1/fs/flights/${flightId}/details`);
        const flightData = flightResponse.data;
        
        const convertedSeatMap = convertSeatSectionsToSeatMap(seatSectionsData.seatSections);
        setSeatMap(convertedSeatMap);
        
        const occupiedSeatsList = flightData.occupiedSeats || [];
        setOccupiedSeats(new Set(occupiedSeatsList));
        
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
    if (selectedSeats.includes(seatCode)) return 'selected';
    return 'available';
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
  const handleSeatClick = (seatCode, seatClass) => {
    if (disabled || occupiedSeats.has(seatCode)) return;
    
    // Toggle selection
    if (selectedSeats.includes(seatCode)) {
      onSeatSelect(selectedSeats.filter(s => s !== seatCode));
    } else {
      // If we already have selected the maximum number of seats, replace the last one
      if (selectedSeats.length >= passengerCount) {
        const newSelectedSeats = [...selectedSeats];
        newSelectedSeats.pop(); // Remove the last seat
        newSelectedSeats.push(seatCode); // Add the new one
        onSeatSelect(newSelectedSeats);
      } else {
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
    const newSeatDetails = newSelectedSeats.map(seat => ({
        seatCode: seat,
        fare: getSeatFareInfo(seat)
    }));
    onSeatSelect(newSelectedSeats, newSeatDetails);
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
        {isPremiumSeat && <span className={styles.premiumIcon}>⭐</span>}
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
        {allowFlexibleSelection && (
          <div className={styles.legendItem}>
            <div className={`${styles.legendSeat} ${styles.premiumSeat}`}>⭐</div>
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
    </div>
  );
};

export default SeatMap;
