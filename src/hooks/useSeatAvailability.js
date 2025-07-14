/**
 * Custom hook for managing real-time seat availability
 * Provides seat availability checking, real-time updates, and error handling
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import { checkSeatAvailability } from '../services/BookingService';

export const useSeatAvailability = (flightId, selectedSeats = []) => {
  const [availabilityStatus, setAvailabilityStatus] = useState({
    isChecking: false,
    lastChecked: null,
    unavailableSeats: [],
    allAvailable: true,
    error: null
  });

  const checkIntervalRef = useRef(null);
  const lastCheckRef = useRef(null);

  // Check seat availability for given seats
  const checkSeats = useCallback(async (seatCodes = selectedSeats) => {
    if (!flightId || !seatCodes.length) {
      setAvailabilityStatus(prev => ({
        ...prev,
        allAvailable: true,
        unavailableSeats: [],
        error: null
      }));
      return { allAvailable: true, unavailableSeats: [] };
    }

    setAvailabilityStatus(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      const response = await checkSeatAvailability(flightId, seatCodes);
      
      let allAvailable = true;
      let unavailableSeats = [];

      // Handle different response formats
      if (response.seatStatuses && Array.isArray(response.seatStatuses)) {
        // New format with seatStatuses array
        unavailableSeats = response.seatStatuses
          .filter(status => !status.available)
          .map(status => status.seatCode);
        allAvailable = unavailableSeats.length === 0;
      } else if (response.allRequestedSeatsAvailable !== undefined) {
        // Direct boolean response
        allAvailable = response.allRequestedSeatsAvailable;
        if (!allAvailable && response.unavailableSeats) {
          unavailableSeats = response.unavailableSeats;
        }
      } else if (response.data) {
        // Legacy format
        allAvailable = response.data.allAvailable !== false;
        if (!allAvailable && response.data.availableSeats) {
          unavailableSeats = seatCodes.filter(
            seat => !response.data.availableSeats.includes(seat)
          );
        }
      }

      const now = new Date();
      setAvailabilityStatus({
        isChecking: false,
        lastChecked: now,
        unavailableSeats,
        allAvailable,
        error: null
      });

      lastCheckRef.current = now;

      // Show toast notification if seats became unavailable
      if (!allAvailable && unavailableSeats.length > 0) {
        toast.warning(
          `Seats ${unavailableSeats.join(', ')} are no longer available. Please select different seats.`,
          { toastId: `unavailable-${flightId}` }
        );
      }

      return { allAvailable, unavailableSeats };
    } catch (error) {
      console.error('Seat availability check failed:', error);
      
      setAvailabilityStatus(prev => ({
        ...prev,
        isChecking: false,
        error: error.message || 'Failed to check seat availability'
      }));

      toast.error('Unable to verify seat availability. Please try again.', {
        toastId: `availability-error-${flightId}`
      });

      return { allAvailable: false, unavailableSeats: [], error: error.message };
    }
  }, [flightId, selectedSeats]);

  // Start periodic availability checks
  const startPeriodicCheck = useCallback((intervalMs = 30000) => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
    }

    if (selectedSeats.length > 0) {
      checkIntervalRef.current = setInterval(() => {
        checkSeats(selectedSeats);
      }, intervalMs);
    }
  }, [checkSeats, selectedSeats]);

  // Stop periodic checks
  const stopPeriodicCheck = useCallback(() => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
  }, []);

  // Check seats immediately when selected seats change
  useEffect(() => {
    if (selectedSeats.length > 0) {
      // Debounce checks to avoid too frequent API calls
      const timeoutId = setTimeout(() => {
        checkSeats(selectedSeats);
      }, 500);

      return () => clearTimeout(timeoutId);
    } else {
      // Clear status when no seats selected
      setAvailabilityStatus(prev => ({
        ...prev,
        allAvailable: true,
        unavailableSeats: [],
        error: null
      }));
    }
  }, [selectedSeats, checkSeats]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPeriodicCheck();
    };
  }, [stopPeriodicCheck]);

  return {
    ...availabilityStatus,
    checkSeats,
    startPeriodicCheck,
    stopPeriodicCheck,
    isStale: lastCheckRef.current && (Date.now() - lastCheckRef.current.getTime()) > 60000 // 1 minute
  };
};
