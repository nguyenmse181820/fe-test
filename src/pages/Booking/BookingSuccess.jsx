import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import { getBookingByReference } from '../../services/BookingService';
import { getFreshFlightDetails } from '../../services/FlightService';

const BookingSuccess = () => {
  const { bookingReference } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshingFlight, setRefreshingFlight] = useState(false);
  const [flightDetails, setFlightDetails] = useState(null);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        setLoading(true);
        const result = await getBookingByReference(bookingReference);
        setBooking(result);
        
        // Also get fresh flight details
        if (result?.details?.[0]?.flightId) {
          await refreshFlightDetails(result.details[0].flightId);
        }
      } catch (err) {
        setError('Failed to load booking details');
        console.error('Error fetching booking:', err);
      } finally {
        setLoading(false);
      }
    };

    if (bookingReference) {
      fetchBookingDetails();
    }
  }, [bookingReference]);

  const refreshFlightDetails = async (flightId) => {
    try {
      setRefreshingFlight(true);
      const result = await getFreshFlightDetails(flightId);
      if (result.success) {
        setFlightDetails(result.data);
        toast.success('Flight details refreshed successfully');
      }
    } catch (err) {
      console.error('Error refreshing flight details:', err);
      toast.warning('Could not refresh flight details');
    } finally {
      setRefreshingFlight(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Success Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Booking Confirmed!
            </h1>
            <p className="text-gray-600 mb-4">
              Your booking has been successfully created and payment processed.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 inline-block">
              <p className="text-sm text-gray-600">Booking Reference</p>
              <p className="text-2xl font-bold text-blue-600">{bookingReference}</p>
            </div>
          </div>
        </div>

        {/* Booking Details */}
        {booking && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Booking Details</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                booking.status === 'PAID' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {booking.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Flight Information</h3>
                {booking.flightSummaries?.[0] && (
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Flight:</span> {booking.flightSummaries[0].flightCode}</p>
                    <p><span className="font-medium">Route:</span> {booking.flightSummaries[0].origin} → {booking.flightSummaries[0].destination}</p>
                    <p><span className="font-medium">Departure:</span> {new Date(booking.flightSummaries[0].departureTime).toLocaleString()}</p>
                    <p><span className="font-medium">Arrival:</span> {new Date(booking.flightSummaries[0].arrivalTime).toLocaleString()}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">Payment Information</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Total Amount:</span> {booking.totalAmount?.toLocaleString()} VND</p>
                  <p><span className="font-medium">Payment Status:</span> 
                    <span className="ml-1 text-green-600 font-medium">Completed</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Passengers */}
            {booking.details && booking.details.length > 0 && (
              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-2">Passengers</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {booking.details.map((detail, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3">
                      <p className="font-medium">{detail.passenger.firstName} {detail.passenger.lastName}</p>
                      <p className="text-sm text-gray-600">Seat: {detail.selectedSeatCode || 'To be assigned'}</p>
                      <p className="text-sm text-gray-600">Fare: {detail.selectedFareName}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Flight Status Refresh */}
        {flightDetails && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Updated Flight Status</h2>
              <button
                onClick={() => refreshFlightDetails(booking?.details?.[0]?.flightId)}
                disabled={refreshingFlight}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${refreshingFlight ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{flightDetails.totalSeats}</div>
                <div className="text-sm text-gray-600">Total Seats</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{flightDetails.remainingSeats}</div>
                <div className="text-sm text-gray-600">Remaining Seats</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{flightDetails.totalSeats - flightDetails.remainingSeats}</div>
                <div className="text-sm text-gray-600">Occupied Seats</div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">What's Next?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <Clock className="h-6 w-6 text-blue-500 mb-2" />
              <h3 className="font-medium mb-1">Check-in</h3>
              <p className="text-sm text-gray-600 mb-3">
                Online check-in will be available 24 hours before departure.
              </p>
              <button
                onClick={() => navigate('/check-in')}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Go to Check-in
              </button>
            </div>
            
            <div className="border rounded-lg p-4">
              <CheckCircle className="h-6 w-6 text-green-500 mb-2" />
              <h3 className="font-medium mb-1">Manage Booking</h3>
              <p className="text-sm text-gray-600 mb-3">
                View, modify, or cancel your booking anytime.
              </p>
              <button
                onClick={() => navigate(`/booking-details/${bookingReference}`)}
                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingSuccess;
