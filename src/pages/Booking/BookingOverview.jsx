import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Plane, Users, CheckCircle, AlertCircle, Info, Download, Edit3, X, ArrowRight, Wifi, Coffee, Monitor, CreditCard, User, Search, Loader2, Eye } from 'lucide-react';
import { getUserBookings, getCheckInStatus } from './../../services/BookingService';

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

const BOOKING_TYPES = {
  STANDARD: 'Standard',
  PREMIUM: 'Premium',
  BUSINESS: 'Business'
};

const getStatusPriority = (status) => {
  const priorities = {
    'PAYMENT_FAILED': 1,
    'PENDING_PAYMENT': 2,
    'DRAFT_SELECTION': 3,
    'CANCELLATION_REQUESTED': 4,
    'PAID': 5,
    'COMPLETED': 6,
    'CANCELLED': 7,
    'CANCELLED_NO_PAYMENT': 8,
    'PARTIALLY_CANCELLED': 9
  };
  return priorities[status] || 10;
};

const sortBookingsByPriority = (bookingsToSort) => {
  return [...bookingsToSort].sort((a, b) => {
    const priorityA = getStatusPriority(a.status);
    const priorityB = getStatusPriority(b.status);

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    return new Date(b.bookingDate) - new Date(a.bookingDate);
  });
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
    [BOOKING_STATUSES.COMPLETED]: 'text-gray-600 bg-gray-50 border-gray-200'
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
    [BOOKING_STATUSES.COMPLETED]: <CheckCircle className="w-4 h-4" />
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
    [BOOKING_STATUSES.COMPLETED]: 'Completed'
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

const StatCard = ({ icon: Icon, label, value, color = 'text-gray-900' }) => (
  <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">{label}</p>
        <p className={`text-xl font-semibold ${color}`}>{value}</p>
      </div>
      <Icon className={`w-8 h-8 ${color.replace('text-', 'text-').replace('-900', '-500')}`} />
    </div>
  </div>
);

const FilterTab = ({ isActive, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${isActive
      ? 'bg-blue-600 text-white shadow-md'
      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
      }`}
  >
    {children}
  </button>
);

const FlightSummary = ({ flightSummaries }) => {
  if (!flightSummaries || flightSummaries.length === 0) return null;

  const flight = flightSummaries[0];
  const departureTime = formatTime(flight.departureTime);
  const departureDate = formatDate(flight.departureTime);

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <Plane className="w-4 h-4 text-blue-600" />
        <span className="font-semibold text-gray-900">{flight.flightCode}</span>
      </div>
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <span>{getCityName(flight.originAirportCode)}</span>
        <ArrowRight className="w-3 h-3" />
        <span>{getCityName(flight.destinationAirportCode)}</span>
      </div>
      <div className="text-sm text-gray-500">
        {departureTime} • {departureDate}
      </div>
      {flightSummaries.length > 1 && (
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
          +{flightSummaries.length - 1} more
        </span>
      )}
    </div>
  );
};

const ActionButton = ({ icon: Icon, children, variant = 'secondary', onClick, disabled = false }) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    success: 'bg-green-600 text-white hover:bg-green-700',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors font-medium text-sm ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <Icon className="w-4 h-4" />
      <span>{children}</span>
    </button>
  );
};

const BookingCard = ({ booking, onViewDetails, onCheckIn }) => {
  const statusKey = booking.status.toLowerCase();
  const isCheckedIn = booking.isCheckedIn || false;

  return (
    <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300">
      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center space-x-2 ${getStatusColor(statusKey)}`}>
              {getStatusIcon(statusKey)}
              <span>{getStatusDisplayName(statusKey)}</span>
            </div>
            <div className="text-sm text-gray-600">
              Booking Reference: <span className="font-mono font-semibold text-gray-900">{booking.bookingReference}</span>
            </div>
            {isCheckedIn && (
              <div className="px-3 py-1 rounded-full text-sm font-medium border flex items-center space-x-2 bg-green-50 text-green-600 border-green-200">
                <CheckCircle className="w-4 h-4" />
                <span>Đã Check-in</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-lg font-bold text-gray-900">
              {formatPrice(booking.totalAmount)}
            </span>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">{booking.passengerCount} passenger{booking.passengerCount > 1 ? 's' : ''}</span>
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Booked {formatDate(booking.bookingDate)}</span>
          </div>
          {(booking.status === 'PENDING_PAYMENT' || booking.status === 'PAYMENT_FAILED') && booking.paymentDeadline && (
            <div className="text-sm text-red-500 font-medium">
              Payment deadline: {formatDateTime(booking.paymentDeadline)}
            </div>
          )}
        </div>

        <FlightSummary flightSummaries={booking.flightSummaries} />

        <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-100">
          <ActionButton icon={Eye} variant="primary" onClick={() => onViewDetails(booking.bookingReference)}>
            View Details
          </ActionButton>

          {booking.status === 'DRAFT_SELECTION' && (
            <ActionButton icon={Edit3} variant="secondary">
              Continue Booking
            </ActionButton>
          )}

          {booking.status === 'PENDING_PAYMENT' && (
            <ActionButton icon={CreditCard} variant="success">
              Pay Now
            </ActionButton>
          )}

          {booking.status === 'PAID' && !isCheckedIn &&  (
            <ActionButton icon={CheckCircle} variant="success" onClick={() => onCheckIn(booking.bookingReference)}>
              Check In
            </ActionButton>
          )}

          {booking.status === 'PAID' && isCheckedIn && (
            <ActionButton icon={Download} variant="primary">
              Download Boarding Pass
            </ActionButton>
          )}

          {booking.status === 'COMPLETED' && (
            <ActionButton icon={Download}>
              Download Ticket
            </ActionButton>
          )}

          {booking.status === 'PAYMENT_FAILED' && (
            <ActionButton icon={CreditCard} variant="primary">
              Retry Payment
            </ActionButton>
          )}

          {booking.status === 'CANCELLATION_REQUESTED' && (
            <ActionButton icon={Clock} variant="secondary" disabled>
              Processing Cancellation
            </ActionButton>
          )}

          {['DRAFT_SELECTION', 'PENDING_PAYMENT', 'PAID'].includes(booking.status) && (
            <ActionButton icon={Edit3}>
              Manage Booking
            </ActionButton>
          )}
        </div>
      </div>
    </div>
  );
};

const EmptyState = ({ activeTab }) => (
  <div className="text-center py-16">
    <Plane className="w-16 h-16 text-gray-300 mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings found</h3>
    <p className="text-gray-600 mb-6">
      {activeTab === 'all'
        ? "You haven't made any flight bookings yet."
        : `No ${activeTab} bookings found.`}
    </p>
    <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
      Book Your First Flight
    </button>
  </div>
);

const ErrorState = ({ error, onRetry }) => (
  <div className="text-center py-16">
    <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
    <h3 className="text-lg font-semibold text-gray-900 mb-2">Error loading bookings</h3>
    <p className="text-gray-600 mb-6">{error}</p>
    <button
      onClick={onRetry}
      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
    >
      Try Again
    </button>
  </div>
);

const LoadingState = () => (
  <div className="text-center py-16">
    <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
    <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading your bookings...</h3>
    <p className="text-gray-600">Please wait while we fetch your booking history.</p>
  </div>
);

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const pages = [];
  const maxVisiblePages = 5;

  let startPage = Math.max(0, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(0, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex items-center justify-center space-x-2 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
        className="px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed hover:bg-gray-50"
      >
        Previous
      </button>

      {pages.map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-2 border rounded-lg ${currentPage === page
            ? 'bg-blue-600 text-white border-blue-600'
            : 'border-gray-300 hover:bg-gray-50'
            }`}
        >
          {page + 1}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages - 1}
        className="px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100 disabled:cursor-not-allowed hover:bg-gray-50"
      >
        Next
      </button>
    </div>
  );
};

const BookingOverview = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [pagination, setPagination] = useState({
    currentPage: 0,
    totalPages: 0,
    totalElements: 0,
    size: 10
  });

  const switchToCheckIn = (bookingReference) => {
    navigate(`/check-in/detail/${bookingReference}`)
  }

  const fetchCheckInStatus = async (bookings) => {
    try {
      const bookingsWithCheckInStatus = await Promise.all(
        bookings.map(async (booking) => {
          try {
            const checkInStatus = await getCheckInStatus(booking.bookingReference);
            return {
              ...booking,
              isCheckedIn: checkInStatus || false
            };
          } catch (error) {
            console.error(`Error fetching check-in status for booking ${booking.bookingReference}:`, error);
            return {
              ...booking,
              isCheckedIn: false
            };
          }
        })
      );
      setBookings(bookingsWithCheckInStatus);
    } catch (error) {
      console.error('Error fetching check-in status:', error);
    }
  };

  const fetchBookings = async (page = 0, status = null) => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        page,
        size: pagination.size,
        ...(status && status !== 'all' && { status: status.toUpperCase() })
      };

      const response = await getUserBookings(params);
      const sortedBookings = sortBookingsByPriority(response.content);
      
      setBookings(sortedBookings);
      setPagination({
        currentPage: response.number,
        totalPages: response.totalPages,
        totalElements: response.totalElements,
        size: response.size
      });

      // Fetch check-in status after getting bookings
      fetchCheckInStatus(sortedBookings);
    } catch (err) {
      setError(err.message || 'Failed to fetch bookings');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch bookings when component mounts or activeTab changes
  useEffect(() => {
    fetchBookings(0, activeTab);
  }, [activeTab]);

  const handlePageChange = (page) => {
    fetchBookings(page, activeTab);
  };

  const handleRetry = () => {
    fetchBookings(pagination.currentPage, activeTab);
  };

  const handleViewDetails = (bookingReference) => {
    navigate(`/booking-details/${bookingReference}`);
  };

  const filteredBookings = useMemo(() => {
    let filtered = bookings;

    if (activeTab !== 'all') {
      if (activeTab === 'cancelled') {
        filtered = bookings.filter(booking =>
          ['CANCELLED', 'CANCELLED_NO_PAYMENT', 'PARTIALLY_CANCELLED'].includes(booking.status)
        );
      } else {
        filtered = bookings.filter(booking => booking.status.toLowerCase() === activeTab.toLowerCase());
      }
    }

    return sortBookingsByPriority(filtered);
  }, [activeTab, bookings]);

  const stats = useMemo(() => {
    const draft = bookings.filter(b => b.status === 'DRAFT_SELECTION').length;
    const pendingPayment = bookings.filter(b => b.status === 'PENDING_PAYMENT').length;
    const paid = bookings.filter(b => b.status === 'PAID').length;
    const cancelled = bookings.filter(b => ['CANCELLED', 'CANCELLED_NO_PAYMENT', 'PARTIALLY_CANCELLED'].includes(b.status)).length;
    const completed = bookings.filter(b => b.status === 'COMPLETED').length;
    const failed = bookings.filter(b => b.status === 'PAYMENT_FAILED').length;
    const totalValue = bookings.filter(b => b.status === 'PAID' || b.status === 'COMPLETED').reduce((sum, b) => sum + b.totalAmount, 0);

    return { draft, pendingPayment, paid, cancelled, completed, failed, totalValue };
  }, [bookings]);

  const filterTabs = [
    { key: 'all', label: 'All Bookings', count: pagination.totalElements },
    { key: 'draft_selection', label: 'Draft', count: stats.draft },
    { key: 'pending_payment', label: 'Pending Payment', count: stats.pendingPayment },
    { key: 'paid', label: 'Paid', count: stats.paid },
    { key: 'completed', label: 'Completed', count: stats.completed },
    { key: 'cancelled', label: 'Cancelled', count: stats.cancelled },
    { key: 'payment_failed', label: 'Failed', count: stats.failed }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
              <p className="text-gray-600">Manage your flight reservations and travel history</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Total Bookings</div>
              <div className="text-2xl font-bold text-blue-600">{pagination.totalElements}</div>
            </div>
          </div>

          {!loading && bookings.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <StatCard
                icon={Edit3}
                label="Draft"
                value={stats.draft}
                color="text-blue-600"
              />
              <StatCard
                icon={Clock}
                label="Pending Payment"
                value={stats.pendingPayment}
                color="text-yellow-600"
              />
              <StatCard
                icon={CheckCircle}
                label="Paid"
                value={stats.paid}
                color="text-green-600"
              />
              <StatCard
                icon={CheckCircle}
                label="Completed"
                value={stats.completed}
                color="text-gray-600"
              />
              <StatCard
                icon={Monitor}
                label="Total Value"
                value={formatPrice(stats.totalValue)}
              />
            </div>
          )}

          {!loading && bookings.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {filterTabs.map(tab => (
                <FilterTab
                  key={tab.key}
                  isActive={activeTab === tab.key}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label} ({tab.count})
                </FilterTab>
              ))}
            </div>
          )}
        </div>

        {loading && <LoadingState />}

        {error && <ErrorState error={error} onRetry={handleRetry} />}

        {!loading && !error && bookings.length === 0 && <EmptyState activeTab={activeTab} />}

        {!loading && !error && bookings.length > 0 && (
          <>
            <div className="space-y-6">
              {filteredBookings.map((booking) => (
                <BookingCard
                  key={booking.bookingReference}
                  booking={booking}
                  onViewDetails={handleViewDetails}
                  onCheckIn={switchToCheckIn}
                />
              ))}
            </div>

            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default BookingOverview;