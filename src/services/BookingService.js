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
    
    const response = await axiosInstance.get(`/CHECK-IN-SERVICE/api/v1/boarding-pass/check-in-status?booking_detail_id=${bookingDetailId}`);
    const data = response.data;
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch check-in status');
    }

    return data.data;
  } catch (error) {
    console.error('Error fetching check-in status:', error);
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
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found. Please login first.');
    }

    console.log('Creating booking with data:', JSON.stringify(bookingData, null, 2));
    
    // Transform data for multi-segment booking if needed
    const transformedData = formatMultiSegmentBookingData(bookingData);
    
    // Perform targeted health check before proceeding
    try {
      // Only check booking service health which is critical - ignore other service health issues
      const bookingServiceResponse = await axiosInstance.get('/booking-service/actuator/health', { 
        timeout: 5000 
      });
      
      if (bookingServiceResponse.data?.status !== 'UP') {
        console.error('Booking service is not healthy');
        throw new Error('Booking service is currently unavailable. Please try again in a few minutes.');
      }
      
      // Continue with full health check but don't block on non-critical services
      const healthStatus = await checkMicroservicesHealth();
      if (!healthStatus.allServicesUp) {
        console.warn('Some services may be down, but proceeding with booking attempt:', healthStatus.downServices);
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
    
    // Connection timeout error
    if (error.code === 'ECONNABORTED') {
      // Save booking data to localStorage for potential retry
      try {
        const pendingBookings = JSON.parse(localStorage.getItem('pendingBookings') || '[]');
        pendingBookings.push({
          data: transformedData,
          timestamp: new Date().toISOString(),
          error: 'TIMEOUT'
        });
        localStorage.setItem('pendingBookings', JSON.stringify(pendingBookings));
        console.log('Saved booking data for potential retry');
      } catch (e) {
        console.error('Failed to save pending booking:', e);
      }
      
      throw new Error('Booking request timed out. Please check your bookings page in a few minutes to see if your booking was created. If not, you can try again.');
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
    const params = new URLSearchParams();
    seatCodes.forEach(seat => params.append('seatCodes', seat));
    
    console.log(`Checking availability for flight ${flightId}, seats: ${seatCodes.join(', ')}`);
    
    const response = await axiosInstance.get(
      `/flight-service/api/v1/fs/flights/${flightId}/seats/check-availability?${params.toString()}`
    );

    console.log('Seat availability response:', response.data);
    
    // Handle different response formats - normalize to a consistent structure
    const data = response.data;
    
    // If success flag is explicitly set to false
    if (data.success === false) {
      return data; // Return as is, the calling code will handle this
    }
    
    // If there's a seatStatuses array (newer API format)
    if (data.seatStatuses && Array.isArray(data.seatStatuses)) {
      // Check if all seats are available
      const allAvailable = data.seatStatuses.every(status => status.available);
      
      // If allRequestedSeatsAvailable is missing, add it for consistency
      if (data.allRequestedSeatsAvailable === undefined) {
        data.allRequestedSeatsAvailable = allAvailable;
      }
      
      // Keep success flag for consistency
      if (data.success === undefined) {
        data.success = true;
      }
    }
    
    // For older response formats with data.availableSeats, keep as is
    
    return data;
  } catch (error) {
    console.error('Error checking seat availability:', error);
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
      console.log(`[API] Available seats for ${fareClass}: ${response.data.availableSeats}`);
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
        console.log(`[FALLBACK] Available seats for ${fareClass}: ${availableSeats}`);
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

// Get fresh flight details via booking service proxy
export const getFreshFlightDetails = async (flightId) => {
  try {
    const response = await axiosInstance.get(`/booking-service/api/v1/flights/${flightId}/fresh-details`);
    
    if (response.data.success) {
      console.log('Fresh flight details fetched:', response.data.data);
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
  // If it's already in the new format with flightIds array, return as is
  if (Array.isArray(bookingData.flightIds)) {
    console.log('Booking data already in multi-segment format');
    return bookingData;
  }
  
  // If it's in the old format with a single flightId, transform it
  if (bookingData.flightId) {
    console.log('Converting single-segment to multi-segment format');
    
    const transformedData = {
      ...bookingData,
      flightIds: [bookingData.flightId], // Convert single ID to array
      selectedSeatsByFlight: {
        "0": bookingData.seatSelections?.map(selection => selection.seatCode) || []
      }
    };
    
    // Remove old properties
    delete transformedData.flightId;
    delete transformedData.seatSelections;
    
    console.log('Transformed booking data:', transformedData);
    return transformedData;
  }
  
  // If neither format is detected, return original data
  console.warn('Booking data format could not be determined, sending as is');
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
        console.log(`No seats to check for flight ${flightId}, skipping`);
        results[flightId] = { success: true, allRequestedSeatsAvailable: true };
        continue;
      }
      
      try {
        console.log(`Checking availability for flight ${flightId}, seats: ${seatCodes.join(', ')}`);
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