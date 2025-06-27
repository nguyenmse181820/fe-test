import axios from 'axios';
import axiosInstance from '../utils/axios';

const API_GATEWAY = import.meta.env.VITE_API_GATEWAY;

export const getBookingByReference = async (bookingReference) => {
  try {
    const token = localStorage.getItem('token');
    
    const response = await axios.get(`${API_GATEWAY}/booking-service/api/v1/bookings/${bookingReference}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
    });

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
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found. Please login first.');
    }
    
    const queryString = new URLSearchParams(params).toString();
    const url = queryString 
      ? `${API_GATEWAY}/booking-service/api/v1/bookings/user?${queryString}`
      : `${API_GATEWAY}/booking-service/api/v1/bookings/user`;
    
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

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

export const getCheckInStatus = async (bookingReference) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found. Please login first.');
    }
    const bookingDetail = await axiosInstance.get(`/booking-service/api/v1/bookings/${bookingReference}`);
    const bookingDetailId = bookingDetail.data.data.details[0].bookingDetailId;
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

export const createBooking = async (bookingData) => {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found. Please login first.');
    }

    const response = await axiosInstance.post('/booking-service/api/v1/bookings', bookingData);

    const data = response.data;
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to create booking');
    }

    return data.data;
  } catch (error) {
    console.error('Error creating booking:', error);
    throw new Error(error.response?.data?.message || error.message || 'Unknown error occurred');
  }
};

export const checkSeatAvailability = async (flightId, seatCodes) => {
  try {
    const params = new URLSearchParams();
    seatCodes.forEach(seat => params.append('seatCodes', seat));
    
    const response = await axiosInstance.get(
      `/flight-service/api/v1/fs/flights/${flightId}/seats/check-availability?${params.toString()}`
    );

    console.log('Seat availability response:', response.data);
    return response.data;
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
    if (data.success) {
      return data.data || [];
    } else {
      console.warn('Voucher service warning:', data.message);
      return [];
    }
  } catch (error) {
    console.warn('Error fetching user vouchers:', error.message);
    
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