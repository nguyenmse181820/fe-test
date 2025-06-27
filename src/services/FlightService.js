import axiosInstance from '../utils/axios';

class FlightService {
  static async getAirports() {
    try {
      const response = await axiosInstance.get('/flight-service/api/v1/airports');
      
      if (response.data.statusCode === 200) {
        return response.data.data.content || response.data.data || [];
      }
      
      throw new Error('Failed to fetch airports');
    } catch (error) {
      console.error('FlightService - getAirports error:', error);
      throw new Error('Unable to fetch airports. Please try again.');
    }
  }

  static async getFlights() {
    try {
      const response = await axiosInstance.get('/flight-service/api/v1/fs/flights');
      
      if (response.data.statusCode === 200) {
        return response.data.data.content || response.data.data || [];
      }
      
      throw new Error('Failed to fetch flights');
    } catch (error) {
      console.error('FlightService - getFlights error:', error);
      throw new Error('Unable to fetch flights. Please try again.');
    }
  }
  static async getFlightFares(flightId) {
    try {
      // Try multiple possible API endpoints for flight fares
      const possibleEndpoints = [
        `/flight-service/api/v1/fs/flights/${flightId}/fares`,
        `/flight-service/api/v1/fs/flight-fares/${flightId}`,
        `/flight-service/api/v1/fs/fares?flightId=${flightId}`
      ];

      for (const endpoint of possibleEndpoints) {
        try {
          console.log(`Trying flight fares endpoint: ${endpoint}`);
          const response = await axiosInstance.get(endpoint);
          
          if (response.data.statusCode === 200 && response.data.data) {
            console.log(`Flight fares found at ${endpoint}:`, response.data.data);
            return response.data.data;
          }
        } catch (endpointError) {
          console.warn(`Endpoint ${endpoint} failed:`, endpointError.message);
          continue;
        }
      }
      
      throw new Error('No flight fares endpoint found');
    } catch (error) {
      console.error('FlightService - getFlightFares error:', error);
      throw new Error('Unable to fetch flight fares. Please try again.');
    }
  }

  static async getFlightData() {
    try {
      const [airports, flights] = await Promise.all([
        this.getAirports(),
        this.getFlights()
      ]);

      return { airports, flights };
    } catch (error) {
      console.error('FlightService - getFlightData error:', error);
      throw new Error('Unable to fetch flight data. Please try again.');
    }
  }

  static async getFlightWithFares(flightId) {
    try {
      const [flights, fares] = await Promise.all([
        this.getFlights(),
        this.getFlightFares(flightId)
      ]);

      const flight = flights.find(f => f.id === flightId || f.flightId === flightId);
      if (!flight) {
        throw new Error('Flight not found');
      }

      // Combine flight data with fare information
      const flightWithFares = {
        ...flight,
        fares: fares,
        // Create price object similar to mock data structure
        price: fares.reduce((acc, fare) => {
          acc[fare.fareName.toLowerCase()] = fare.maxPrice || fare.minPrice || 0;
          return acc;
        }, {}),
        basePrice: fares.find(f => f.fareName.toLowerCase() === 'economy')?.minPrice || 0
      };

      return flightWithFares;
    } catch (error) {
      console.error('FlightService - getFlightWithFares error:', error);
      throw error;
    }
  }
  static async getFlightDetails(flightId) {
    try {
      console.log('Getting flight details for flightId:', flightId);
      const response = await axiosInstance.get(`/flight-service/api/v1/fs/flights/${flightId}/details`);
      
      if (response.data) {
        console.log('Flight details received:', response.data);
        return response.data;
      }
      
      throw new Error('Flight details not found');
    } catch (error) {
      console.error('FlightService - getFlightDetails error:', error);
      throw error;
    }
  }

  static async getFreshFlightDetails(flightId) {
    try {
      const response = await axiosInstance.get(`/booking-service/api/v1/flights/${flightId}/fresh-details`);
      
      console.log('Fresh flight details response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error getting fresh flight details:', error);
      throw new Error(error.response?.data?.message || error.message || 'Failed to get fresh flight details');
    }
  }
}

export default FlightService;