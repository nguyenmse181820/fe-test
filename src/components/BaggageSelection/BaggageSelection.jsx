import React, { useState, useEffect, useCallback } from 'react';
import { Package, Info } from 'lucide-react';
import styles from './BaggageSelection.module.css';

const BaggageSelection = ({ 
  passengers, 
  flightDetails, 
  isMultiSegment, 
  onBaggageChange,
  initialBaggageSelections = {}
}) => {
  // State structure: { "passenger-0-flight-123": { extraBag: optionId, overweight: null, priority: optionId } }
  const [baggageSelections, setBaggageSelections] = useState({});

  // Baggage options with clear IDs
  const baggageTypes = {
    extraBag: {
      title: 'Extra Baggage',
      type: 'EXTRA_BAG',
      mutuallyExclusiveWith: 'overweight',
      options: [
        { id: 'extra-20kg', weight: 20, price: 550000, label: '20kg' },
        { id: 'extra-30kg', weight: 30, price: 750000, label: '30kg' },
        { id: 'extra-40kg', weight: 40, price: 950000, label: '40kg' },
        { id: 'extra-50kg', weight: 50, price: 1150000, label: '50kg' },
        { id: 'extra-60kg', weight: 60, price: 1350000, label: '60kg' },
        { id: 'extra-70kg', weight: 70, price: 1550000, label: '70kg' }
      ]
    },
    overweight: {
      title: 'Overweight Baggage',
      type: 'OVERWEIGHT',
      mutuallyExclusiveWith: 'extraBag',
      options: [
        { id: 'overweight-20kg', weight: 20, price: 650000, label: '20kg' },
        { id: 'overweight-30kg', weight: 30, price: 850000, label: '30kg' }
      ]
    },
    priority: {
      title: 'Priority Baggage',
      type: 'PRIORITY',
      mutuallyExclusiveWith: null,
      options: [
        { id: 'priority-handling', weight: 2, price: 300000, label: 'Priority Handling (2kg)' }
      ]
    }
  };

  // Generate unique key for passenger + flight combination
  const getSelectionKey = (passengerIndex, flightId) => {
    // Always include flight ID for consistency between single and multi-segment
    if (flightId) {
      return `passenger-${passengerIndex}-flight-${flightId}`;
    }
    // Fallback for cases where flightId is not available
    return `passenger-${passengerIndex}`;
  };

  // Initialize state based on passengers and flights
  useEffect(() => {
    const initialState = {};
    
    passengers.forEach((_, passengerIndex) => {
      if (isMultiSegment && Array.isArray(flightDetails)) {
        // Multi-segment: each passenger has selections for each flight
        flightDetails.forEach(flight => {
          const flightId = flight.flightId || flight.id;
          const key = getSelectionKey(passengerIndex, flightId);
          initialState[key] = {
            extraBag: null,
            overweight: null,
            priority: null
          };
        });
      } else {
        // Single flight: treat as array with one element for consistency
        const flight = flightDetails;
        const flightId = flight?.flightId || flight?.id;
        if (flightId) {
          const key = getSelectionKey(passengerIndex, flightId);
          initialState[key] = {
            extraBag: null,
            overweight: null,
            priority: null
          };
        }
      }
    });

    setBaggageSelections(initialState);
  }, [passengers, flightDetails, isMultiSegment]);

  // Handle baggage selection/deselection
  const handleBaggageSelection = useCallback((passengerIndex, flightId, baggageType, optionId) => {
    setBaggageSelections(prev => {
      const key = getSelectionKey(passengerIndex, flightId);
      const newSelections = { ...prev };
      
      if (!newSelections[key]) {
        newSelections[key] = { extraBag: null, overweight: null, priority: null };
      }

      const currentSelection = newSelections[key][baggageType];
      
      // If clicking the same option, deselect it
      if (currentSelection === optionId) {
        newSelections[key][baggageType] = null;
      } else {
        // Select the new option
        newSelections[key][baggageType] = optionId;
        
        // Handle mutual exclusivity
        const typeConfig = baggageTypes[baggageType];
        if (typeConfig.mutuallyExclusiveWith) {
          newSelections[key][typeConfig.mutuallyExclusiveWith] = null;
        }
      }

      return newSelections;
    });
  }, [isMultiSegment]);

  // Convert selections to backend format and notify parent
  useEffect(() => {
    if (!onBaggageChange) return;

    const backendFormat = {};
    
    Object.entries(baggageSelections).forEach(([key, selections]) => {
      Object.entries(selections).forEach(([baggageType, optionId]) => {
        if (optionId) {
          // Find the option details
          const typeConfig = baggageTypes[baggageType];
          const option = typeConfig.options.find(opt => opt.id === optionId);
          
          if (option) {
            if (!backendFormat[key]) {
              backendFormat[key] = {};
            }
            
            const backendKey = `${typeConfig.type}-${option.weight}`;
            
            // Extract passenger index and flight ID from key
            const keyParts = key.split('-');
            const passengerIndex = parseInt(keyParts[1]);
            
            // Extract flightId from key
            let flightId = null;
            if (keyParts.length > 3 && keyParts[2] === 'flight') {
              // Both single and multi-segment now use format: "passenger-{index}-flight-{uuid}"
              flightId = keyParts.slice(3).join('-');
            }
            
            backendFormat[key][backendKey] = {
              type: typeConfig.type,
              weight: option.weight,
              price: option.price,
              passengerIndex: passengerIndex,
              flightId: flightId
            };
          }
        }
      });
    });

    onBaggageChange(backendFormat);
  }, [baggageSelections, isMultiSegment, onBaggageChange]);

  // Check if option is selected
  const isOptionSelected = (passengerIndex, flightId, baggageType, optionId) => {
    const key = getSelectionKey(passengerIndex, flightId);
    return baggageSelections[key]?.[baggageType] === optionId;
  };

  // Check if baggage type is disabled due to mutual exclusivity
  const isBaggageTypeDisabled = (passengerIndex, flightId, baggageType) => {
    const typeConfig = baggageTypes[baggageType];
    if (!typeConfig.mutuallyExclusiveWith) return false;
    
    const key = getSelectionKey(passengerIndex, flightId);
    return !!baggageSelections[key]?.[typeConfig.mutuallyExclusiveWith];
  };

  // Calculate total cost
  const calculateTotalCost = () => {
    let total = 0;
    
    Object.entries(baggageSelections).forEach(([_, selections]) => {
      Object.entries(selections).forEach(([baggageType, optionId]) => {
        if (optionId) {
          const typeConfig = baggageTypes[baggageType];
          const option = typeConfig.options.find(opt => opt.id === optionId);
          if (option) {
            total += option.price;
          }
        }
      });
    });
    
    return total;
  };

  // Render baggage options for a specific type
  const renderBaggageTypeOptions = (passengerIndex, flightId, baggageType) => {
    const typeConfig = baggageTypes[baggageType];
    const isDisabled = isBaggageTypeDisabled(passengerIndex, flightId, baggageType);
    
    return (
      <div key={baggageType} className={styles.baggageGroup}>
        <div className={styles.groupTitle}>
          <Package size={18} />
          <span>{typeConfig.title}</span>
        </div>
        
        <div className={`${styles.groupOptions} ${isDisabled ? styles.disabled : ''}`}>
          {/* None option */}
          <div 
            className={`${styles.baggageOption} ${!baggageSelections[getSelectionKey(passengerIndex, flightId)]?.[baggageType] ? styles.selected : ''} ${isDisabled ? styles.disabled : ''}`}
            onClick={() => !isDisabled && handleBaggageSelection(passengerIndex, flightId, baggageType, null)}
          >
            <div className={styles.optionDetails}>
              <span className={styles.optionLabel}>No {typeConfig.title}</span>
              <span className={styles.optionPrice}>Free</span>
            </div>
          </div>
          
          {/* Baggage options */}
          {typeConfig.options.map(option => (
            <div
              key={option.id}
              className={`${styles.baggageOption} ${isOptionSelected(passengerIndex, flightId, baggageType, option.id) ? styles.selected : ''} ${isDisabled ? styles.disabled : ''}`}
              onClick={() => !isDisabled && handleBaggageSelection(passengerIndex, flightId, baggageType, option.id)}
            >
              <div className={styles.optionDetails}>
                <span className={styles.optionLabel}>{option.label}</span>
                <span className={styles.optionPrice}>{option.price.toLocaleString('vi-VN')} VND</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render baggage selection for one passenger on one flight
  const renderFlightBaggage = (passengerIndex, flight, flightIndex) => {
    const flightId = flight?.flightId || flight?.id || null;
    
    return (
      <div key={flightIndex} className={styles.flightBaggageSection}>
        {isMultiSegment && (
          <div className={styles.flightHeader}>
            <span className={styles.flightNumber}>
              {flight.flightNumber || flight.flightCode || `Flight ${flightIndex + 1}`}
            </span>
            <span className={styles.flightRoute}>
              {flight.departureAirport || flight.departure} → {flight.arrivalAirport || flight.arrival}
            </span>
          </div>
        )}

        {Object.keys(baggageTypes).map(baggageType => 
          renderBaggageTypeOptions(passengerIndex, flightId, baggageType)
        )}
      </div>
    );
  };

  // Render baggage selection for one passenger
  const renderPassengerBaggage = (passenger, passengerIndex) => {
    const flights = isMultiSegment ? (Array.isArray(flightDetails) ? flightDetails : [flightDetails]) : [flightDetails];
    
    return (
      <div key={passengerIndex} className={styles.passengerBaggageSection}>
        <div className={styles.passengerHeader}>
          <div className={styles.passengerInfo}>
            <span className={styles.passengerName}>
              {passenger.firstName} {passenger.lastName}
            </span>
            <span className={styles.passengerType}>
              {passenger.passengerType === 'ADULT' ? 'Adult' : 
               passenger.passengerType === 'CHILD' ? 'Child' : 'Infant'}
            </span>
          </div>
        </div>

        {flights.map((flight, flightIndex) => 
          renderFlightBaggage(passengerIndex, flight, flightIndex)
        )}
      </div>
    );
  };

  return (
    <div className={styles.baggageContainer}>
      <div className={styles.baggageHeader}>
        <Package size={24} />
        <div className={styles.headerContent}>
          <h3>Select Baggage Add-ons</h3>
          <p>Add extra baggage for your flight (optional)</p>
        </div>
      </div>

      <div className={styles.baggageInfo}>
        <Info size={16} />
        <span>Each passenger gets 7kg cabin baggage and 23kg checked baggage included for free</span>
      </div>

      <div className={styles.baggageInfo}>
        <Package size={16} />
        <span>Priority Baggage includes 2kg additional allowance plus priority handling at check-in and baggage claim</span>
      </div>

      <div className={styles.passengersContainer}>
        {passengers.map((passenger, index) => renderPassengerBaggage(passenger, index))}
      </div>

      {calculateTotalCost() > 0 && (
        <div className={styles.baggageSummary}>
          <div className={styles.totalCost}>
            <span>Total Baggage Cost:</span>
            <span className={styles.cost}>{calculateTotalCost().toLocaleString('vi-VN')} VND</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BaggageSelection;
