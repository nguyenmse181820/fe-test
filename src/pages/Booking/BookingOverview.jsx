import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertCircle,
    ArrowRight,
    Calendar,
    CheckCircle,
    Clock,
    CreditCard,
    Download,
    Edit3,
    Eye,
    Info,
    Loader2,
    MessageCircle,
    Monitor,
    Plane,
    RefreshCw,
    RotateCcw,
    Users,
    X
} from 'lucide-react';
import {
    getBookingByReference,
    getCheckInStatus,
    getUserBookings,
    getUserBookingStatistics
} from './../../services/BookingService';
import { downloadSimpleTicket, downloadTicket } from './../../services/TicketService';
import axiosInstance from '../../utils/axios';
import RescheduleModal from '../../components/RescheduleModal';
import RescheduleService from '../../services/RescheduleService';
import { useToast } from '../../hooks/use-toast';

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

// This function is no longer used for sorting, but kept for potential future use
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

/**
 * Sort bookings by date (newest to oldest) regardless of status
 * This ensures that the most recently created or updated bookings always appear at the top
 */
const sortBookingsByDate = (bookingsToSort) => {
    return [...bookingsToSort].sort((a, b) => {
        // Sort by booking date (newest first) regardless of status
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
        [BOOKING_STATUSES.COMPLETED]: 'text-gray-600 bg-gray-50 border-gray-200',
        'FAILED_TO_CONFIRM_SEATS': 'text-orange-600 bg-orange-50 border-orange-200',
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
        'FAILED_TO_CONFIRM_SEATS': <AlertCircle className="w-4 h-4" />,
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
        'FAILED_TO_CONFIRM_SEATS': 'Seat Confirmation Error',
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

const StatCard = ({ icon: Icon, label, value, color = 'text-gray-900' }) => {
    // Determine if the value is zero (for numeric values) or empty
    const isEmpty = value === 0 || value === '0' || value === '₫0';

    return (
        <div
            className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-md ${isEmpty ? 'opacity-75 hover:opacity-100' : ''}`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600">{label}</p>
                    <p className={`text-xl font-semibold ${isEmpty ? 'text-gray-400' : color}`}>
                        {isEmpty && typeof value === 'string' && value.includes('₫') ? '₫0' : value}
                    </p>
                </div>
                <Icon
                    className={`w-8 h-8 ${isEmpty ? 'text-gray-300' : color.replace('text-', 'text-').replace('-900', '-500')}`} />
            </div>
        </div>
    );
};

const FilterTab = ({ isActive, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${isActive
            ? 'bg-blue-600 text-white shadow-md scale-105'
            : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-blue-600 border border-gray-200 hover:border-blue-200'
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

const BookingCard = ({ booking, onViewDetails, onCheckIn, onReschedule, onViewBoardingPass }) => {
    const statusKey = booking.status.toLowerCase();
    const isCheckedIn = booking.isCheckedIn || false;
    const [refundRequests, setRefundRequests] = useState([]);
    const [downloadingTicket, setDownloadingTicket] = useState(false);
    const [checkingRescheduleEligibility, setCheckingRescheduleEligibility] = useState(false);

    // Fetch refund requests for this booking
    useEffect(() => {
        const fetchRefundRequests = async () => {
            try {
                const response = await axiosInstance.get(`/booking-service/api/refund-requests/booking/${booking.bookingReference}`);
                setRefundRequests(response.data || []);
            } catch (error) {
                console.error('Error fetching refund requests:', error);
                setRefundRequests([]);
            }
        };

        fetchRefundRequests();
    }, [booking.bookingReference]);

    // Check if there's a completed refund
    const hasCompletedRefund = refundRequests.some(request => request.status === 'COMPLETED');

    // Check if booking is cancelled due to refund completion (only show "Refund Completed" if actually refunded)
    const isCancelledDueToRefund = hasCompletedRefund || (booking.status === 'CANCELLED' && hasCompletedRefund);
    const isCancelledNoPayment = booking.status === 'CANCELLED_NO_PAYMENT';
    const isCancelledDueToOtherReasons = booking.status === 'CANCELLED' && !hasCompletedRefund;

    // Determine the display status - override "PAID" if refund is completed
    const displayStatus = hasCompletedRefund && booking.status === 'PAID' ? 'REFUNDED' : booking.status;
    const displayStatusKey = displayStatus.toLowerCase();

    // Handle ticket download
    const handleDownloadTicket = async (type = 'ticket') => {
        if (downloadingTicket) return;

        setDownloadingTicket(true);
        try {
            // For simple bookings, use simple download
            if (!booking.flightSummaries || booking.flightSummaries.length === 0) {
                await downloadSimpleTicket(booking.bookingReference, {
                    status: booking.status,
                    totalAmount: new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND'
                    }).format(booking.totalAmount)
                });
            } else {
                // For complete bookings, fetch full details and generate detailed ticket
                const fullBooking = await getBookingByReference(booking.bookingReference);
                await downloadTicket(fullBooking, type);
            }
        } catch (error) {
            console.error('Error downloading ticket:', error);
            // Error is handled silently - user will notice download didn't start
        } finally {
            setDownloadingTicket(false);
        }
    };

    // Handle reschedule with loading state
    const handleRescheduleClick = async () => {
        setCheckingRescheduleEligibility(true);
        try {
            await onReschedule(booking);
        } finally {
            setCheckingRescheduleEligibility(false);
        }
    };

    // Check if any flight segment is eligible for rescheduling
    const rescheduleEligibleSegments = booking.details ? booking.details.filter(detail => {
        // For now, we'll do a simple check based on booking status and departure time
        // In a real app, you might want to call the backend API to check eligibility
        const departureTime = new Date(detail.departureTime);
        const now = new Date();
        const hoursUntilDeparture = (departureTime - now) / (1000 * 60 * 60);

        return hoursUntilDeparture > 24; // Can reschedule if more than 24 hours
    }) : [];

    const canReschedule = booking.status === 'PAID' && rescheduleEligibleSegments.length > 0;

    return (
        <div
            className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div
                            className={`px-3 py-1 rounded-full text-sm font-medium border flex items-center space-x-2 ${getStatusColor(displayStatusKey)}`}>
                            {getStatusIcon(displayStatusKey)}
                            <span>{getStatusDisplayName(displayStatus)}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                            Booking Reference: <span
                                className="font-mono font-semibold text-gray-900">{booking.bookingReference}</span>
                        </div>
                        {isCheckedIn && !isCancelledDueToRefund && !isCancelledNoPayment && !isCancelledDueToOtherReasons && (
                            <div
                                className="px-3 py-1 rounded-full text-sm font-medium border flex items-center space-x-2 bg-green-50 text-green-600 border-green-200">
                                <CheckCircle className="w-4 h-4" />
                                <span>Checked-in</span>
                            </div>
                        )}
                        {isCancelledDueToRefund && (
                            <div
                                className="px-3 py-1 rounded-full text-sm font-medium border flex items-center space-x-2 bg-red-50 text-red-600 border-red-200">
                                <X className="w-4 h-4" />
                                <span>Refund Completed</span>
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
                        <span
                            className="text-sm text-gray-600">{booking.passengerCount} passenger{booking.passengerCount > 1 ? 's' : ''}</span>
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

                    {canReschedule && (
                        <ActionButton
                            icon={checkingRescheduleEligibility ? Loader2 : RotateCcw}
                            variant="secondary"
                            onClick={handleRescheduleClick}
                            disabled={checkingRescheduleEligibility}
                        >
                            {checkingRescheduleEligibility ? 'Checking...' : 'Reschedule'}
                        </ActionButton>
                    )}

                    {(booking.status === 'PAID' && !hasCompletedRefund) && !isCheckedIn && !isCancelledDueToRefund && !isCancelledNoPayment && !isCancelledDueToOtherReasons && (
                        <ActionButton icon={CheckCircle} variant="success"
                            onClick={() => onCheckIn(booking.bookingReference)}>
                            Check In
                        </ActionButton>
                    )}

                    {(booking.status === 'PAID' && !hasCompletedRefund) && isCheckedIn && !isCancelledDueToRefund && !isCancelledNoPayment && !isCancelledDueToOtherReasons && (
                        <>
                            <ActionButton
                                icon={downloadingTicket ? Loader2 : Download}
                                variant="primary"
                                onClick={() => handleDownloadTicket('boarding-pass')}
                                disabled={downloadingTicket}
                            >
                                {downloadingTicket ? 'Generating...' : 'Download Boarding Pass'}
                            </ActionButton>
                            <ActionButton
                                icon={Eye}
                                variant="secondary"
                                onClick={() => onViewBoardingPass(booking.bookingReference)}
                            >
                                View Checked-in Boarding Passes
                            </ActionButton>
                        </>
                    )}

                    {booking.status === 'COMPLETED' && !isCancelledDueToRefund && !isCancelledNoPayment && !isCancelledDueToOtherReasons && (
                        <ActionButton
                            icon={downloadingTicket ? Loader2 : Download}
                            onClick={() => handleDownloadTicket('ticket')}
                            disabled={downloadingTicket}
                        >
                            {downloadingTicket ? 'Generating...' : 'Download Ticket'}
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

                    {isCancelledDueToRefund && (
                        <ActionButton icon={MessageCircle} variant="secondary">
                            Contact Support
                        </ActionButton>
                    )}
                </div>
            </div>
        </div>
    )
        ;
};

const EmptyState = ({ activeTab }) => {
    const getEmptyStateMessage = () => {
        switch (activeTab) {
            case 'all':
                return "You haven't made any flight bookings yet.";
            case 'saga_errors':
                return "No bookings with processing issues.";
            case 'paid':
                return "You don't have any paid bookings waiting for check-in.";
            case 'completed':
                return "You don't have any completed journeys yet.";
            case 'pending_payment':
                return "You don't have any bookings waiting for payment.";
            case 'cancelled':
                return "You don't have any refunded bookings.";
            case 'cancelled_no_payment':
                return "You don't have any cancelled bookings.";
            case 'payment_failed':
                return "You don't have any bookings with payment failures.";
            default:
                return `No ${activeTab.replace('_', ' ')} bookings found.`;
        }
    };

    return (
        <div className="text-center py-16">
            <Plane className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings in this category</h3>
            <p className="text-gray-600 mb-6">
                {getEmptyStateMessage()}
            </p>
            {activeTab === 'all' && (
                <button
                    onClick={() => window.location.href = '/flights'}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                    Book Your First Flight
                </button>
            )}
        </div>
    );
};

const ErrorState = ({ error, onRetry }) => (
    <div className="text-center py-10 rounded-xl bg-white shadow-sm border border-red-100">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error loading bookings</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
            onClick={onRetry}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center space-x-2 mx-auto"
        >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
        </button>
    </div>
);

const LoadingState = () => (
    <div className="text-center py-10 rounded-xl bg-white/80 shadow-sm border border-gray-100">
        <Loader2 className="w-10 h-10 text-blue-600 mx-auto mb-3 animate-spin" />
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Loading your bookings...</h3>
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
    const { toast } = useToast();
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
    const [rescheduleModal, setRescheduleModal] = useState({
        isOpen: false,
        selectedBooking: null,
        selectedSegment: null
    });
    const [rescheduleConfirmation, setRescheduleConfirmation] = useState({
        isOpen: false,
        booking: null,
        eligibleSegments: []
    });

    const switchToCheckIn = (bookingReference) => {
        // Tìm booking đầy đủ từ danh sách bookings
        const booking = bookings.find(b => b.bookingReference === bookingReference);
        if (!booking) return;

        // Chuẩn bị dữ liệu bookingDetail cho BoardingPassList
        const bookingDetail = {
            details: booking.details,
            baggageAddons: booking.baggageAddons || [],
            bookingInfo: {
                bookingReference: booking.bookingReference,
                // Có thể thêm các thông tin khác nếu cần
            }
        };

        navigate('/check-in/boarding-pass', {
            state: { bookingDetail }
        });
    }

    const handleReschedule = async (booking) => {
        try {
            // First, fetch reschedule history for this booking
            const rescheduleHistory = await RescheduleService.getRescheduleHistory(booking.bookingReference);

            // Find the first eligible segment for rescheduling (based on time and reschedule history)
            const timeEligibleSegments = booking.details ? booking.details.filter(detail => {
                const departureTime = new Date(detail.departureTime);
                const now = new Date();
                const hoursUntilDeparture = (departureTime - now) / (1000 * 60 * 60);

                // Check if this detail has already been rescheduled
                const hasBeenRescheduled = rescheduleHistory.some(history =>
                    history.bookingDetailId === detail.bookingDetailId
                );

                return hoursUntilDeparture > 24 && !hasBeenRescheduled; // Can reschedule if more than 24 hours and not already rescheduled
            }) : [];

            if (timeEligibleSegments.length === 0) {
                const hasAnyRescheduled = booking.details && rescheduleHistory.length > 0;
                const message = hasAnyRescheduled
                    ? "No segments are eligible for rescheduling. Each booking detail can only be rescheduled once, and flights must be more than 24 hours away from departure."
                    : "No segments are eligible for rescheduling. Flights must be more than 24 hours away from departure.";

                toast({
                    title: "Cannot Reschedule",
                    description: message,
                    variant: "destructive"
                });
                return;
            }

            // Check API eligibility for each time-eligible segment
            const eligibilityChecks = await Promise.all(
                timeEligibleSegments.map(async (segment) => {
                    try {
                        const isEligible = await RescheduleService.canRescheduleBookingDetail(segment.bookingDetailId);
                        return {
                            segment,
                            isEligible
                        };
                    } catch (error) {
                        console.error(`Error checking eligibility for segment ${segment.bookingDetailId}:`, error);
                        return {
                            segment,
                            isEligible: false
                        };
                    }
                })
            );

            // Filter segments that are actually eligible according to API
            const apiEligibleSegments = eligibilityChecks
                .filter(check => check.isEligible)
                .map(check => check.segment);

            if (apiEligibleSegments.length === 0) {
                toast({
                    title: "Cannot Reschedule",
                    description: "No segments are currently eligible for rescheduling. Please check your booking status and departure times.",
                    variant: "destructive"
                });
                return;
            }

            // Show confirmation dialog before opening reschedule modal
            setRescheduleConfirmation({
                isOpen: true,
                booking: booking,
                eligibleSegments: apiEligibleSegments
            });

        } catch (error) {
            console.error('Error checking reschedule eligibility:', error);
            toast({
                title: "Error",
                description: "Unable to check reschedule eligibility. Please try again later.",
                variant: "destructive"
            });
        }
    };

    const handleRescheduleSuccess = () => {
        // Refresh booking data after successful reschedule
        fetchBookings(pagination.currentPage, activeTab);
    };

    const closeRescheduleModal = () => {
        setRescheduleModal({
            isOpen: false,
            selectedBooking: null,
            selectedSegment: null
        });
    };

    const handleConfirmReschedule = () => {
        // Close confirmation dialog and open reschedule modal
        setRescheduleConfirmation({
            isOpen: false,
            booking: null,
            eligibleSegments: []
        });

        setRescheduleModal({
            isOpen: true,
            selectedBooking: rescheduleConfirmation.booking,
            selectedSegment: rescheduleConfirmation.eligibleSegments[0]
        });
    };

    const handleCancelReschedule = () => {
        setRescheduleConfirmation({
            isOpen: false,
            booking: null,
            eligibleSegments: []
        });
    };

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
            // Special handling for saga_errors - fetch all bookings and filter client-side
            if (status === 'saga_errors') {
                const params = {
                    page,
                    size: pagination.size * 5, // Fetch more to account for filtering
                };

                const response = await getUserBookings(params);
                const allBookings = response.content;

                // Filter only saga error statuses (FAILED_TO_CONFIRM_SEATS and any future ones)
                const sagaErrorBookings = allBookings.filter(booking =>
                    booking.status === 'FAILED_TO_CONFIRM_SEATS'
                    // Add other saga error statuses here if added to the backend enum
                );

                const sortedBookings = sortBookingsByDate(sagaErrorBookings);

                setBookings(sortedBookings);

                // Manually calculate pagination since we're client-side filtering
                setPagination({
                    currentPage: page,
                    totalPages: Math.ceil(sagaErrorBookings.length / pagination.size) || 1,
                    totalElements: sagaErrorBookings.length,
                    size: pagination.size
                });

                // Fetch check-in status after getting bookings
                fetchCheckInStatus(sortedBookings);
            } else {
                // Normal case - use backend filtering
                const params = {
                    page,
                    size: pagination.size,
                    ...(status && status !== 'all' && { status: status.toUpperCase() })
                };

                const response = await getUserBookings(params);
                const sortedBookings = sortBookingsByDate(response.content);

                // Fetch detailed booking information for each booking
                const bookingsWithDetails = await Promise.all(
                    sortedBookings.map(async (booking) => {
                        try {
                            const detailedBooking = await getBookingByReference(booking.bookingReference);
                            return {
                                ...booking,
                                details: detailedBooking.details || []
                            };
                        } catch (error) {
                            console.error(`Error fetching details for booking ${booking.bookingReference}:`, error);
                            return {
                                ...booking,
                                details: []
                            };
                        }
                    })
                );

                setBookings(bookingsWithDetails);
                setPagination({
                    currentPage: response.number,
                    totalPages: response.totalPages,
                    totalElements: response.totalElements,
                    size: response.size
                });

                // Fetch check-in status after getting bookings
                fetchCheckInStatus(bookingsWithDetails);
            }
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
        fetchBookingStatistics(); // Fetch statistics separately
    }, [activeTab]);

    // Fetch booking statistics initially and when refreshing
    useEffect(() => {
        fetchBookingStatistics();
    }, []);

    const handlePageChange = (page) => {
        fetchBookings(page, activeTab);
    };

    const handleRetry = () => {
        fetchBookings(pagination.currentPage, activeTab);
    };

    const handleViewDetails = (bookingReference) => {
        navigate(`/booking-details/${bookingReference}`);
    };

    // Handle view checked-in boarding passes
    const handleViewBoardingPass = (bookingReference) => {
        navigate('/my-boarding-passes', { state: { bookingReference } });
    };

    const filteredBookings = useMemo(() => {
        // Always exclude DRAFT_SELECTION from the main view
        let filtered = bookings.filter(booking => booking.status !== 'DRAFT_SELECTION');

        if (activeTab !== 'all') {
            if (activeTab === 'cancelled') {
                filtered = filtered.filter(booking =>
                    ['CANCELLED', 'PARTIALLY_CANCELLED'].includes(booking.status)
                );
            } else if (activeTab === 'cancelled_no_payment') {
                filtered = filtered.filter(booking => booking.status === 'CANCELLED_NO_PAYMENT');
            } else if (activeTab === 'saga_errors') {
                // If we're in the saga_errors tab, the bookings are already filtered in fetchBookings
                // But we'll double check here just to be safe
                filtered = filtered.filter(booking =>
                    booking.status === 'FAILED_TO_CONFIRM_SEATS'
                    // Add more saga error statuses here when they're added to the enum
                );
            } else {
                filtered = filtered.filter(booking => booking.status.toLowerCase() === activeTab.toLowerCase());
            }
        }

        return sortBookingsByDate(filtered);
    }, [activeTab, bookings]);

    // State for booking statistics
    const [stats, setStats] = useState({
        draft: 0,
        pendingPayment: 0,
        paid: 0,
        cancelled: 0,
        cancelledNoPayment: 0,
        completed: 0,
        failed: 0,
        sagaErrors: 0,  // Backend uses sagaErrors term, but UI will display it as "Processing Issues"
        totalValue: 0,
        total: 0
    });

    // Fetch booking statistics from API
    const fetchBookingStatistics = async () => {
        try {
            const statistics = await getUserBookingStatistics();
            setStats(statistics);
        } catch (error) {
            console.error('Error fetching booking statistics:', error);
            // Fallback to calculating from current bookings if API fails
            const draft = bookings.filter(b => b.status === 'DRAFT_SELECTION').length;
            const pendingPayment = bookings.filter(b => b.status === 'PENDING_PAYMENT').length;
            const paid = bookings.filter(b => b.status === 'PAID').length;
            const cancelled = bookings.filter(b => ['CANCELLED', 'PARTIALLY_CANCELLED'].includes(b.status)).length;
            const cancelledNoPayment = bookings.filter(b => b.status === 'CANCELLED_NO_PAYMENT').length;
            const completed = bookings.filter(b => b.status === 'COMPLETED').length;
            const failed = bookings.filter(b => b.status === 'PAYMENT_FAILED').length;
            const sagaErrors = bookings.filter(b => b.status === 'FAILED_TO_CONFIRM_SEATS').length;
            const totalValue = bookings.filter(b => b.status === 'PAID' || b.status === 'COMPLETED').reduce((sum, b) => sum + b.totalAmount, 0);

            setStats({
                draft,
                pendingPayment,
                paid,
                cancelled,
                cancelledNoPayment,
                completed,
                failed,
                sagaErrors,
                totalValue
            });
        }
    };

    // Filter tabs - exclude draft from main view
    const filterTabs = [
        { key: 'all', label: 'All Bookings', count: stats.total },
        { key: 'pending_payment', label: 'Pending Payment', count: stats.pendingPayment },
        { key: 'paid', label: 'Paid', count: stats.paid },
        { key: 'completed', label: 'Completed', count: stats.completed },
        { key: 'cancelled', label: 'Refunded', count: stats.cancelled },
        { key: 'cancelled_no_payment', label: 'Cancelled', count: stats.cancelledNoPayment },
        { key: 'payment_failed', label: 'Failed', count: stats.failed },
        { key: 'saga_errors', label: 'Processing Issues', count: stats.sagaErrors }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Bookings</h1>
                            <p className="text-gray-600">Manage your flight reservations and travel history</p>
                            <p className="text-sm text-blue-600 mt-1">Bookings are sorted by date (newest first)</p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-500">Total Bookings</div>
                            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                        </div>
                    </div>

                    {/* Always show the stat cards regardless of whether there are bookings */}
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
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
                            icon={X}
                            label="Payment Failed"
                            value={stats.failed}
                            color="text-red-600"
                        />
                        <StatCard
                            icon={AlertCircle}
                            label="Processing Issues"
                            value={stats.sagaErrors}
                            color="text-orange-600"
                        />
                        <StatCard
                            icon={Monitor}
                            label="Total Value"
                            value={formatPrice(stats.totalValue)}
                        />
                    </div>

                    {/* Always show the filter tabs regardless of whether there are bookings */}
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
                </div>

                {error && <ErrorState error={error} onRetry={handleRetry} />}

                {loading && (
                    <div className="flex justify-center my-4">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                )}

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
                                    onReschedule={handleReschedule}
                                    onViewBoardingPass={handleViewBoardingPass}
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

                {/* Reschedule Confirmation Dialog */}
                {rescheduleConfirmation.isOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
                            <div className="text-center">
                                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AlertCircle className="w-8 h-8 text-yellow-600" />
                                </div>

                                <h3 className="text-xl font-bold text-gray-900 mb-4">
                                    Important Notice
                                </h3>

                                <div className="text-left space-y-3 mb-6">
                                    <p className="text-gray-700">
                                        You are about to reschedule your flight. Please note:
                                    </p>

                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                        <div className="flex items-start space-x-3">
                                            <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <span className="text-white text-sm font-bold">!</span>
                                            </div>
                                            <div className="text-sm text-yellow-800">
                                                <strong className="block mb-1">One-time reschedule only</strong>
                                                Each booking detail can only be rescheduled once. After this reschedule, you will not be able to change this flight again.
                                            </div>
                                        </div>
                                    </div>

                                    <ul className="text-sm text-gray-600 space-y-1 pl-4">
                                        <li>• Additional fees may apply based on fare difference</li>
                                        <li>• Changes must be made at least 24 hours before departure</li>
                                        <li>• Once confirmed, this action cannot be undone</li>
                                    </ul>
                                </div>

                                <div className="flex space-x-3">
                                    <button
                                        onClick={handleCancelReschedule}
                                        className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleConfirmReschedule}
                                        className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                    >
                                        I Understand, Continue
                                    </button>
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
                        bookingReference={rescheduleModal.selectedBooking?.bookingReference}
                        onRescheduleSuccess={handleRescheduleSuccess}
                    />
                )}
            </div>
        </div>
    );
};

export default BookingOverview;