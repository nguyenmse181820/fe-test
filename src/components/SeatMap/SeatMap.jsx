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
  disabled = false 
}) => {
  const [seatMap, setSeatMap] = useState(null);
  const [occupiedSeats, setOccupiedSeats] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Convert seat sections API response to SeatMap format
  const convertSeatSectionsToSeatMap = (seatSections) => {
    const sections = [];
    
    // Define section order and properties
    const sectionConfig = {
      'first': { name: 'First Class', color: '#8B5CF6', layout: '2-2' },
      'business': { name: 'Business Class', color: '#3B82F6', layout: '2-2' }, 
      'economy': { name: 'Economy Class', color: '#10B981', layout: '3-3' }
    };
    
    // Process sections in a specific order
    const orderedClasses = ['first', 'business', 'economy'];
    
    console.log('SeatMap - Available seat sections:', Object.keys(seatSections));
    console.log('SeatMap - Full seat sections data:', seatSections);
    
    orderedClasses.forEach(className => {
      const seats = seatSections[className];
      console.log(`SeatMap - Processing ${className} class:`, seats);
      
      if (seats && seats.length > 0) {
        const config = sectionConfig[className] || 
                      { name: className.charAt(0).toUpperCase() + className.slice(1), color: '#6B7280', layout: '3-3' };
        
        // Group seats by row number
        const rowMap = {};
        seats.forEach(seatCode => {
          console.log(`SeatMap - Processing seat code: ${seatCode}`);
          const rowMatch = seatCode.match(/(\d+)([A-Z])/);
          if (rowMatch) {
            const rowNum = parseInt(rowMatch[1]);
            const seatLetter = rowMatch[2];
            console.log(`SeatMap - Parsed seat: row=${rowNum}, letter=${seatLetter}`);
            
            if (!rowMap[rowNum]) {
              rowMap[rowNum] = [];
            }
            rowMap[rowNum].push(seatCode);
          } else {
            console.warn(`SeatMap - Failed to parse seat code: ${seatCode}`);
          }
        });
        
        console.log(`SeatMap - Row map for ${className}:`, rowMap);
        
        // Convert to rows format with proper spacing for aisles
        const rows = Object.entries(rowMap)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([rowNum, seatCodes]) => {
            const sortedSeats = seatCodes.sort((a, b) => {
              const letterA = a.match(/[A-Z]/)[0];
              const letterB = b.match(/[A-Z]/)[0];
              return letterA.localeCompare(letterB);
            });
            
            // Add aisle spacing based on layout
            let formattedSeats = [...sortedSeats];
            if (config.layout === '3-3' && sortedSeats.length >= 3) {
              // Insert aisle after 3rd seat for economy
              formattedSeats.splice(3, 0, '');
            } else if (config.layout === '2-2' && sortedSeats.length >= 2) {
              // Insert aisle after 2nd seat for first/business
              formattedSeats.splice(2, 0, '');
            }
            
            return {
              number: parseInt(rowNum),
              seats: formattedSeats
            };
          });
        
        sections.push({
          class: className,
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
        console.log('SeatMap - Fetching real data for aircraft:', aircraftId, 'flight:', flightId);
        
        // Get seat sections from aircraft service
        const seatSectionsResponse = await axiosInstance.get(`/flight-service/api/v1/fs/aircraft/${aircraftId}/seat-sections`);
        const seatSectionsData = seatSectionsResponse.data;
        
        console.log('SeatMap - Seat sections response:', seatSectionsData);
        
        // Get flight details to get occupied seats
        const flightResponse = await axiosInstance.get(`/flight-service/api/v1/fs/flights/${flightId}/details`);
        const flightData = flightResponse.data;
        
        console.log('SeatMap - Flight details response:', flightData);
        
        // Convert seat sections to seat map format
        const convertedSeatMap = convertSeatSectionsToSeatMap(seatSectionsData.seatSections);
        setSeatMap(convertedSeatMap);
        
        // Set occupied seats from real flight data
        const occupiedSeatsList = flightData.occupiedSeats || [];
        setOccupiedSeats(new Set(occupiedSeatsList));
        
        console.log('SeatMap - Converted seat map:', convertedSeatMap);
        console.log('SeatMap - Occupied seats:', occupiedSeatsList);
        
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
    return seatPrices[seatClass] || 0;
  };
  const handleSeatClick = (seatCode, seatClass) => {
    if (disabled || occupiedSeats.has(seatCode)) return;

    // Only allow selection of seats in the selected fare class
    if (seatClass !== selectedFareClass) {
      return;
    }

    const isSelected = selectedSeats.includes(seatCode);
    
    if (isSelected) {
      // Deselect seat
      onSeatSelect(selectedSeats.filter(seat => seat !== seatCode));
    } else {
      // Select seat (check if we can add more)
      if (selectedSeats.length < passengerCount) {
        onSeatSelect([...selectedSeats, seatCode]);
      }
    }
  };
  const renderSeat = (seatCode, seatClass) => {
    if (!seatCode) return <div key={Math.random()} className={styles.emptySeat}></div>;

    const status = getSeatStatus(seatCode);
    const price = getSeatPrice(seatCode, seatClass);
    const isAvailableForSelection = seatClass === selectedFareClass;
    const isDisabled = disabled || status === 'occupied' || !isAvailableForSelection;
    
    return (
      <button
        key={seatCode}
        className={`${styles.seat} ${styles[status]} ${styles[seatClass]} ${!isAvailableForSelection ? styles.notAvailable : ''}`}
        onClick={() => handleSeatClick(seatCode, seatClass)}
        disabled={isDisabled}
        title={`${seatCode} - ${seatClass} ${!isAvailableForSelection ? '(Not available in your fare)' : price > 0 ? `(+$${price})` : ''}`}
      >
        <span className={styles.seatLabel}>{seatCode}</span>
        {status === 'occupied' && <User size={12} />}
        {status === 'selected' && <UserCheck size={12} />}
        {!isAvailableForSelection && <X size={12} />}
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
      </div>

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
                  onClick={() => onSeatSelect(selectedSeats.filter(s => s !== seat))}
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
