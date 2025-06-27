import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, MapPin, Plane, Users, CheckCircle, AlertCircle, Info, Download, Edit3, X, CreditCard, User, Loader2, FileText, Receipt, RefreshCw } from 'lucide-react';
import { getBookingByReference } from './../../services/BookingService';
import { processVNPayPayment, validatePaymentData } from './../../services/Vnpay.js';
import CreateRefundRequest from '../../components/CreateRefundRequest';
import RefundStatusTimeline from '../../components/RefundStatusTimeline';
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

  useEffect(() => {
    if (bookingReference) {
      fetchBookingDetails();
      fetchRefundRequests();
    }
  }, [bookingReference]);

  const handleRetry = () => {
    fetchBookingDetails();
  };

  const handleGoBack = () => {
    navigate('/booking-overview');
  };

  const handleCompletePayment = async () => {
    if (!booking) return;

    setPaymentLoading(true);
    setPaymentError(null);

    try {
      const paymentData = {
        bookingReference: booking.bookingInfo.bookingReference,
        amount: booking.bookingInfo.totalAmount
      };

      // Validate payment data
      validatePaymentData(paymentData);

      // Process VNPay payment - this will redirect to VNPay
      await processVNPayPayment(paymentData);
      
    } catch (err) {
      console.error('Payment processing failed:', err);
      setPaymentError(err.message || 'Failed to process payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleRefundSuccess = (refundRequestId) => {
    // Refresh booking data and show success message
    console.log('Refund request created:', refundRequestId);
    // Reload booking to update any status changes
    fetchBookingDetails();
    fetchRefundRequests();
    setShowRefundModal(false);
  };

  // Helper function to check if refund is eligible
  const isRefundEligible = () => {
    if (bookingInfo.status !== 'PAID') return false;
    
    // Check if there's already a pending or approved refund request
    const hasPendingRefund = refundRequests.some(request => 
      ['PENDING', 'APPROVED'].includes(request.status)
    );
    
    return !hasPendingRefund;
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={handleRetry} onGoBack={handleGoBack} />;
  if (!booking) return <ErrorState error="Booking not found" onGoBack={handleGoBack} />;

  const { bookingInfo, details, payments } = booking;
  const payment = payments?.[0];
  const statusKey = bookingInfo.status.toLowerCase();

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
            <div className={`px-6 py-3 rounded-2xl text-base font-semibold border flex items-center space-x-3 shadow-lg ${getStatusColor(statusKey)}`}>
              {getStatusIcon(statusKey)}
              <span>{getStatusDisplayName(statusKey)}</span>
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
          <div className="px-8 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-blue-100 text-sm mb-1">Booking Reference</div>
                <div className="font-mono font-bold text-2xl">{bookingInfo.bookingReference}</div>
              </div>
              <div>
                <div className="text-blue-100 text-sm mb-1">Total Amount</div>
                <div className="text-3xl font-bold">{formatPrice(bookingInfo.totalAmount)}</div>
              </div>
              <div>
                <div className="text-blue-100 text-sm mb-1">Passengers</div>
                <div className="text-2xl font-bold">{details.length} {details.length === 1 ? 'Passenger' : 'Passengers'}</div>
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
              
              {bookingInfo.status === 'PAID' && (
                <>
                  <ActionButton icon={CheckCircle} variant="success">
                    Check In
                  </ActionButton>
                  <ActionButton icon={Download} variant="primary">
                    Download Tickets
                  </ActionButton>
                  {isRefundEligible() && (
                    <ActionButton 
                      icon={RefreshCw} 
                      variant="danger"
                      onClick={() => setShowRefundModal(true)}
                    >
                      Request Refund
                    </ActionButton>
                  )}
                </>
              )}
              
              {bookingInfo.status === 'COMPLETED' && (
                <ActionButton icon={Download} variant="primary">
                  Download Tickets
                </ActionButton>
              )}
              
              {bookingInfo.status === 'CANCELLATION_REQUESTED' && (
                <ActionButton icon={Clock} variant="secondary" disabled>
                  Processing Cancellation
                </ActionButton>
              )}
              
              {['DRAFT_SELECTION', 'PENDING_PAYMENT', 'PAID'].includes(bookingInfo.status) && (
                <ActionButton icon={Edit3} variant="secondary">
                  Manage Booking
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
          <FlightRoute detail={details[0]} />
        </div>

        {/* Passengers & Seats */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
            <Users className="w-8 h-8 mr-3 text-blue-600" />
            Passengers & Seats ({details.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {details.map((detail, index) => (
              <PassengerCard key={detail.bookingDetailId} detail={detail} index={index} />
            ))}
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
                      <div className={`inline-flex px-4 py-2 rounded-xl text-sm font-semibold ${
                        payment.status === 'COMPLETED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
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
    </div>
  );
};

export default BookingDetails;