import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin, Plane, Users, CheckCircle, AlertCircle, Info, Download, Edit3, X, CreditCard, User, Loader2, FileText, Receipt, RefreshCw, Ban, MessageCircle, HelpCircle, RotateCcw } from 'lucide-react';
import { getBookingByReference } from './../../services/BookingService';
import { processVNPayPayment, validatePaymentData } from './../../services/Vnpay.js';
import { downloadTicket } from './../../services/TicketService';
import CreateRefundRequest from '../../components/CreateRefundRequest';
import RefundStatusTimeline from '../../components/RefundStatusTimeline';
import RescheduleModal from '../../components/RescheduleModal';
import RescheduleService from '../../services/RescheduleService';
import axiosInstance from '../../utils/axios';

const BOOKING_STATUSES = {
  DRAFT_SELECTION: 'draft_selection',
  PENDING_PAYMENT: 'pending_payment',
  PAID: 'paid',
  PAYMENT_FAILED: 'payment_failed',
  CANCELLED_NO_PAYMENT: 'cancelled_no_payment',
  CANCELLATION_REQUESTED: 'cancellation_requested',
  CANCELLED: 'cancelled',
  PARTIALLY_CANCELLED: 'partially_cancelled',
  COMPLETED: 'completed'
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const formatDateTime = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatTime = (dateString) => {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatPrice = (amount, currency = 'VND') => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

const getStatusColor = (status) => {
  const colors = {
    [BOOKING_STATUSES.DRAFT_SELECTION]: 'text-blue-600 bg-blue-50 border-blue-200',
    [BOOKING_STATUSES.PENDING_PAYMENT]: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    [BOOKING_STATUSES.PAID]: 'text-green-600 bg-green-50 border-green-200',
    [BOOKING_STATUSES.PAYMENT_FAILED]: 'text-red-600 bg-red-50 border-red-200',
    [BOOKING_STATUSES.CANCELLED_NO_PAYMENT]: 'text-orange-600 bg-orange-50 border-orange-200',
    [BOOKING_STATUSES.CANCELLATION_REQUESTED]: 'text-purple-600 bg-purple-50 border-purple-200',
    [BOOKING_STATUSES.CANCELLED]: 'text-red-600 bg-red-50 border-red-200',
    [BOOKING_STATUSES.PARTIALLY_CANCELLED]: 'text-amber-600 bg-amber-50 border-amber-200',
    [BOOKING_STATUSES.COMPLETED]: 'text-gray-600 bg-gray-50 border-gray-200',
    'refunded': 'text-purple-600 bg-purple-50 border-purple-200'
  };
  return colors[status] || 'text-gray-600 bg-gray-50 border-gray-200';
};

const getStatusIcon = (status) => {
  const icons = {
    [BOOKING_STATUSES.DRAFT_SELECTION]: <Edit3 className="w-4 h-4" />,
    [BOOKING_STATUSES.PENDING_PAYMENT]: <Clock className="w-4 h-4" />,
    [BOOKING_STATUSES.PAID]: <CheckCircle className="w-4 h-4" />,
    [BOOKING_STATUSES.PAYMENT_FAILED]: <X className="w-4 h-4" />,
    [BOOKING_STATUSES.CANCELLED_NO_PAYMENT]: <AlertCircle className="w-4 h-4" />,
    [BOOKING_STATUSES.CANCELLATION_REQUESTED]: <Clock className="w-4 h-4" />,
    [BOOKING_STATUSES.CANCELLED]: <X className="w-4 h-4" />,
    [BOOKING_STATUSES.PARTIALLY_CANCELLED]: <AlertCircle className="w-4 h-4" />,
    [BOOKING_STATUSES.COMPLETED]: <CheckCircle className="w-4 h-4" />,
    'refunded': <RefreshCw className="w-4 h-4" />
  };
  return icons[status] || <Info className="w-4 h-4" />;
};

const getStatusDisplayName = (status) => {
  const names = {
    [BOOKING_STATUSES.DRAFT_SELECTION]: 'Draft Selection',
    [BOOKING_STATUSES.PENDING_PAYMENT]: 'Pending Payment',
    [BOOKING_STATUSES.PAID]: 'Paid',
    [BOOKING_STATUSES.PAYMENT_FAILED]: 'Payment Failed',
    [BOOKING_STATUSES.CANCELLED_NO_PAYMENT]: 'Cancelled (No Payment)',
    [BOOKING_STATUSES.CANCELLATION_REQUESTED]: 'Cancellation Requested',
    [BOOKING_STATUSES.CANCELLED]: 'Cancelled',
    [BOOKING_STATUSES.PARTIALLY_CANCELLED]: 'Partially Cancelled',
    [BOOKING_STATUSES.COMPLETED]: 'Completed',
    'REFUNDED': 'Refunded'
  };
  return names[status] || status;
};

const getAirportName = (code) => {
  const airports = {
    'SGN': 'Tan Son Nhat Airport',
    'HAN': 'Noi Bai International Airport',
    'DAD': 'Da Nang International Airport',
    'CXR': 'Nha Trang Airport',
    'PQC': 'Phu Quoc International Airport'
  };
  return airports[code] || code;
};

const getCityName = (code) => {
  const cities = {
    'SGN': 'Ho Chi Minh City',
    'HAN': 'Hanoi',
    'DAD': 'Da Nang',
    'CXR': 'Nha Trang',
    'PQC': 'Phu Quoc'
  };
  return cities[code] || code;
};

const FlightRoute = ({ detail }) => {
  const departureTime = formatTime(detail.departureTime);
  const arrivalTime = formatTime(detail.arrivalTime);
  const departureDate = formatDate(detail.departureTime);
  const arrivalDate = formatDate(detail.arrivalTime);

  const depTime = new Date(detail.departureTime);
  const arrTime = new Date(detail.arrivalTime);
  const duration = Math.abs(arrTime - depTime) / (1000 * 60);
  const hours = Math.floor(duration / 60);
  const minutes = Math.floor(duration % 60);
  const durationStr = `${hours}h ${minutes}m`;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-3">
          <div className="text-4xl font-bold text-gray-900 mb-1">{departureTime}</div>
          <div className="text-sm text-gray-600 mb-2">{departureDate}</div>
          <div className="text-xl font-semibold text-gray-900 mb-1">{getCityName(detail.originAirportCode)}</div>
          <div className="text-sm text-gray-500">{detail.originAirportCode} • {getAirportName(detail.originAirportCode)}</div>
        </div>

        <div className="lg:col-span-6 flex flex-col items-center">
          <div className="text-sm text-gray-500 mb-4 px-3 py-1 bg-white rounded-full">{durationStr}</div>
          <div className="w-full flex items-center">
            <div className="w-5 h-5 bg-blue-600 rounded-full"></div>
            <div className="flex-1 h-1 bg-gradient-to-r from-blue-600 to-blue-300 mx-2"></div>
            <Plane className="w-8 h-8 text-blue-600 mx-4" />
            <div className="flex-1 h-1 bg-gradient-to-r from-blue-300 to-blue-600 mx-2"></div>
            <div className="w-5 h-5 bg-blue-600 rounded-full"></div>
          </div>
          <div className="mt-4 px-4 py-2 bg-white rounded-lg flex items-center space-x-2">
            <span className="font-semibold text-gray-900">{detail.flightCode}</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600">Direct flight</span>
          </div>
        </div>

        <div className="lg:col-span-3 text-right">
          <div className="text-4xl font-bold text-gray-900 mb-1">{arrivalTime}</div>
          <div className="text-sm text-gray-600 mb-2">{arrivalDate}</div>
          <div className="text-xl font-semibold text-gray-900 mb-1">{getCityName(detail.destinationAirportCode)}</div>
          <div className="text-sm text-gray-500">{detail.destinationAirportCode} • {getAirportName(detail.destinationAirportCode)}</div>
        </div>
      </div>
    </div>
  );
};

const PassengerCard = ({ detail, index }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <User className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h4 className="font-semibold text-gray-900">Passenger {index + 1}</h4>
          <p className="text-sm text-gray-500">Seat {detail.seatCode}</p>
        </div>
      </div>
      <div className="text-right">
        <div className="text-lg font-bold text-blue-600">{detail.seatCode}</div>
        <div className="text-sm text-gray-500">Seat</div>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div>
        <div className="text-sm text-gray-600 mb-1">Full Name</div>
        <div className="font-medium text-gray-900">
          {detail.passenger.title} {detail.passenger.firstName} {detail.passenger.lastName}
        </div>
      </div>
      <div>
        <div className="text-sm text-gray-600 mb-1">Date of Birth</div>
        <div className="font-medium text-gray-900">{formatDate(detail.passenger.dateOfBirth)}</div>
      </div>
      <div>
        <div className="text-sm text-gray-600 mb-1">Gender</div>
        <div className="font-medium text-gray-900">{detail.passenger.gender}</div>
      </div>
      <div>
        <div className="text-sm text-gray-600 mb-1">Nationality</div>
        <div className="font-medium text-gray-900">{detail.passenger.nationality}</div>
      </div>
    </div>

    <div className="mt-4 pt-4 border-t border-gray-100">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-600">Ticket Price</span>
        <span className="font-bold text-gray-900">{formatPrice(detail.price)}</span>
      </div>
    </div>
  </div>
);

const ActionButton = ({ icon: Icon, children, variant = 'secondary', onClick, disabled = false, loading = false }) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg',
    success: 'bg-green-600 text-white hover:bg-green-700 shadow-lg',
    secondary: 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-md',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-lg'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center space-x-2 px-6 py-3 rounded-xl transition-all font-medium ${variants[variant]} ${(disabled || loading) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
      <span>{loading ? 'Processing...' : children}</span>
    </button>
  );
};

const LoadingState = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
    <div className="text-center">
      <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading booking details...</h3>
      <p className="text-gray-600">Please wait while we fetch your booking information.</p>
    </div>
  </div>
);

const ErrorState = ({ error, onRetry, onGoBack }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
    <div className="text-center max-w-md mx-auto p-8">
      <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Error loading booking</h3>
      <p className="text-gray-600 mb-6">{error}</p>
      <div className="flex space-x-3 justify-center">
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Try Again
        </button>
        <button
          onClick={onGoBack}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
        >
          Go Back
        </button>
      </div>
    </div>
  </div>
);

const getUniquePassengerCount = (details) => {
  if (!details || details.length === 0) return 0;

  // Create a Set to store unique passenger identifiers
  const uniquePassengers = new Set();

  details.forEach(detail => {
    if (detail.passenger) {
      // Create a unique identifier for each passenger using multiple fields
      const passengerKey = `${detail.passenger.firstName}_${detail.passenger.lastName}_${detail.passenger.dateOfBirth}`;
      uniquePassengers.add(passengerKey);
    }
  });

  return uniquePassengers.size;
};

const renderFlightInformation = (details) => {
  if (!details || details.length === 0) return null;

  // Group details by flight
  const flightGroups = {};
  details.forEach(detail => {
    const flightKey = detail.flightId;
    if (!flightGroups[flightKey]) {
      flightGroups[flightKey] = detail;
    }
  });

  const flights = Object.values(flightGroups);

  return (
    <div className="space-y-6">
      {flights.map((detail, index) => (
        <div key={detail.flightId}>
          {flights.length > 1 && (
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Flight {index + 1} of {flights.length}
            </h3>
          )}
          <FlightRoute detail={detail} />
        </div>
      ))}
    </div>
  );
};

const renderPassengerCards = (details) => {
  if (!details || details.length === 0) return null;

  // Create a map to store unique passengers with their flight information
  const passengerMap = new Map();

  details.forEach(detail => {
    if (detail.passenger) {
      const passengerKey = `${detail.passenger.firstName}_${detail.passenger.lastName}_${detail.passenger.dateOfBirth}`;

      if (!passengerMap.has(passengerKey)) {
        passengerMap.set(passengerKey, {
          passenger: detail.passenger,
          flights: []
        });
      }

      // Add flight information for this passenger
      passengerMap.get(passengerKey).flights.push({
        flightId: detail.flightId,
        flightCode: detail.flightCode,
        seatCode: detail.seatCode,
        price: detail.price,
        originAirportCode: detail.originAirportCode,
        destinationAirportCode: detail.destinationAirportCode,
        departureTime: detail.departureTime,
        arrivalTime: detail.arrivalTime
      });
    }
  });

  // Convert map to array and render passenger cards
  return Array.from(passengerMap.entries()).map(([passengerKey, passengerData], index) => (
    <div key={passengerKey} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">Passenger {index + 1}</h4>
            <p className="text-sm text-gray-500">
              {passengerData.flights.length} {passengerData.flights.length === 1 ? 'Flight' : 'Flights'}
            </p>
          </div>
        </div>
        {/* Show seat codes prominently for quick reference */}
        <div className="text-right">
          <div className="text-sm text-gray-600 mb-1">Assigned Seats</div>
          <div className="flex flex-col space-y-1">
            {passengerData.flights.map((flight, flightIndex) => (
              <div key={flight.flightId} className="flex items-center space-x-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-semibold">
                  {flight.seatCode}
                </span>
                {passengerData.flights.length > 1 && (
                  <span className="text-xs text-gray-500">Flight {flightIndex + 1}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-sm text-gray-600 mb-1">Full Name</div>
          <div className="font-medium text-gray-900">
            {passengerData.passenger.title} {passengerData.passenger.firstName} {passengerData.passenger.lastName}
          </div>
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Date of Birth</div>
          <div className="font-medium text-gray-900">{formatDate(passengerData.passenger.dateOfBirth)}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Gender</div>
          <div className="font-medium text-gray-900">{passengerData.passenger.gender}</div>
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Nationality</div>
          <div className="font-medium text-gray-900">{passengerData.passenger.nationality}</div>
        </div>
      </div>

      {/* Flight Details for this passenger */}
      <div className="space-y-3">
        {passengerData.flights.map((flight, flightIndex) => (
          <div key={flight.flightId} className="pt-3 border-t border-gray-100">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="text-sm text-gray-600 mb-1">
                  {passengerData.flights.length > 1 ? `Flight ${flightIndex + 1}` : 'Flight'}
                </div>
                <div className="font-medium text-gray-900 mb-1 flex items-center space-x-3">
                  <span>{flight.flightCode}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">✈</span>
                    </div>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm font-semibold">
                      Seat {flight.seatCode}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {getCityName(flight.originAirportCode)} → {getCityName(flight.destinationAirportCode)}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-blue-600">{formatPrice(flight.price)}</div>
                <div className="text-sm text-gray-500">Seat Price</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total for this passenger</span>
          <span className="font-bold text-gray-900">
            {formatPrice(passengerData.flights.reduce((sum, flight) => sum + flight.price, 0))}
          </span>
        </div>
      </div>
    </div>
  ));
};

const getBaggageTypeDisplayName = (type) => {
  const names = {
    'EXTRA_BAG': 'Extra Baggage',
    'OVERWEIGHT': 'Overweight Baggage',
    'PRIORITY': 'Priority Baggage'
  };
  return names[type] || type;
};

const getBaggageTypeIcon = (type) => {
  // Using appropriate icons for different baggage types
  switch (type) {
    case 'EXTRA_BAG':
      return '🎒'; // Backpack icon for extra bag
    case 'OVERWEIGHT':
      return '📦'; // Package icon for overweight
    case 'PRIORITY':
      return '⭐'; // Star icon for priority
    default:
      return '🧳'; // Default luggage icon
  }
};

const getBaggageDescription = (addon) => {
  switch (addon.type) {
    case 'PRIORITY':
      return `Priority Handling (${addon.baggageWeight}kg additional allowance)`;
    case 'EXTRA_BAG':
      return `Extra Baggage (${addon.baggageWeight}kg)`;
    case 'OVERWEIGHT':
      return `Overweight Allowance (${addon.baggageWeight}kg)`;
    default:
      return `${addon.baggageWeight}kg`;
  }
};

const renderBaggageAddons = (baggageAddons, details) => {
  if (!baggageAddons || baggageAddons.length === 0) {
    return (
      <div className="text-center py-8">
        <span className="text-6xl mb-4 block">🧳</span>
        <p className="text-gray-500 text-lg">No baggage add-ons purchased for this booking.</p>
        <p className="text-gray-400 text-sm mt-2">Standard baggage allowance applies.</p>
      </div>
    );
  }

  // Group baggage add-ons by passenger and flight for better organization
  const groupedAddons = {};

  baggageAddons.forEach(addon => {
    const key = `passenger-${addon.passengerIndex}`;
    if (!groupedAddons[key]) {
      groupedAddons[key] = {};
    }

    const flightKey = addon.flightId || 'all-flights';
    if (!groupedAddons[key][flightKey]) {
      groupedAddons[key][flightKey] = [];
    }

    groupedAddons[key][flightKey].push(addon);
  });

  // Get passenger information from details
  const getPassengerInfo = (passengerIndex) => {
    // For single-segment bookings, passenger index should match the order in details
    // For multi-segment bookings, we need to find unique passengers
    const uniquePassengers = [];
    const seenPassengers = new Set();

    details.forEach(detail => {
      if (detail.passenger) {
        const passengerKey = `${detail.passenger.firstName}_${detail.passenger.lastName}_${detail.passenger.dateOfBirth}`;
        if (!seenPassengers.has(passengerKey)) {
          seenPassengers.add(passengerKey);
          uniquePassengers.push(detail.passenger);
        }
      }
    });

    return uniquePassengers[passengerIndex] || { firstName: 'Unknown', lastName: 'Passenger' };
  };

  // Get flight information
  const getFlightInfo = (flightId) => {
    const detail = details.find(d => d.flightId === flightId);
    return detail || { flightCode: 'Unknown Flight', originAirportCode: '---', destinationAirportCode: '---' };
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedAddons).map(([passengerKey, flightAddons]) => {
        const passengerIndex = parseInt(passengerKey.split('-')[1]);
        const passenger = getPassengerInfo(passengerIndex);

        return (
          <div key={passengerKey} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">
                  {passenger.title} {passenger.firstName} {passenger.lastName}
                </h4>
                <p className="text-sm text-gray-500">Passenger {passengerIndex + 1}</p>
              </div>
            </div>

            <div className="space-y-4">
              {Object.entries(flightAddons).map(([flightKey, addons]) => {
                const flightInfo = flightKey !== 'all-flights' ? getFlightInfo(flightKey) : null;

                // For single-segment bookings where flightId is null, show general booking info
                const isSingleSegmentBooking = flightKey === 'all-flights';

                return (
                  <div key={flightKey} className="border-l-4 border-orange-300 pl-4">
                    {flightInfo && !isSingleSegmentBooking && (
                      <div className="mb-3">
                        <div className="text-sm text-gray-600 mb-1">Flight Segment</div>
                        <div className="font-medium text-gray-900 flex items-center space-x-2">
                          <span>{flightInfo.flightCode}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-sm text-gray-600">
                            {getCityName(flightInfo.originAirportCode)} → {getCityName(flightInfo.destinationAirportCode)}
                          </span>
                        </div>
                      </div>
                    )}

                    {isSingleSegmentBooking && details.length > 0 && (
                      <div className="mb-3">
                        <div className="text-sm text-gray-600 mb-1">Applies to Booking</div>
                        <div className="font-medium text-gray-900 flex items-center space-x-2">
                          <span>{details[0].flightCode}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-sm text-gray-600">
                            {getCityName(details[0].originAirportCode)} → {getCityName(details[0].destinationAirportCode)}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {addons.map((addon, index) => (
                        <div key={addon.id || index} className="bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-2xl">{getBaggageTypeIcon(addon.type)}</span>
                              <div>
                                <div className="font-semibold text-gray-900 text-sm">
                                  {getBaggageTypeDisplayName(addon.type)}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {getBaggageDescription(addon)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-orange-600">
                                {formatPrice(addon.price)}
                              </div>
                            </div>
                          </div>

                          <div className="text-xs text-gray-500 mt-2">
                            <div>Purchased: {formatDateTime(addon.purchaseTime)}</div>
                            {addon.isPostBooking && (
                              <div className="text-orange-600 font-medium mt-1">• Added after booking</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total for this passenger's baggage */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Baggage add-ons total</span>
                <span className="font-bold text-orange-600">
                  {formatPrice(
                    Object.values(flightAddons).flat().reduce((sum, addon) => sum + addon.price, 0)
                  )}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {/* Grand total for all baggage add-ons */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl p-6">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-lg font-semibold mb-1">Total Baggage Add-ons</h4>
            <p className="text-orange-100 text-sm">
              {baggageAddons.length} {baggageAddons.length === 1 ? 'add-on' : 'add-ons'} purchased
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              {formatPrice(baggageAddons.reduce((sum, addon) => sum + addon.price, 0))}
            </div>
            <div className="text-orange-100 text-sm">Total Amount</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const BookingDetails = () => {
  const { bookingReference } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundRequests, setRefundRequests] = useState([]);
  const [refundRequestsLoading, setRefundRequestsLoading] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [downloadingTicket, setDownloadingTicket] = useState(false);
  const [rescheduleHistory, setRescheduleHistory] = useState([]);
  const [rescheduleHistoryLoading, setRescheduleHistoryLoading] = useState(false);
  const [rescheduleModal, setRescheduleModal] = useState({
    isOpen: false,
    selectedSegment: null
  });
  const [checkingRescheduleEligibility, setCheckingRescheduleEligibility] = useState(false);
  const [rescheduleConfirmation, setRescheduleConfirmation] = useState({
    isOpen: false,
    eligibleSegments: [],
    bookingDetail: null
  });

  const fetchBookingDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const bookingData = await getBookingByReference(bookingReference);
      setBooking(bookingData);
    } catch (err) {
      setError(err.message || 'Failed to fetch booking details');
    } finally {
      setLoading(false);
    }
  };

  const fetchRefundRequests = async () => {
    if (!bookingReference) return;

    try {
      setRefundRequestsLoading(true);
      const response = await axiosInstance.get(`/booking-service/api/refund-requests/booking/${bookingReference}`);
      setRefundRequests(response.data || []);
    } catch (error) {
      console.error('Error fetching refund requests:', error);
      // Don't show error for this since it's not critical - might be empty
      setRefundRequests([]);
    } finally {
      setRefundRequestsLoading(false);
    }
  };

  const fetchRescheduleHistory = async () => {
    if (!bookingReference) return;

    try {
      setRescheduleHistoryLoading(true);
      const history = await RescheduleService.getRescheduleHistory(bookingReference);
      setRescheduleHistory(history);
    } catch (error) {
      console.error('Error fetching reschedule history:', error);
      // Don't show error for this since it's not critical - might be empty
      setRescheduleHistory([]);
    } finally {
      setRescheduleHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (bookingReference) {
      fetchBookingDetails();
      fetchRefundRequests();
      fetchRescheduleHistory();
    }
  }, [bookingReference]);

  const handleRetry = () => {
    fetchBookingDetails();
  };

  const handleGoBack = () => {
    navigate('/booking-overview');
  };

  const handleReschedule = async (bookingDetail = null) => {
    // If no specific booking detail is provided and there are multiple details,
    // find eligible ones
    let targetDetail = bookingDetail;

    if (!targetDetail && details && details.length > 0) {
      // Filter details that are eligible for rescheduling (time-based check)
      const eligibleDetails = details.filter(detail => {
        const departureTime = new Date(detail.departureTime);
        const now = new Date();
        const hoursUntilDeparture = (departureTime - now) / (1000 * 60 * 60);
        return hoursUntilDeparture > 24;
      });

      if (eligibleDetails.length === 0) {
        alert('No booking details are eligible for rescheduling. Flights must be more than 24 hours away from departure.');
        return;
      }

      // For now, use the first eligible detail
      // In a more advanced UI, you could show a selection modal
      targetDetail = eligibleDetails[0];
    }

    if (!targetDetail) {
      alert('No booking detail selected for rescheduling');
      return;
    }

    // Check if this booking detail has already been rescheduled
    const hasBeenRescheduled = rescheduleHistory.some(history =>
      history.bookingDetailId === targetDetail.bookingDetailId
    );

    if (hasBeenRescheduled) {
      alert('This booking detail has already been rescheduled once. Each booking detail can only be rescheduled one time.');
      return;
    }

    // Check if segment is eligible for rescheduling (time-based check)
    const departureTime = new Date(targetDetail.departureTime);
    const now = new Date();
    const hoursUntilDeparture = (departureTime - now) / (1000 * 60 * 60);

    if (hoursUntilDeparture <= 24) {
      alert('Cannot reschedule flights within 24 hours of departure');
      return;
    }

    setCheckingRescheduleEligibility(true);
    try {
      // Check API eligibility
      const isEligible = await RescheduleService.canRescheduleBookingDetail(targetDetail.bookingDetailId);

      if (!isEligible) {
        alert('This booking detail is not eligible for rescheduling');
        return;
      }

      // Show confirmation dialog before opening reschedule modal
      setRescheduleConfirmation({
        isOpen: true,
        eligibleSegments: [targetDetail],
        bookingDetail: targetDetail
      });
    } catch (error) {
      console.error('Error checking reschedule eligibility:', error);
      alert('Unable to check reschedule eligibility. Please try again later.');
    } finally {
      setCheckingRescheduleEligibility(false);
    }
  };

  const handleRescheduleSuccess = () => {
    // Refresh booking data and reschedule history after successful reschedule
    fetchBookingDetails();
    fetchRescheduleHistory();
    setRescheduleModal({
      isOpen: false,
      selectedSegment: null
    });
  };

  const closeRescheduleModal = () => {
    setRescheduleModal({
      isOpen: false,
      selectedSegment: null
    });
  };

  const handleCompletePayment = async () => {
    if (!booking) return;

    setPaymentLoading(true);
    setPaymentError(null);

    try {
      console.log('[PAYMENT] Starting payment process for booking:', booking.bookingInfo);

      const paymentData = {
        bookingReference: booking.bookingInfo.bookingReference,
        amount: booking.bookingInfo.totalAmount,
        paymentMethod: 'VNPAY_BANKTRANSFER', // Always use VNPAY_BANKTRANSFER as our default payment method
        clientIpAddress: '127.0.0.1' // Add client IP to help with backend processing
      };

      console.log('[PAYMENT] Payment data prepared:', paymentData);

      // Validate payment data
      validatePaymentData(paymentData);

      // Process VNPay payment - this will redirect to VNPay
      console.log('[PAYMENT] Calling processVNPayPayment...');
      await processVNPayPayment(paymentData);

    } catch (err) {
      console.error('Payment processing failed:', err);
      setPaymentError(err.message || 'Failed to process payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleRefundSuccess = (refundRequestId) => {
    fetchBookingDetails();
    fetchRefundRequests();
    setShowRefundModal(false);
  };

  // Helper function to check if refund is eligible
  const isRefundEligible = () => {
    if (!booking || !booking.bookingInfo || booking.bookingInfo.status !== 'PAID') return false;

    // Check if there's already a pending or approved refund request
    const hasPendingRefund = refundRequests.some(request =>
      ['PENDING', 'APPROVED'].includes(request.status)
    );

    return !hasPendingRefund;
  };

  // Helper function to check if there are any pending refund requests
  const hasPendingRefund = () => {
    return refundRequests.some(request =>
      ['PENDING', 'APPROVED'].includes(request.status)
    );
  };

  // Helper function to check if refund has been completed
  const hasCompletedRefund = () => {
    return refundRequests.some(request =>
      request.status === 'COMPLETED'
    );
  };

  // Helper function to check if booking was cancelled due to refund completion
  const isCancelledDueToRefund = () => {
    // Only show as refund completed if there's actually a completed refund
    return hasCompletedRefund();
  };

  // Helper function to check if booking was cancelled due to no payment (should NOT show refund completed)
  const isCancelledNoPayment = () => {
    return bookingInfo.status === 'CANCELLED_NO_PAYMENT';
  };

  // Helper function to check if booking was cancelled for other reasons (not refund, not no payment)
  const isCancelledDueToOtherReasons = () => {
    return bookingInfo.status === 'CANCELLED' && !hasCompletedRefund();
  };

  // Helper function to check if any booking detail can still be rescheduled
  const canAnyDetailBeRescheduled = () => {
    if (!details || details.length === 0) return false;

    return details.some(detail => {
      // Check if this detail has already been rescheduled
      const hasBeenRescheduled = rescheduleHistory.some(history =>
        history.bookingDetailId === detail.bookingDetailId
      );

      if (hasBeenRescheduled) return false;

      // Check time eligibility
      const departureTime = new Date(detail.departureTime);
      const now = new Date();
      const hoursUntilDeparture = (departureTime - now) / (1000 * 60 * 60);

      return hoursUntilDeparture > 24;
    });
  };

  // Helper function to get the status of the most recent refund request
  const getRefundStatus = () => {
    if (refundRequests.length === 0) return null;

    // Sort by creation date (most recent first) and get the latest
    const sortedRequests = [...refundRequests].sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    return sortedRequests[0];
  };

  // Handle ticket download
  const handleDownloadTicket = async (type = 'ticket') => {
    if (downloadingTicket) return;

    setDownloadingTicket(true);
    try {
      await downloadTicket(booking, type);
    } catch (error) {
      console.error('Error downloading ticket:', error);
      // Error is handled silently - user will notice download didn't start
    } finally {
      setDownloadingTicket(false);
    }
  };

  const confirmReschedule = () => {
    // Close confirmation dialog and open reschedule modal
    setRescheduleConfirmation({
      isOpen: false,
      eligibleSegments: [],
      bookingDetail: null
    });

    // Open reschedule modal with the selected booking detail
    setRescheduleModal({
      isOpen: true,
      selectedSegment: rescheduleConfirmation.bookingDetail
    });
  };

  const cancelReschedule = () => {
    setRescheduleConfirmation({
      isOpen: false,
      eligibleSegments: [],
      bookingDetail: null
    });
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={handleRetry} onGoBack={handleGoBack} />;
  if (!booking) return <ErrorState error="Booking not found" onGoBack={handleGoBack} />;

  const { bookingInfo, details, payments } = booking;
  const payment = payments?.[0];

  // Determine the display status - override "PAID" if refund is completed
  const displayStatus = hasCompletedRefund() && bookingInfo.status === 'PAID' ? 'REFUNDED' : bookingInfo.status;
  const statusKey = displayStatus.toLowerCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleGoBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back to My Bookings</span>
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Booking Details</h1>
              <p className="text-lg text-gray-600">Complete information for booking {bookingInfo.bookingReference}</p>
            </div>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className={`px-6 py-3 rounded-2xl text-base font-semibold border flex items-center space-x-3 shadow-lg ${getStatusColor(statusKey)}`}>
                  {getStatusIcon(statusKey)}
                  <span>{getStatusDisplayName(statusKey)}</span>
                </div>
                {hasPendingRefund() && (
                  <div className="px-4 py-2 bg-orange-100 text-orange-800 rounded-xl border border-orange-200 flex items-center space-x-2">
                    <RefreshCw className="w-4 h-4" />
                    <span className="text-sm font-medium">Refund Pending</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Error Alert */}
        {paymentError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-700 font-medium">Payment Error: {paymentError}</p>
            </div>
          </div>
        )}

        {/* Booking Summary Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden mb-8">
          <div className={`px-8 py-6 text-white ${hasPendingRefund()
            ? 'bg-gradient-to-r from-orange-500 to-red-500'
            : isCancelledDueToRefund()
              ? 'bg-gradient-to-r from-red-500 to-red-600'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600'
            }`}>
            {(hasPendingRefund() || isCancelledDueToRefund()) && !isCancelledNoPayment() && (
              <div className="mb-4 p-3 bg-white/20 rounded-xl">
                <div className="flex items-center space-x-2">
                  <RefreshCw className="w-5 h-5" />
                  <span className="font-semibold">
                    {isCancelledDueToRefund() ? 'Refund Completed' : 'Refund Request Active'}
                  </span>
                </div>
                <p className="text-sm mt-1 opacity-90">
                  {hasCompletedRefund() || bookingInfo.status === 'CANCELLED'
                    ? 'Your refund has been processed and completed'
                    : 'Booking services temporarily restricted while processing refund'
                  }
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className={`text-sm mb-1 ${hasPendingRefund() ? 'text-orange-100' : 'text-blue-100'}`}>Booking Reference</div>
                <div className="font-mono font-bold text-2xl">{bookingInfo.bookingReference}</div>
              </div>
              <div>
                <div className={`text-sm mb-1 ${hasPendingRefund() ? 'text-orange-100' : 'text-blue-100'}`}>Total Amount</div>
                <div className="text-3xl font-bold">{formatPrice(bookingInfo.totalAmount)}</div>
              </div>
              <div>
                <div className={`text-sm mb-1 ${hasPendingRefund() ? 'text-orange-100' : 'text-blue-100'}`}>Passengers</div>
                <div className="text-2xl font-bold">{getUniquePassengerCount(details)} {getUniquePassengerCount(details) === 1 ? 'Passenger' : 'Passengers'}</div>
              </div>
            </div>
          </div>

          {/* Payment Deadline Warning */}
          {(bookingInfo.status === 'PENDING_PAYMENT' || bookingInfo.status === 'PAYMENT_FAILED') && bookingInfo.paymentDeadline && (
            <div className="px-8 py-4 bg-red-50 border-b border-red-100">
              <div className="flex items-center space-x-3 text-red-700">
                <Clock className="w-6 h-6" />
                <span className="font-semibold text-lg">Payment deadline: {formatDateTime(bookingInfo.paymentDeadline)}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="px-8 py-6">
            {/* Show refund status message if there's a pending refund */}
            {hasPendingRefund() && (
              <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                <div className="flex items-start space-x-3">
                  <RefreshCw className="w-6 h-6 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-orange-800 mb-2">Refund Request Submitted</h4>
                    <p className="text-orange-700 text-sm mb-3">
                      Your refund request is being processed. Check-in and ticket downloads are temporarily unavailable while we review your request.
                    </p>
                    {(() => {
                      const latestRefund = getRefundStatus();
                      return latestRefund && (
                        <div className="text-sm text-orange-600">
                          <span className="font-medium">Status: </span>
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${latestRefund.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            latestRefund.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                              latestRefund.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                            {latestRefund.status}
                          </span>
                          {latestRefund.status === 'PENDING' && (
                            <span className="ml-2 text-orange-600">• Expected processing time: 3-5 business days</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-4">
              {bookingInfo.status === 'DRAFT_SELECTION' && (
                <ActionButton icon={Edit3} variant="primary">
                  Continue Booking
                </ActionButton>
              )}

              {(bookingInfo.status === 'PENDING_PAYMENT' || bookingInfo.status === 'PAYMENT_FAILED') && (
                <ActionButton
                  icon={CreditCard}
                  variant="success"
                  onClick={handleCompletePayment}
                  loading={paymentLoading}
                  disabled={paymentLoading}
                >
                  Complete Payment
                </ActionButton>
              )}

              {/* Show appropriate actions for completed refunds */}
              {isCancelledDueToRefund() && !isCancelledNoPayment() && (
                <>
                  <ActionButton icon={MessageCircle} variant="secondary" onClick={() => setShowSupportModal(true)}>
                    Contact Support
                  </ActionButton>
                  <ActionButton icon={HelpCircle} variant="secondary" onClick={() => setShowPolicyModal(true)}>
                    Refund Policy
                  </ActionButton>
                </>
              )}

              {bookingInfo.status === 'PAID' && !hasPendingRefund() && !hasCompletedRefund() && (
                <>
                  <ActionButton icon={CheckCircle} variant="success">
                    Check In
                  </ActionButton>
                  <ActionButton
                    icon={downloadingTicket ? Loader2 : Download}
                    variant="primary"
                    onClick={() => handleDownloadTicket('ticket')}
                    disabled={downloadingTicket}
                  >
                    {downloadingTicket ? 'Generating...' : 'Download Tickets'}
                  </ActionButton>

                  {/* Reschedule button - only show if there are booking details that can still be rescheduled */}
                  {canAnyDetailBeRescheduled() && (
                    <div className="relative group">
                      <ActionButton
                        icon={checkingRescheduleEligibility ? Loader2 : RotateCcw}
                        variant="secondary"
                        onClick={() => {
                          // Find first eligible detail that hasn't been rescheduled
                          const eligibleDetail = details.find(detail => {
                            const hasBeenRescheduled = rescheduleHistory.some(history =>
                              history.bookingDetailId === detail.bookingDetailId
                            );

                            if (hasBeenRescheduled) return false;

                            const departureTime = new Date(detail.departureTime);
                            const now = new Date();
                            const hoursUntilDeparture = (departureTime - now) / (1000 * 60 * 60);

                            return hoursUntilDeparture > 24;
                          });

                          if (eligibleDetail) {
                            handleReschedule(eligibleDetail);
                          }
                        }}
                        disabled={checkingRescheduleEligibility}
                      >
                        {checkingRescheduleEligibility ? 'Checking...' : 'Reschedule Flight'}
                      </ActionButton>
                      {details && details.length > 1 && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                          Reschedules first eligible flight (each can only be rescheduled once)
                        </div>
                      )}
                    </div>
                  )}

                  {isRefundEligible() ? (
                    <ActionButton
                      icon={RefreshCw}
                      variant="danger"
                      onClick={() => setShowRefundModal(true)}
                    >
                      Request Refund
                    </ActionButton>
                  ) : (
                    <div className="relative group">
                      <ActionButton
                        icon={RefreshCw}
                        variant="secondary"
                        disabled={true}
                      >
                        Request Refund
                      </ActionButton>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                        {(() => {
                          const activeRefund = refundRequests.find(request =>
                            ['PENDING', 'APPROVED', 'COMPLETED'].includes(request.status)
                          );
                          if (activeRefund) {
                            if (activeRefund.status === 'PENDING') {
                              return 'Refund request already pending';
                            } else if (activeRefund.status === 'APPROVED') {
                              return 'Refund already approved';
                            } else if (activeRefund.status === 'COMPLETED') {
                              return 'Refund already completed';
                            }
                          }
                          return 'Refund not available for this booking';
                        })()}
                      </div>
                    </div>
                  )}
                </>
              )}

              {bookingInfo.status === 'PAID' && hasPendingRefund() && !hasCompletedRefund() && (
                <>
                  <ActionButton icon={Ban} variant="secondary" disabled>
                    Check In Unavailable
                  </ActionButton>
                  <ActionButton icon={Ban} variant="secondary" disabled>
                    Download Unavailable
                  </ActionButton>
                  <ActionButton
                    icon={MessageCircle}
                    variant="secondary"
                    onClick={() => setShowSupportModal(true)}
                  >
                    Contact Support
                  </ActionButton>
                  <ActionButton
                    icon={HelpCircle}
                    variant="secondary"
                    onClick={() => setShowPolicyModal(true)}
                  >
                    Refund Policy
                  </ActionButton>
                </>
              )}

              {bookingInfo.status === 'COMPLETED' && (
                <ActionButton
                  icon={downloadingTicket ? Loader2 : Download}
                  variant="primary"
                  onClick={() => handleDownloadTicket('ticket')}
                  disabled={downloadingTicket}
                >
                  {downloadingTicket ? 'Generating...' : 'Download Tickets'}
                </ActionButton>
              )}

              {bookingInfo.status === 'CANCELLATION_REQUESTED' && (
                <ActionButton icon={Clock} variant="secondary" disabled>
                  Processing Cancellation
                </ActionButton>
              )}
            </div>
          </div>
        </div>

        {/* Flight Information */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
            <Plane className="w-8 h-8 mr-3 text-blue-600" />
            Flight Information
          </h2>
          {renderFlightInformation(details)}
        </div>

        {/* Passengers & Seats */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
            <Users className="w-8 h-8 mr-3 text-blue-600" />
            Passengers & Seats ({getUniquePassengerCount(details)})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {renderPassengerCards(details)}
          </div>
        </div>

        {/* Baggage Add-ons */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
            <span className="text-3xl mr-3">🧳</span>
            Baggage Add-ons
          </h2>
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            {renderBaggageAddons(booking.baggageAddons, details)}
          </div>
        </div>

        {/* Booking & Payment Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Booking Information */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <FileText className="w-6 h-6 mr-3 text-blue-600" />
              Booking Information
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600 mb-2">Booking Type</div>
                  <div className="font-semibold text-gray-900 text-lg">{bookingInfo.type}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-2">Status</div>
                  <div className="font-semibold text-gray-900 text-lg">{details[0].status}</div>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-2">Flight ID</div>
                <div className="font-mono text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{details[0].flightId}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600 mb-2">Created At</div>
                  <div className="font-medium text-gray-900">{formatDateTime(bookingInfo.createdAt)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-2">Last Updated</div>
                  <div className="font-medium text-gray-900">{formatDateTime(bookingInfo.updatedAt)}</div>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-600 mb-2">Booking Date</div>
                <div className="font-semibold text-gray-900 text-lg">{formatDate(bookingInfo.bookingDate)}</div>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Receipt className="w-6 h-6 mr-3 text-blue-600" />
              Payment Information
            </h3>
            <div className="space-y-6">
              {payment ? (
                <>
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Payment Method</div>
                    <div className="font-semibold text-gray-900 text-lg">{payment.paymentMethod}</div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-600 mb-2">Transaction ID</div>
                    <div className="font-mono text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{payment.transactionId}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-600 mb-2">Payment Date</div>
                      <div className="font-medium text-gray-900">{formatDate(payment.paymentDate)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-2">Status</div>
                      <div className={`inline-flex px-4 py-2 rounded-xl text-sm font-semibold ${payment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {payment.status}
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <div className="flex justify-between items-center">
                      <span className="text-lg text-gray-600">Total Paid:</span>
                      <span className="text-2xl font-bold text-green-600">{formatPrice(bookingInfo.totalAmount)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No payment information available</p>
                  {(bookingInfo.status === 'PENDING_PAYMENT' || bookingInfo.status === 'PAYMENT_FAILED') && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <p className="text-blue-800 font-medium">Payment is required to complete this booking</p>
                      <p className="text-blue-600 text-sm mt-1">Click "Complete Payment" above to proceed with VNPay</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Refund Requests Section */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <RefreshCw className="w-6 h-6 mr-3 text-blue-600" />
            Refund Requests
          </h3>

          {refundRequestsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              <span className="text-gray-600">Loading refund requests...</span>
            </div>
          ) : (
            <>
              {refundRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Info className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No refund requests found for this booking.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {refundRequests.map((request) => (
                    <RefundStatusTimeline
                      key={request.refundRequestId}
                      request={request}
                      isAdmin={false}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Reschedule History Section */}
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <RotateCcw className="w-6 h-6 mr-3 text-green-600" />
            Reschedule History
          </h3>

          {rescheduleHistoryLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              <span className="text-gray-600">Loading reschedule history...</span>
            </div>
          ) : (
            <>
              {rescheduleHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Info className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No reschedule history found for this booking.</p>
                  <p className="text-gray-400 text-sm mt-2">Each booking detail can be rescheduled only once. If you reschedule any flights, the history will appear here.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-blue-800 text-sm">
                      <strong>Note:</strong> Each booking detail can only be rescheduled once. The following shows your reschedule history:
                    </p>
                  </div>
                  {rescheduleHistory.map((historyItem) => (
                    <div key={historyItem.id} className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-200">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">Flight Rescheduled</h4>
                          <p className="text-sm text-gray-600">
                            <strong>Date:</strong> {formatDateTime(historyItem.rescheduleDate)}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Passenger:</strong> {historyItem.passengerName}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">
                            {formatPrice(historyItem.priceDifference)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {historyItem.priceDifference > 0 ? 'Additional charge' :
                              historyItem.priceDifference < 0 ? 'Price reduction' : 'No price change'}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-lg p-4 border border-red-200">
                          <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                            <X className="w-4 h-4 mr-2 text-red-500" />
                            Previous Flight
                          </h5>
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600">
                              <strong>Seat:</strong> {historyItem.oldSeatCode}
                            </p>
                            <p className="text-sm text-gray-600">
                              <strong>Price:</strong> {formatPrice(historyItem.oldPrice)}
                            </p>
                            <p className="text-sm text-gray-600">
                              <strong>Flight:</strong> {historyItem.flightCode}
                            </p>
                            <p className="text-sm text-gray-600">
                              <strong>Route:</strong> {historyItem.originAirportCode} → {historyItem.destinationAirportCode}
                            </p>
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-4 border border-green-200">
                          <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                            <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                            New Flight
                          </h5>
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600">
                              <strong>Seat:</strong> {historyItem.newSeatCode}
                            </p>
                            <p className="text-sm text-gray-600">
                              <strong>Price:</strong> {formatPrice(historyItem.newPrice)}
                            </p>
                            <p className="text-sm text-gray-600">
                              <strong>Flight:</strong> {historyItem.flightCode}
                            </p>
                            <p className="text-sm text-gray-600">
                              <strong>Route:</strong> {historyItem.originAirportCode} → {historyItem.destinationAirportCode}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Refund Request Modal */}
      {showRefundModal && (
        <CreateRefundRequest
          show={showRefundModal}
          onHide={() => setShowRefundModal(false)}
          bookingData={bookingInfo}
          onSuccess={handleRefundSuccess}
        />
      )}

      {/* Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <MessageCircle className="w-6 h-6 mr-3 text-blue-600" />
                  Contact Support
                </h3>
                <button
                  onClick={() => setShowSupportModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-gray-600">
                  Need help with your booking or refund request? Our support team is here to assist you.
                </p>

                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    <MessageCircle className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="font-semibold text-blue-900">Phone Support</div>
                      <div className="text-blue-700">1-800-BOEING (1-800-263-464)</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                    <MessageCircle className="w-5 h-5 text-green-600" />
                    <div>
                      <div className="font-semibold text-green-900">Email Support</div>
                      <div className="text-green-700">support@boeing-airlines.com</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                    <MessageCircle className="w-5 h-5 text-purple-600" />
                    <div>
                      <div className="font-semibold text-purple-900">Live Chat</div>
                      <div className="text-purple-700">Available 24/7 on our website</div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-3">
                    When contacting support, please have your booking reference ready: <strong>{bookingInfo?.bookingReference}</strong>
                  </p>

                  <button
                    onClick={() => setShowSupportModal(false)}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Got It, Thanks!
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Policy Modal */}
      {showPolicyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <HelpCircle className="w-6 h-6 mr-3 text-blue-600" />
                  Refund Policy
                </h3>
                <button
                  onClick={() => setShowPolicyModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-2">Boeing Airlines Refund Policy</h4>
                  <p className="text-blue-800 text-sm">
                    Your booking reference: <strong>{bookingInfo?.bookingReference}</strong>
                  </p>
                  <h5 className="font-semibold text-gray-900 mb-2">Refund Amounts</h5>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Cancellation 24-48 hours before: 70% refund</li>
                    <li>Cancellation 48+ hours before: 95% refund</li>
                    <li>Administrative fee may apply based on ticket type</li>
                  </ul>
                </div>

                <div className="bg-amber-50 p-3 rounded-lg">
                  <p className="text-amber-800 text-sm">
                    <strong>Note:</strong> Once a refund request is submitted, check-in and ticket modifications are temporarily disabled until the request is processed.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowPolicyModal(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowPolicyModal(false);
                      setShowSupportModal(true);
                    }}
                    className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Contact Support
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModal.isOpen && (
        <RescheduleModal
          isOpen={rescheduleModal.isOpen}
          onClose={closeRescheduleModal}
          bookingDetail={rescheduleModal.selectedSegment}
          bookingReference={bookingReference}
          onRescheduleSuccess={handleRescheduleSuccess}
        />
      )}
    </div>
  );
};

export default BookingDetails;