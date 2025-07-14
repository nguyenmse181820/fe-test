import axiosInstance from '../utils/axios';

export const getBookingByReference = async (bookingReference) => {
  try {
    const response = await axiosInstance.get(`/booking-service/api/v1/bookings/${bookingReference}`);

    const data = response.data;

    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch booking details');
    }

    return data.data;
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Authentication required. Please login first.');
    }
    if (error.response?.status === 404) {
      throw new Error(`Booking "${bookingReference}" not found. Please check your booking reference or create a booking first.`);
    }
    if (error.response?.status === 503) {
      throw new Error('Booking service is currently unavailable. Please try again later.');
    }
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.error('Booking service timeout:', error);
      throw new Error('The booking service is taking too long to respond. This might be due to high server load. Please try again in a few minutes.');
    }

    console.error('Error fetching booking:', error);
    throw new Error(error.response?.data?.message || error.message || 'Unknown error occurred');
  }
};

export const getUserBookings = async (params = {}) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString
      ? `/booking-service/api/v1/bookings/user?${queryString}`
      : `/booking-service/api/v1/bookings/user`;

    const response = await axiosInstance.get(url);

    const data = response.data;

    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch user bookings');
    }

    return data.data;
  } catch (error) {
    console.error('Full error:', error);
    console.error('Error response:', error.response);

    if (error.response?.status === 401) {
      throw new Error('Authentication required. Please login first.');
    }
    if (error.response?.status === 403) {
      throw new Error('You are not authorized to view these bookings. Please check your login status.');
    }
    if (error.response?.status === 503) {
      throw new Error('Booking service is currently unavailable. Please try again later.');
    }

    console.error('Error fetching user bookings:', error);
    throw new Error(error.response?.data?.message || error.message || 'Unknown error occurred');
  }
};

export const getCheckInStatus = async (bookingReference, segmentIndex = 0) => {
  try {
    const token = localStorage.getItem('token');

    if (!token) {
      throw new Error('No authentication token found. Please login first.');
    }
    const bookingDetail = await axiosInstance.get(`/booking-service/api/v1/bookings/${bookingReference}`);

    // Get the booking details - handle case where there might be multiple segments
    const details = bookingDetail.data.data.details;

    if (!details || !details.length) {
      throw new Error('No booking details found for this reference');
    }

    // Use the specified segment, or default to first one
    const segment = details[segmentIndex] || details[0];
    const bookingDetailId = segment.bookingDetailId;
    
    const response = await axiosInstance.get(`check-in-service/api/v1/boarding-pass/check-in-status?booking_detail_id=${bookingDetailId}`);
    const data = response.data;
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch check-in status');
    }

    return data.data;
  } catch (error) {
    console.error('Error fetching check-in status:', error);
    if (error.response?.status === 401) {
      throw new Error('Authentication required. Please login first.');
    }
    if (error.response?.status === 403) {
      throw new Error('Access Denied: You do not have permission to access this resource.');
    }
    if (error.response?.status === 404) {
      throw new Error('Booking not found. Please check your booking reference.');
    }
    if (error.response?.status === 503) {
      throw new Error('Check-in service is currently unavailable. Please try again later.');
    }
    throw new Error(error.response?.data?.message || error.message || 'Unknown error occurred');
  }
};

// New function to check the health of all required microservices
export const checkMicroservicesHealth = async () => {
  const services = [
    { name: 'Gateway', endpoint: '/actuator/health' },
    { name: 'Discovery', endpoint: '/actuator/health' },
    { name: 'Config Server', endpoint: '/actuator/health' },
    // With the updated configuration, actuator endpoints are available at /booking-service/actuator/health
    { name: 'Booking Service', endpoint: '/booking-service/actuator/health' },
    { name: 'Flight Service', endpoint: '/flight-service/actuator/health' },
    // Skip user service check as it's not critical for booking process
    // { name: 'User Service', endpoint: '/user-service/actuator/health' },
    { name: 'Loyalty Service', endpoint: '/loyalty-service/actuator/health' }
  ];

  const results = [];

  for (const service of services) {
    try {
      const response = await axiosInstance.get(service.endpoint, { timeout: 5000 });
      const isUp = response.data?.status === 'UP';

      results.push({
        service: service.name,
        status: isUp ? 'UP' : 'DOWN',
        details: response.data,
        error: null
      });
    } catch (error) {
      console.error(`Health check failed for ${service.name}:`, error);
      results.push({
        service: service.name,
        status: 'DOWN',
        details: null,
        error: error.message
      });
    }
  }

  const allServicesUp = results.every(r => r.status === 'UP');
  const downServices = results.filter(r => r.status === 'DOWN').map(r => r.service);

  return {
    allServicesUp,
    downServices,
    details: results
  };
};

export const createBooking = async (bookingData) => {
  // Transform data for multi-segment booking if needed outside try block for error handler access
  const transformedData = formatMultiSegmentBookingData(bookingData);

  try {
    const token = localStorage.getItem('token');

    if (!token) {
      throw new Error('No authentication token found. Please login first.');
    }

    // Quick booking service health check
    try {
      const healthResponse = await axiosInstance.get('/booking-service/actuator/health', { timeout: 3000 });
      if (healthResponse.data?.status !== 'UP') {
        throw new Error('Booking service is currently unavailable. Please try again in a few minutes.');
      }
    } catch (healthError) {
      console.error('Booking service health check failed:', healthError);
      throw new Error('Booking service is currently unavailable. Please try again in a few minutes.');
    }

    // Add timeout to handle potential long booking creation process
    const response = await axiosInstance.post('/booking-service/api/v1/bookings', transformedData, {
      timeout: 180000 // 3 minute timeout for saga completion
    });

    const data = response.data;

    if (!data.success) {
      throw new Error(data.message || 'Failed to create booking');
    }

    return data.data;
  } catch (error) {
    console.error('Error creating booking:', error);

    // Track detailed error for analytics/debugging
    const errorDetails = {
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      responseData: error.response?.data,
      request: {
        url: '/booking-service/api/v1/bookings',
        method: 'POST'
      }
    };

    console.error('Booking error details:', JSON.stringify(errorDetails, null, 2));

    // For timeout and saga-related errors, use our specialized handler
    if (error.code === 'ECONNABORTED' ||
      error.message.includes('timeout') ||
      error.response?.status === 500) {

      // Get recovery information
      const recoveryInfo = await handleBookingTimeoutError(error, transformedData);

      // Attach recovery information to the error for the UI to use
      const enhancedError = new Error(recoveryInfo.message);
      enhancedError.recoveryInfo = recoveryInfo;

      // Log the recovery attempt
      console.info('[Booking Recovery]', recoveryInfo);

      throw enhancedError;
    }

    // Service unavailable error
    if (error.response?.status === 503) {
      // Try to determine which specific service is down
      let serviceDetail = '';

      if (error.response?.data?.message) {
        if (error.response.data.message.includes('flight')) {
          serviceDetail = ' The flight service may be unavailable.';
        } else if (error.response.data.message.includes('payment')) {
          serviceDetail = ' The payment service may be unavailable.';
        }
      }

      throw new Error(`The booking service is temporarily unavailable.${serviceDetail} This could be due to service maintenance or high traffic. Please try again in 5-10 minutes and contact support if the issue persists.`);
    }

    // Handle other specific error cases
    if (error.response?.status === 400) {
      throw new Error(`Bad request: ${error.response?.data?.message || 'The booking data contains errors. Please check all fields and try again.'}`);
    }

    throw new Error(error.response?.data?.message || error.message || 'Unknown error occurred');
  }
};

export const checkSeatAvailability = async (flightId, seatCodes) => {
  try {
    // Input validation
    if (!flightId) {
      throw new Error('Flight ID is required');
    }

    if (!seatCodes || !Array.isArray(seatCodes) || seatCodes.length === 0) {
      throw new Error('At least one seat code is required');
    }

    const params = new URLSearchParams();
    seatCodes.forEach(seat => {
      if (seat && typeof seat === 'string') {
        params.append('seatCodes', seat.trim());
      }
    });

    const response = await axiosInstance.get(
      `/flight-service/api/v1/fs/flights/${flightId}/seats/check-availability?${params.toString()}`,
      {
        timeout: 10000, // 10 second timeout
        // Remove custom headers that cause CORS issues
        // The browser will handle cache control appropriately
      }
    );

    // Normalize response format for consistent handling
    const data = response.data;
    const normalizedResponse = {
      success: true,
      timestamp: new Date().toISOString(),
      flightId,
      requestedSeats: seatCodes,
      ...data
    };

    // Handle different response formats and normalize them
    if (data.seatStatuses && Array.isArray(data.seatStatuses)) {
      // New format with detailed seat status
      const unavailableSeats = data.seatStatuses
        .filter(status => !status.available)
        .map(status => status.seatCode);
      
      const allAvailable = unavailableSeats.length === 0;

      normalizedResponse.allRequestedSeatsAvailable = allAvailable;
      normalizedResponse.unavailableSeats = unavailableSeats;
      normalizedResponse.availableSeats = data.seatStatuses
        .filter(status => status.available)
        .map(status => status.seatCode);
    } else if (data.allRequestedSeatsAvailable !== undefined) {
      // Direct boolean format
      normalizedResponse.unavailableSeats = data.allRequestedSeatsAvailable ? [] : seatCodes;
    } else if (data.data) {
      // Legacy nested format
      const legacyData = data.data;
      normalizedResponse.allRequestedSeatsAvailable = legacyData.allAvailable !== false;

      if (legacyData.availableSeats) {
        normalizedResponse.availableSeats = legacyData.availableSeats;
        normalizedResponse.unavailableSeats = seatCodes.filter(
          seat => !legacyData.availableSeats.includes(seat)
        );
      }
    } else {
      // Fallback - assume success if no explicit failure
      normalizedResponse.allRequestedSeatsAvailable = true;
      normalizedResponse.unavailableSeats = [];
      normalizedResponse.availableSeats = seatCodes;
    }

    // Additional validation
    if (normalizedResponse.allRequestedSeatsAvailable === undefined) {
      normalizedResponse.allRequestedSeatsAvailable =
        !normalizedResponse.unavailableSeats || normalizedResponse.unavailableSeats.length === 0;
    }

    return normalizedResponse;
  } catch (error) {
    console.error('[SeatAvailability] Error checking seat availability:', error);

    // Enhanced error handling with different error types
    if (error.code === 'ECONNABORTED') {
      throw new Error('Seat availability check timed out. Please try again.');
    }

    if (error.response?.status === 404) {
      throw new Error(`Flight ${flightId} not found. Please refresh and try again.`);
    }

    if (error.response?.status === 400) {
      throw new Error('Invalid seat selection. Please choose different seats.');
    }

    if (error.response?.status >= 500) {
      throw new Error('Seat availability service is temporarily unavailable. Please try again in a moment.');
    }

    throw new Error(error.response?.data?.message || error.message || 'Failed to check seat availability');
  }
};

export const getUserVouchers = async () => {
  try {
    const token = localStorage.getItem('token');

    if (!token) {
      console.warn('No authentication token found for voucher fetch');
      return [];
    }

    const response = await axiosInstance.get('/booking-service/api/v1/bookings/user/vouchers');

    const data = response.data;

    // Handle both success and graceful error responses from backend
    if (data && data.success) {
      return data.data || [];
    } else if (data && Array.isArray(data)) {
      // Handle direct array response
      return data;
    } else {
      console.warn('Voucher service warning:', data?.message || 'Unexpected response format');
      return [];
    }
  } catch (error) {
    // Handle specific HTTP error codes
    if (error.response?.status === 404) {
      console.info('Voucher service not available or user has no vouchers (404)');
    } else if (error.response?.status === 403) {
      console.warn('Access denied to voucher service (403)');
    } else if (error.response?.status >= 500) {
      console.error('Voucher service internal error:', error.message);
    } else {
      console.warn('Error fetching user vouchers:', error.message);
    }

    // Return empty array instead of throwing error to prevent UI crash
    if (error.response?.status === 401) {
      console.warn('Authentication required for vouchers');
      return [];
    }

    if (error.response?.status === 500) {
      console.warn('Voucher service temporarily unavailable');
      return [];
    }

    return [];
  }
};

// Get available seats count for a flight and fare class
export const getAvailableSeatsCount = async (flightId, fareClass) => {
  try {
    // Try the new API endpoint first
    const response = await axiosInstance.get(
      `/flight-service/api/v1/fs/flights/${flightId}/available-seats-count?fareClass=${fareClass}`
    );

    if (response.data && typeof response.data.availableSeats === 'number') {
      return response.data.availableSeats;
    } else {
      throw new Error('Invalid response format for available seats count');
    }
  } catch (error) {
    console.warn('Primary API failed, trying fallback method:', error.message);

    // Fallback: Use aircraft seat sections API (THIS SHOULD NOT BE USED NOW)
    try {
      // First get flight details to get aircraft ID
      const flightResponse = await axiosInstance.get(`/flight-service/api/v1/fs/flights/${flightId}/details`);
      const aircraftId = flightResponse.data?.aircraft?.id;

      if (!aircraftId) {
        throw new Error('Aircraft ID not found in flight details');
      }

      // Get seat sections for the aircraft
      const seatResponse = await axiosInstance.get(
        `/flight-service/api/v1/fs/aircraft/${aircraftId}/seat-sections`
      );

      if (seatResponse.data?.seatSections) {
        const sections = seatResponse.data.seatSections;
        const fareClassName = fareClass.toLowerCase();
        const availableSeats = sections[fareClassName] ? sections[fareClassName].length : 0;
        return availableSeats;
      } else {
        throw new Error('Seat sections not found');
      }
    } catch (fallbackError) {
      console.error('Fallback method also failed:', fallbackError);
      throw new Error('Unable to fetch available seats count: ' + (fallbackError.message || 'Unknown error'));
    }
  }
};

// Voucher-related functions for booking
export const getUserLoyaltyVouchers = async (userId) => {
  try {
    const response = await axiosInstance.get(`/loyalty-service/api/v1/user-vouchers/${userId}`);

    if (response.data && response.data.success) {
      return response.data.data || [];
    } else {
      throw new Error(response.data?.message || 'Failed to fetch user vouchers');
    }
  } catch (error) {
    console.error('Error fetching user vouchers:', error);
    throw error;
  }
};

export const getAvailableVouchersForBooking = async (userId, bookingAmount) => {
  try {
    const response = await axiosInstance.get(
      `/loyalty-service/api/v1/user-vouchers/${userId}/available?bookingAmount=${bookingAmount}`
    );

    if (response.data && response.data.success) {
      return response.data.data || [];
    } else {
      throw new Error(response.data?.message || 'Failed to fetch available vouchers');
    }
  } catch (error) {
    console.error('Error fetching available vouchers:', error);
    return []; // Return empty array instead of throwing to not break booking flow
  }
};

export const applyVoucherToBooking = async (userId, voucherCode, bookingAmount) => {
  try {
    const response = await axiosInstance.post(`/loyalty-service/api/v1/user-vouchers/${userId}/apply`, {
      voucherCode,
      bookingAmount
    });

    if (response.data && response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || 'Failed to apply voucher');
    }
  } catch (error) {
    console.error('Error applying voucher:', error);
    throw error;
  }
};

export const validateVoucherForBooking = async (voucherCode, bookingAmount) => {
  try {
    const response = await axiosInstance.post(`/loyalty-service/api/v1/vouchers/validate`, {
      voucherCode,
      bookingAmount
    });

    if (response.data && response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data?.message || 'Voucher validation failed');
    }
  } catch (error) {
    console.error('Error validating voucher:', error);
    throw error;
  }
};

// Get fresh flight details via booking service proxy
export const getFreshFlightDetails = async (flightId) => {
  try {
    const response = await axiosInstance.get(`/booking-service/api/v1/flights/${flightId}/fresh-details`);

    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error(response.data.message || 'Failed to fetch fresh flight details');
    }
  } catch (error) {
    console.error('Error fetching fresh flight details:', error);
    throw new Error(error.response?.data?.message || error.message || 'Failed to fetch fresh flight details');
  }
};

// Format booking data for multi-segment bookings
const formatMultiSegmentBookingData = (bookingData) => {
  // If it's already in the new format with flightIds array, ensure proper structure
  if (Array.isArray(bookingData.flightIds)) {
    // Validate and fix the selectedSeatsByFlight structure
    if (bookingData.selectedSeatsByFlight) {
      console.log('[BOOKING] Processing selectedSeatsByFlight:', bookingData.selectedSeatsByFlight);

      // Debug logging for seat data
      Object.entries(bookingData.selectedSeatsByFlight).forEach(([key, seats]) => {
        console.log(`[BOOKING] Key ${key} has ${seats?.length || 0} seat(s):`, seats);
      });

      // Important fix: Convert numeric indices to actual flight UUIDs if needed
      // This is crucial for the backend saga to process seat selections correctly
      const fixedSeatsByFlight = {};

      // Check if keys are numeric indices (which indicates we need to map to UUIDs)
      const hasNumericKeys = Object.keys(bookingData.selectedSeatsByFlight).some(key => !isNaN(parseInt(key)));

      if (hasNumericKeys && bookingData.flightIds) {
        console.log('[BOOKING] Converting numeric indices to flight UUIDs');

        // Map each numeric index to its corresponding flight UUID
        Object.entries(bookingData.selectedSeatsByFlight).forEach(([key, seats]) => {
          const index = parseInt(key);
          if (!isNaN(index) && index >= 0 && index < bookingData.flightIds.length) {
            const flightUuid = bookingData.flightIds[index];
            fixedSeatsByFlight[flightUuid] = Array.isArray(seats) ? seats : [];
            console.log(`[BOOKING] Mapped index ${key} to flightId ${flightUuid} with ${seats?.length || 0} seats`);
          } else {
            // If key is already a UUID, preserve it
            fixedSeatsByFlight[key] = Array.isArray(seats) ? seats : [];
          }
        });
      } else {
        // If keys don't appear to be indices, just ensure they're strings
        Object.entries(bookingData.selectedSeatsByFlight).forEach(([flightId, seats]) => {
          const flightIdStr = String(flightId);
          fixedSeatsByFlight[flightIdStr] = Array.isArray(seats) ? seats : [];
        });
      }

      // Update with fixed structure
      bookingData.selectedSeatsByFlight = fixedSeatsByFlight;

      console.log('[BOOKING] Finalized selectedSeatsByFlight:', bookingData.selectedSeatsByFlight);
    } else {
      console.warn('[BOOKING] Missing selectedSeatsByFlight in multi-segment booking data');
      bookingData.selectedSeatsByFlight = {};
    }
    return bookingData;
  }

  // If it's in the old format with a single flightId, transform it
  if (bookingData.flightId) {
    console.log('[BOOKING] Converting single-segment booking to multi-segment format');

    let seatCodes = [];

    // Handle different seat data formats
    if (bookingData.seatSelections && Array.isArray(bookingData.seatSelections)) {
      // If seatSelections is an array of objects with seatCode property
      if (bookingData.seatSelections[0] && typeof bookingData.seatSelections[0] === 'object') {
        seatCodes = bookingData.seatSelections.map(selection => selection.seatCode).filter(Boolean);
        console.log('[BOOKING] Extracted seat codes from seatSelections objects:', seatCodes);
      } else {
        // If seatSelections is already an array of strings
        seatCodes = bookingData.seatSelections.filter(Boolean);
        console.log('[BOOKING] Using seatSelections as direct seat codes:', seatCodes);
      }
    } else if (bookingData.selectedSeats && Array.isArray(bookingData.selectedSeats)) {
      // Alternative property name
      seatCodes = bookingData.selectedSeats.filter(Boolean);
      console.log('[BOOKING] Using selectedSeats as seat codes:', seatCodes);
    }

    const transformedData = {
      ...bookingData,
      flightIds: [bookingData.flightId], // Convert single ID to array
      selectedSeatsByFlight: {
        [bookingData.flightId]: seatCodes
      }
    };

    console.log('[BOOKING] Transformed single-segment booking data:', {
      flightId: transformedData.flightId,
      flightIds: transformedData.flightIds,
      selectedSeatsByFlight: transformedData.selectedSeatsByFlight
    });

    return transformedData;
  }

  // If neither format is detected, return original data
  console.warn('[BOOKING] Booking data format could not be determined, sending as is');
  return bookingData;
};

// Check seat availability for multiple flights
export const checkMultiFlightSeatAvailability = async (flightSeatsMap) => {
  try {
    const results = {};
    let allAvailable = true;

    // flightSeatsMap format: { flightId1: [seats], flightId2: [seats], ... }
    for (const [flightId, seatCodes] of Object.entries(flightSeatsMap)) {
      if (!seatCodes || seatCodes.length === 0) {
        results[flightId] = { success: true, allRequestedSeatsAvailable: true };
        continue;
      }

      try {
        const seatResult = await checkSeatAvailability(flightId, seatCodes);

        results[flightId] = seatResult;

        // If any flight has unavailable seats, the overall result is false
        if (!seatResult.allRequestedSeatsAvailable) {
          allAvailable = false;
        }
      } catch (err) {
        console.error(`Error checking seats for flight ${flightId}:`, err);
        results[flightId] = {
          success: false,
          error: err.message,
          allRequestedSeatsAvailable: false
        };
        allAvailable = false;
      }
    }

    return {
      success: true,
      flightResults: results,
      allFlightsAllSeatsAvailable: allAvailable
    };
  } catch (error) {
    console.error('Error in multi-flight seat availability check:', error);
    return {
      success: false,
      error: error.message,
      allFlightsAllSeatsAvailable: false
    };
  }
};

export const getAllSegmentsCheckInStatus = async (bookingReference) => {
  try {
    const token = localStorage.getItem('token');

    if (!token) {
      throw new Error('No authentication token found. Please login first.');
    }

    // First, get the booking details
    const bookingResponse = await axiosInstance.get(`/booking-service/api/v1/bookings/${bookingReference}`);
    const bookingData = bookingResponse.data.data;

    if (!bookingData || !bookingData.details || !bookingData.details.length) {
      throw new Error('No booking details found for this reference');
    }

    // Get check-in status for each segment
    const segments = bookingData.details;
    const checkInResults = [];

    for (const segment of segments) {
      try {
        const response = await axiosInstance.get(
          `/CHECK-IN-SERVICE/api/v1/boarding-pass/check-in-status?booking_detail_id=${segment.bookingDetailId}`
        );

        if (response.data.success) {
          checkInResults.push({
            bookingDetailId: segment.bookingDetailId,
            flightId: segment.flightId,
            segment: {
              from: segment.departureAirport,
              to: segment.arrivalAirport,
              departureTime: segment.departureTime
            },
            checkInStatus: response.data.data,
            error: null
          });
        } else {
          checkInResults.push({
            bookingDetailId: segment.bookingDetailId,
            flightId: segment.flightId,
            segment: {
              from: segment.departureAirport,
              to: segment.arrivalAirport,
              departureTime: segment.departureTime
            },
            checkInStatus: null,
            error: response.data.message || 'Unknown error'
          });
        }
      } catch (segmentError) {
        checkInResults.push({
          bookingDetailId: segment.bookingDetailId,
          flightId: segment.flightId,
          segment: {
            from: segment.departureAirport,
            to: segment.arrivalAirport,
            departureTime: segment.departureTime
          },
          checkInStatus: null,
          error: segmentError.message
        });
      }
    }

    return {
      success: true,
      booking: bookingData,
      segments: checkInResults
    };
  } catch (error) {
    console.error('Error fetching all segments check-in status:', error);
    throw new Error(error.response?.data?.message || error.message || 'Unknown error occurred');
  }
};

// Get fresh details for multiple flights
export const getMultiFlightFreshDetails = async (flightIds) => {
  try {
    if (!Array.isArray(flightIds) || flightIds.length === 0) {
      throw new Error('No flight IDs provided');
    }

    const results = [];
    const errors = [];

    // Process flights in parallel for efficiency
    const fetchPromises = flightIds.map(async (flightId) => {
      try {
        const details = await getFreshFlightDetails(flightId);
        return {
          flightId,
          details,
          success: true
        };
      } catch (error) {
        console.error(`Error fetching details for flight ${flightId}:`, error);
        errors.push({
          flightId,
          error: error.message
        });
        return {
          flightId,
          success: false,
          error: error.message
        };
      }
    });

    const flightDetails = await Promise.all(fetchPromises);

    return {
      success: errors.length === 0,
      flights: flightDetails,
      errorCount: errors.length
    };
  } catch (error) {
    console.error('Error in multi-flight details fetch:', error);
    return {
      success: false,
      error: error.message,
      flights: []
    };
  }
};

// ======================================
// BAGGAGE ADD-ON SERVICES
// ======================================

/**
 * Add baggage add-ons to an existing booking
 * @param {string} bookingId - The booking ID
 * @param {Array} baggageAddons - Array of baggage add-on objects
 * @returns {Promise} Response with added baggage add-ons
 */
export const addBaggageToBooking = async (bookingId, baggageAddons) => {
  try {
    const response = await axiosInstance.post(
      `/booking-service/api/v1/baggage-addons/booking/${bookingId}`,
      baggageAddons
    );

    const data = response.data;

    if (!data.success) {
      throw new Error(data.message || 'Failed to add baggage to booking');
    }

    return data.data;
  } catch (error) {
    console.error('Error adding baggage to booking:', error);

    if (error.response?.status === 404) {
      throw new Error('Booking not found. Please check your booking reference.');
    }
    if (error.response?.status === 400) {
      throw new Error(error.response?.data?.message || 'Invalid baggage add-on data');
    }
    if (error.response?.status === 401) {
      throw new Error('Authentication required. Please login first.');
    }

    throw new Error(error.response?.data?.message || error.message || 'Failed to add baggage');
  }
};

/**
 * Get baggage add-ons for a booking
 * @param {string} bookingId - The booking ID
 * @returns {Promise} Response with baggage add-ons
 */
export const getBaggageAddons = async (bookingId) => {
  try {
    const response = await axiosInstance.get(
      `/booking-service/api/v1/baggage-addons/booking/${bookingId}`
    );

    const data = response.data;

    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch baggage add-ons');
    }

    return data.data;
  } catch (error) {
    console.error('Error fetching baggage add-ons:', error);

    if (error.response?.status === 404) {
      throw new Error('Booking not found. Please check your booking reference.');
    }
    if (error.response?.status === 401) {
      throw new Error('Authentication required. Please login first.');
    }

    throw new Error(error.response?.data?.message || error.message || 'Failed to fetch baggage add-ons');
  }
};

export const getUserBookingStatistics = async () => {
  try {
    const token = localStorage.getItem('token');

    if (!token) {
      throw new Error('No authentication token found. Please login first.');
    }

    const response = await axiosInstance.get('/booking-service/api/v1/bookings/user/statistics');

    const data = response.data;

    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch booking statistics');
    }

    return data.data;
  } catch (error) {
    console.error('Error fetching booking statistics:', error);

    if (error.response?.status === 401) {
      throw new Error('Authentication required. Please login first.');
    }
    if (error.response?.status === 403) {
      throw new Error('You are not authorized to view these statistics. Please check your login status.');
    }
    if (error.response?.status === 503) {
      throw new Error('Booking service is currently unavailable. Please try again later.');
    }

    throw new Error(error.response?.data?.message || error.message || 'Unknown error occurred');
  }
};

// Simplifies request retry with exponential backoff
const retryRequest = async (requestFn, maxRetries = 3, baseDelay = 1000, options = {}) => {
  let lastError = null;
  const { retryOn5xx = true, retryOnTimeout = true, retryIdempotentOnly = true } = options;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      console.warn(`Request attempt ${attempt + 1} failed:`, error.message);
      lastError = error;

      // Don't retry for client errors (4xx)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }

      // Check if we should retry on server errors
      if (!retryOn5xx && error.response?.status >= 500) {
        throw error;
      }

      // Check if we should retry on timeout
      if (!retryOnTimeout && (error.code === 'ECONNABORTED' || error.message.includes('timeout'))) {
        throw error;
      }

      // Don't retry POST requests for booking creation (non-idempotent) unless explicitly allowed
      if (retryIdempotentOnly &&
        error.config?.method?.toLowerCase() === 'post' &&
        error.config?.url?.includes('/bookings') &&
        !error.config?.headers?.['X-Idempotency-Key']) {
        console.warn('Not retrying non-idempotent booking creation request');
        throw error;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) * (0.75 + Math.random() * 0.5);
      console.info(`Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // If we exhaust all retries, wrap the error with a more user-friendly message
  if (lastError.response?.status >= 500) {
    const wrappedError = new Error(`The service is currently experiencing issues after ${maxRetries} attempts. Please try again later.`);
    wrappedError.originalError = lastError;
    throw wrappedError;
  }

  throw lastError;
};

/**
 * Attempts to find any bookings that may have been created despite errors
 * Useful after timeouts or server errors to help users recover
 * @param {Object} bookingData - The original booking data that was submitted
 * @param {string} [errorType] - Optional error type for analytics
 * @returns {Promise<Array>} - Array of potential matching bookings found
 */
export const findPotentialCreatedBookings = async (bookingData, errorType = 'unknown') => {
  try {
    // Wait a moment to allow any in-progress saga to complete or update the database
    await new Promise(resolve => setTimeout(resolve, 3000));

    // We'll try to find bookings by user that were created in the last hour
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    // Format the timestamp for API query
    const timestamp = oneHourAgo.toISOString();

    // Check recent bookings by user
    const params = {
      createdAfter: timestamp,
      status: 'ALL',
      limit: 5
    };

    // For analytics, track what we're trying to recover
    console.info(`[Recovery] Searching for potentially created bookings after ${errorType} error`);

    // Use retry mechanism since this is a recovery operation
    const recentBookings = await retryRequest(
      () => getUserBookings(params),
      3,
      2000,
      { retryOn5xx: true, retryOnTimeout: true }
    );

    if (!recentBookings || recentBookings.length === 0) {
      return [];
    }

    // Look for potential matches based on flight information
    let potentialMatches = [];

    // Extract flight IDs from the original booking request for matching
    const requestedFlightIds = Array.isArray(bookingData.flightIds) ?
      bookingData.flightIds :
      (bookingData.flightId ? [bookingData.flightId] : []);

    if (requestedFlightIds.length === 0) {
      return [];
    }

    // Examine each booking to find potential matches
    potentialMatches = recentBookings.filter(booking => {
      // Skip bookings that are clearly not related (e.g. much older)
      const createdAt = new Date(booking.createdAt);
      const fiveMinutesAgo = new Date();
      fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

      if (createdAt < fiveMinutesAgo) {
        return false;
      }

      // Check if flight IDs match between the booking details and our request
      if (booking.details && Array.isArray(booking.details)) {
        const bookingFlightIds = booking.details.map(detail => detail.flightId);

        // Check if at least one requested flight ID appears in this booking
        return requestedFlightIds.some(id => bookingFlightIds.includes(id));
      }

      return false;
    });

    // Sort potential matches with newest first
    potentialMatches.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return potentialMatches;
  } catch (error) {
    console.warn('Error while searching for potential bookings:', error);
    // Don't throw - this is a recovery mechanism
    return [];
  }
};

/**
 * Checks if the error might be related to a saga timeout and helps recover
 * @param {Error} error - The error from a booking creation attempt
 * @param {Object} bookingData - The booking data that was submitted
 * @returns {Promise<Object>} Recovery information and suggested actions
 */
export const handleBookingTimeoutError = async (error, bookingData) => {
  // Prepare default response structure
  const result = {
    isTimeout: false,
    hasSagaIssue: false,
    potentialBookings: [],
    recoveryAvailable: false,
    actionRequired: false,
    suggestedAction: 'wait',
    message: 'Please try again later.',
    referenceFound: null
  };

  // Determine if this is a timeout or saga-related error
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorStatus = error?.response?.status;
  const errorData = error?.response?.data;

  // Check for timeout conditions
  result.isTimeout =
    error?.code === 'ECONNABORTED' ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('timed out') ||
    (errorStatus === 500 && errorData?.message?.includes('timeout'));

  // Check for saga-related issues
  result.hasSagaIssue =
    errorMessage.includes('saga') ||
    (errorData?.message && errorData.message.includes('saga')) ||
    errorMessage.includes('optimistic') ||
    errorMessage.includes('concurrent');

  // Extract booking reference if present in error message
  const refMatch = error?.message?.match(/BKG-[A-Z0-9]+/) ||
    errorData?.message?.match(/BKG-[A-Z0-9]+/);

  if (refMatch) {
    result.referenceFound = refMatch[0];
  }

  // If this appears to be a timeout or saga issue, try to recover
  if (result.isTimeout || result.hasSagaIssue) {
    try {
      // Find any bookings that might have been created despite the error
      const errorType = result.isTimeout ? 'timeout' : 'saga';
      const potentialBookings = await findPotentialCreatedBookings(bookingData, errorType);

      result.potentialBookings = potentialBookings;
      result.recoveryAvailable = potentialBookings.length > 0;

      if (result.recoveryAvailable) {
        result.suggestedAction = 'check_bookings';
        result.message = 'We found bookings that may match your request. Please check "My Bookings" to avoid duplicate bookings.';
      } else if (result.referenceFound) {
        result.suggestedAction = 'check_reference';
        result.message = `Your booking (${result.referenceFound}) may still be processing. Please check "My Bookings" in a few minutes.`;
      } else {
        result.suggestedAction = 'wait_retry';
        result.message = 'The booking process timed out. Please wait a few minutes and check "My Bookings" before trying again.';
      }

      result.actionRequired = true;
    } catch (recoveryError) {
      console.error('Error during booking recovery:', recoveryError);
    }
  }

  return result;
};