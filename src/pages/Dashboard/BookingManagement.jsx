import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Filter,
    Download,
    Eye,
    Users,
    Calendar,
    Clock,
    CreditCard,
    Plane,
    CheckCircle,
    XCircle,
    AlertCircle,
    RefreshCw,
    ArrowLeft,
    ArrowRight,
    ChevronDown,
    Loader2,
    Package,
    MapPin,
    X,
    Info,
    User
} from 'lucide-react';
import axiosInstance from '../../utils/axios';
import BookingAdminService from '../../services/BookingAdminService';
import styles from './BookingManagement.module.css';

const BOOKING_STATUSES = {
    DRAFT_SELECTION: 'draft_selection',
    PENDING_PAYMENT: 'pending_payment',
    PAID: 'paid',
    PAYMENT_FAILED: 'payment_failed',
    CANCELLED_NO_PAYMENT: 'cancelled_no_payment',
    CANCELLATION_REQUESTED: 'cancellation_requested',
    CANCELLED: 'cancelled',
    PARTIALLY_CANCELLED: 'partially_cancelled',
    COMPLETED: 'completed',
    FAILED_TO_CONFIRM_SEATS: 'failed_to_confirm_seats'
};

const BookingManagement = () => {
    const navigate = useNavigate();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);

    // Filter and search state
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');
    const [sortBy, setSortBy] = useState('createdAt,desc');
    const [showFilters, setShowFilters] = useState(false);

    // Enhanced filters
    const [advancedFilters, setAdvancedFilters] = useState({
        userId: '',
        flightCode: '',
        totalAmountMin: '',
        totalAmountMax: '',
        dateFrom: '',
        dateTo: ''
    });

    // Modal state for booking details
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [detailsLoading, setDetailsLoading] = useState(false);

    // Statistics
    const [statistics, setStatistics] = useState({
        total: 0,
        completed: 0,
        paid: 0,
        pending: 0,
        cancelled: 0,
        totalRevenue: 0,
        paymentBasedRevenue: 0,
        conversionRate: 0
    });

    const statusOptions = [
        { value: 'all', label: 'All Bookings', icon: Users },
        { value: 'paid', label: 'Paid', icon: CheckCircle },
        { value: 'completed', label: 'Completed', icon: CheckCircle },
        { value: 'pending_payment', label: 'Pending Payment', icon: Clock },
        { value: 'payment_failed', label: 'Payment Failed', icon: XCircle },
        { value: 'cancelled', label: 'Cancelled', icon: X },
        { value: 'cancelled_no_payment', label: 'Cancelled (No Payment)', icon: X },
        { value: 'failed_to_confirm_seats', label: 'Failed Seat Confirmation', icon: AlertCircle }
    ];

    const dateFilterOptions = [
        { value: 'all', label: 'All Time' },
        { value: 'today', label: 'Today' },
        { value: 'week', label: 'This Week' },
        { value: 'month', label: 'This Month' },
        { value: 'quarter', label: 'This Quarter' },
        { value: 'custom', label: 'Custom Range' }
    ];

    // Fetch bookings with filters using real API
    const fetchBookings = async (page = 1) => {
        setLoading(true);
        setError(null);

        try {
            const params = {
                page: page - 1, // Spring uses 0-based pagination
                size: pageSize,
                sort: sortBy
            };

            // Add filters
            if (statusFilter !== 'all') {
                params.status = statusFilter.toUpperCase();
            }
            if (searchTerm) {
                params.searchTerm = searchTerm;
            }
            if (advancedFilters.userId) {
                params.userId = advancedFilters.userId;
            }
            if (advancedFilters.flightCode) {
                params.flightCode = advancedFilters.flightCode;
            }
            if (advancedFilters.totalAmountMin) {
                params.totalAmountMin = advancedFilters.totalAmountMin;
            }
            if (advancedFilters.totalAmountMax) {
                params.totalAmountMax = advancedFilters.totalAmountMax;
            }
            if (advancedFilters.dateFrom) {
                params.dateFrom = advancedFilters.dateFrom;
            }
            if (advancedFilters.dateTo) {
                params.dateTo = advancedFilters.dateTo;
            }

            console.log('Fetching bookings with params:', params);
            const response = await BookingAdminService.getAllBookings(params);

            if (response && response.success) {
                const pageData = response.data;
                console.log('Raw bookings data from API:', pageData.content);
                setBookings(pageData.content || []);
                setTotalElements(pageData.totalElements || 0);
                setTotalPages(pageData.totalPages || 1);
                setCurrentPage(page);
            } else {
                throw new Error(response?.message || 'Failed to fetch bookings');
            }

        } catch (err) {
            console.error('Error fetching bookings:', err);
            setError(err.response?.data?.message || err.message || 'An error occurred while fetching bookings');
            setBookings([]);
        } finally {
            setLoading(false);
        }
    };

    // Fetch booking statistics using enhanced API with payment-based revenue
    const fetchStatistics = async () => {
        try {
            // Try to get enhanced statistics first (includes paid status and payment-based revenue)
            const enhancedResponse = await BookingAdminService.getEnhancedBookingStatistics();
            
            if (enhancedResponse && enhancedResponse.success) {
                const stats = enhancedResponse.data;
                setStatistics({
                    total: stats.total || 0,
                    completed: stats.completed || 0,
                    paid: stats.paid || 0,
                    pending: stats.pending_payment || 0,
                    cancelled: (stats.cancelled || 0) + (stats.cancelled_no_payment || 0),
                    totalRevenue: stats.totalRevenue || 0,
                    paymentBasedRevenue: stats.paymentBasedRevenue || 0,
                    conversionRate: stats.conversionRate || 0
                });
                return;
            }
        } catch (enhancedErr) {
            console.warn('Enhanced statistics not available, falling back to regular statistics:', enhancedErr);
        }

        try {
            // Fallback to regular statistics
            const response = await BookingAdminService.getBookingStatistics();
            
            if (response && response.success) {
                const stats = response.data;
                
                // Try to get payment-based revenue separately
                let paymentBasedRevenue = 0;
                try {
                    const revenueResponse = await BookingAdminService.getRevenueFromPayments();
                    if (revenueResponse && revenueResponse.success) {
                        paymentBasedRevenue = revenueResponse.data.totalRevenue || 0;
                    }
                } catch (revenueErr) {
                    console.warn('Payment-based revenue not available:', revenueErr);
                    paymentBasedRevenue = stats.totalRevenue || 0; // fallback to original revenue
                }

                setStatistics({
                    total: stats.total || 0,
                    completed: stats.completed || 0,
                    paid: stats.paid || 0, // might be 0 if not available in regular stats
                    pending: stats.pending_payment || 0,
                    cancelled: (stats.cancelled || 0) + (stats.cancelled_no_payment || 0),
                    totalRevenue: stats.totalRevenue || 0,
                    paymentBasedRevenue: paymentBasedRevenue,
                    conversionRate: stats.conversionRate || 0
                });
            }
        } catch (err) {
            console.error('Error fetching booking statistics:', err);
            // Keep default values if API fails
        }
    };

    // Fetch booking details using real API
    const fetchBookingDetails = async (bookingReference) => {
        setDetailsLoading(true);
        try {
            const response = await axiosInstance.get(`/booking-service/api/v1/admin/bookings/${bookingReference}`);

            if (response.data && response.data.success) {
                setSelectedBooking(response.data.data);
                setDetailsModalOpen(true);
            } else {
                throw new Error(response.data?.message || 'Failed to fetch booking details');
            }
        } catch (err) {
            console.error('Error fetching booking details:', err);
            setError(err.response?.data?.message || err.message || 'Failed to fetch booking details');
        } finally {
            setDetailsLoading(false);
        }
    };

    useEffect(() => {
        fetchBookings(currentPage);
        fetchStatistics();
    }, [currentPage, statusFilter, sortBy, pageSize]);

    // Search with debounce
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchTerm !== '') {
                setCurrentPage(1);
                fetchBookings(1);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    const handleSearch = () => {
        setCurrentPage(1);
        fetchBookings(1);
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setDateFilter('all');
        setAdvancedFilters({
            userId: '',
            flightCode: '',
            totalAmountMin: '',
            totalAmountMax: '',
            dateFrom: '',
            dateTo: ''
        });
        setCurrentPage(1);
        fetchBookings(1);
    };

    const handleSort = (field) => {
        const [currentField, currentDirection] = sortBy.split(',');
        const newDirection = currentField === field && currentDirection === 'asc' ? 'desc' : 'asc';
        setSortBy(`${field},${newDirection}`);
    };

    const formatDate = (dateString) => {
        if (!dateString) {
            console.error('Invalid date for formatDate:', dateString);
            return 'N/A';
        }
        return new Date(dateString).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const formatDateTime = (dateString) => {
        return new Date(dateString).toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatPrice = (amount, currency = 'VND') => {
        if (!amount || isNaN(amount)) {
            console.error('Invalid amount for formatPrice:', amount);
            return 'N/A';
        }
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: currency
        }).format(amount);
    };

    // Helper function to calculate total amount from payments
    const calculateTotalFromPayments = (payments) => {
        if (!payments || payments.length === 0) {
            return 0;
        }
        return payments.reduce((total, payment) => {
            return total + (payment.amount || 0);
        }, 0);
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'completed':
            case 'paid':
                return '#10b981';
            case 'pending_payment':
                return '#f59e0b';
            case 'payment_failed':
            case 'cancelled':
            case 'cancelled_no_payment':
                return '#ef4444';
            case 'failed_to_confirm_seats':
                return '#8b5cf6';
            default:
                return '#6b7280';
        }
    };

    const getStatusDisplayName = (status) => {
        const statusNames = {
            draft_selection: 'Draft',
            pending_payment: 'Pending Payment',
            paid: 'Paid',
            payment_failed: 'Payment Failed',
            cancelled_no_payment: 'Cancelled (No Payment)',
            cancellation_requested: 'Cancellation Requested',
            cancelled: 'Cancelled',
            partially_cancelled: 'Partially Cancelled',
            completed: 'Completed',
            failed_to_confirm_seats: 'Failed Seat Confirmation'
        };
        return statusNames[status?.toLowerCase()] || status;
    };

    const memoizedBookings = useMemo(() => {
        const formattedBookings = bookings.map(booking => ({
            ...booking,
            statusColor: getStatusColor(booking.status),
            statusDisplay: getStatusDisplayName(booking.status),
            formattedAmount: formatPrice(booking.totalAmount),
            formattedDate: formatDate(booking.createdAt || booking.bookingDate)
        }));

        console.log('Formatted bookings:', formattedBookings);
        return formattedBookings;
    }, [bookings]);

    if (loading && currentPage === 1) {
        return (
            <div className={styles.loadingContainer}>
                <Loader2 className={styles.loadingSpinner} />
                <p>Loading bookings...</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.title}>Booking Management</h1>
                    <p className={styles.subtitle}>Manage and monitor all flight bookings</p>
                </div>
                <div className={styles.headerRight}>
                    <button
                        onClick={() => fetchBookings(currentPage)}
                        className={styles.refreshButton}
                        disabled={loading}
                    >
                        <RefreshCw className={`${styles.refreshIcon} ${loading ? styles.spinning : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ backgroundColor: '#3b82f6' }}>
                        <Users />
                    </div>
                    <div className={styles.statContent}>
                        <h3>{statistics.total.toLocaleString()}</h3>
                        <p>Total Bookings</p>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ backgroundColor: '#10b981' }}>
                        <CheckCircle />
                    </div>
                    <div className={styles.statContent}>
                        <h3>{statistics.completed.toLocaleString()}</h3>
                        <p>Completed</p>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ backgroundColor: '#059669' }}>
                        <CreditCard />
                    </div>
                    <div className={styles.statContent}>
                        <h3>{statistics.paid.toLocaleString()}</h3>
                        <p>Paid</p>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ backgroundColor: '#f59e0b' }}>
                        <Clock />
                    </div>
                    <div className={styles.statContent}>
                        <h3>{statistics.pending.toLocaleString()}</h3>
                        <p>Pending Payment</p>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ backgroundColor: '#ef4444' }}>
                        <XCircle />
                    </div>
                    <div className={styles.statContent}>
                        <h3>{statistics.cancelled.toLocaleString()}</h3>
                        <p>Cancelled</p>
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ backgroundColor: '#8b5cf6' }}>
                        <CreditCard />
                    </div>
                    <div className={styles.statContent}>
                        <h3>{formatPrice(statistics.paymentBasedRevenue || statistics.totalRevenue)}</h3>
                        <p>Revenue (from Payments)</p>
                        {statistics.paymentBasedRevenue !== statistics.totalRevenue && statistics.totalRevenue > 0 && (
                            <small style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                                Booking Revenue: {formatPrice(statistics.totalRevenue)}
                            </small>
                        )}
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ backgroundColor: '#06b6d4' }}>
                        <Info />
                    </div>
                    <div className={styles.statContent}>
                        <h3>{statistics.conversionRate}%</h3>
                        <p>Conversion Rate</p>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className={styles.searchSection}>
                <div className={styles.searchBar}>
                    <Search className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search by booking reference or flight code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={styles.searchInput}
                    />
                    <button onClick={handleSearch} className={styles.searchButton}>
                        Search
                    </button>
                </div>

                <div className={styles.filterSection}>
                    <div className={styles.quickFilters}>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className={styles.filterSelect}
                        >
                            {statusOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>

                        <select
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className={styles.filterSelect}
                        >
                            {dateFilterOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>

                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={styles.filterToggle}
                        >
                            <Filter />
                            Advanced Filters
                            <ChevronDown className={`${styles.chevron} ${showFilters ? styles.rotated : ''}`} />
                        </button>

                        <button onClick={handleClearFilters} className={styles.clearButton}>
                            Clear All
                        </button>
                    </div>

                    {/* Advanced Filters */}
                    {showFilters && (
                        <div className={styles.advancedFilters}>
                            <div className={styles.filterRow}>
                                <input
                                    type="text"
                                    placeholder="User ID"
                                    value={advancedFilters.userId}
                                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, userId: e.target.value }))}
                                    className={styles.filterInput}
                                />
                                <input
                                    type="text"
                                    placeholder="Flight Code"
                                    value={advancedFilters.flightCode}
                                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, flightCode: e.target.value }))}
                                    className={styles.filterInput}
                                />
                                <input
                                    type="number"
                                    placeholder="Min Amount"
                                    value={advancedFilters.totalAmountMin}
                                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, totalAmountMin: e.target.value }))}
                                    className={styles.filterInput}
                                />
                                <input
                                    type="number"
                                    placeholder="Max Amount"
                                    value={advancedFilters.totalAmountMax}
                                    onChange={(e) => setAdvancedFilters(prev => ({ ...prev, totalAmountMax: e.target.value }))}
                                    className={styles.filterInput}
                                />
                            </div>

                            {dateFilter === 'custom' && (
                                <div className={styles.filterRow}>
                                    <input
                                        type="date"
                                        value={advancedFilters.dateFrom}
                                        onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                                        className={styles.filterInput}
                                    />
                                    <input
                                        type="date"
                                        value={advancedFilters.dateTo}
                                        onChange={(e) => setAdvancedFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                                        className={styles.filterInput}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className={styles.errorContainer}>
                    <AlertCircle className={styles.errorIcon} />
                    <div className={styles.errorContent}>
                        <h3>Error Loading Bookings</h3>
                        <p>{error}</p>
                        <button onClick={() => fetchBookings(currentPage)} className={styles.retryButton}>
                            Try Again
                        </button>
                    </div>
                </div>
            )}

            {/* Bookings Table */}
            {!error && (
                <div className={styles.tableContainer}>
                    <div className={styles.tableHeader}>
                        <h2>Bookings ({totalElements.toLocaleString()})</h2>
                        <div className={styles.tableActions}>
                            <select
                                value={pageSize}
                                onChange={(e) => setPageSize(Number(e.target.value))}
                                className={styles.pageSizeSelect}
                            >
                                <option value={10}>10 per page</option>
                                <option value={20}>20 per page</option>
                                <option value={50}>50 per page</option>
                                <option value={100}>100 per page</option>
                            </select>
                        </div>
                    </div>

                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th onClick={() => handleSort('bookingReference')} className={styles.sortableHeader}>
                                        Booking Reference
                                        <ArrowLeft className={styles.sortIcon} />
                                    </th>
                                    <th onClick={() => handleSort('userId')} className={styles.sortableHeader}>
                                        Customer Info
                                        <ArrowLeft className={styles.sortIcon} />
                                    </th>
                                    <th>Flight Details</th>

                                    <th onClick={() => handleSort('totalAmount')} className={styles.sortableHeader}>
                                        Amount
                                        <ArrowLeft className={styles.sortIcon} />
                                    </th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className={styles.loadingRow}>
                                            <Loader2 className={styles.loadingSpinner} />
                                            Loading bookings...
                                        </td>
                                    </tr>
                                ) : memoizedBookings.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className={styles.emptyRow}>
                                            <Users className={styles.emptyIcon} />
                                            <div>
                                                <h3>No bookings found</h3>
                                                <p>Try adjusting your search criteria or filters</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    memoizedBookings.map((booking) => (
                                        <tr key={booking.bookingReference} className={styles.tableRow}>
                                            {/* Ô 1: Booking Reference */}
                                            <td className={styles.bookingRef}>
                                                <strong>{booking.bookingReference}</strong>
                                            </td>

                                            {/* Ô 2: Customer Info */}
                                            <td className={styles.customerInfo}>
                                                <div>
                                                    <div className={styles.customerEmail}>User ID: {booking.userId?.slice(0, 8)}...</div>
                                                    <div className={styles.bookingType}>{booking.bookingType}</div>
                                                </div>
                                            </td>

                                            {/* Ô 3: Flight Details - Chỉ chứa thông tin chuyến bay */}
                                            <td className={styles.flightInfo}>
                                                <div className={styles.flightSummary}>
                                                    {booking.flightSummaries?.map((summary, index) => (
                                                        <div key={index} className={styles.flightSegment}>
                                                            <Plane className={styles.flightIcon} />
                                                            <span>{summary.flightCode}</span>
                                                            <span className={styles.route}>
                                                                {summary.originAirportCode} → {summary.destinationAirportCode}
                                                            </span>
                                                        </div>
                                                    )) || <span>No flights</span>}
                                                </div>
                                            </td>

                                            {/* Ô 5: Amount - Nằm trong thẻ <td> riêng biệt */}
                                            <td className={styles.amountInfo}>
                                                <strong>{booking.formattedAmount || 'N/A'}</strong>
                                            </td>

                                            {/* Ô 6: Status - Nằm trong thẻ <td> riêng biệt */}
                                            <td className={styles.statusInfo}>
                                                <span
                                                    className={styles.statusBadge}
                                                    style={{ backgroundColor: booking.statusColor || '#6b7280' }}
                                                >
                                                    {booking.statusDisplay || booking.status || 'Unknown'}
                                                </span>
                                            </td>

                                            {/* Ô 7: Actions - Nằm trong thẻ <td> riêng biệt */}
                                            <td className={styles.actionsCell}>
                                                <button
                                                    onClick={() => fetchBookingDetails(booking.bookingReference)}
                                                    className={styles.actionButton}
                                                    disabled={detailsLoading}
                                                    title="View Details"
                                                >
                                                    <Eye />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className={styles.pagination}>
                            <div className={styles.paginationInfo}>
                                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalElements)} of {totalElements.toLocaleString()} bookings
                            </div>
                            <div className={styles.paginationControls}>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className={styles.paginationButton}
                                >
                                    <ArrowLeft />
                                    Previous
                                </button>

                                {/* Page numbers */}
                                <div className={styles.pageNumbers}>
                                    {[...Array(Math.min(5, totalPages))].map((_, index) => {
                                        const pageNumber = Math.max(1, currentPage - 2) + index;
                                        if (pageNumber <= totalPages) {
                                            return (
                                                <button
                                                    key={pageNumber}
                                                    onClick={() => setCurrentPage(pageNumber)}
                                                    className={`${styles.pageButton} ${currentPage === pageNumber ? styles.active : ''}`}
                                                >
                                                    {pageNumber}
                                                </button>
                                            );
                                        }
                                        return null;
                                    })}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className={styles.paginationButton}
                                >
                                    Next
                                    <ArrowRight />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Booking Details Modal */}
            {detailsModalOpen && selectedBooking && (
                <div className={styles.modalOverlay} onClick={() => setDetailsModalOpen(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Booking Details</h2>
                            <button
                                onClick={() => setDetailsModalOpen(false)}
                                className={styles.closeButton}
                            >
                                <X />
                            </button>
                        </div>

                        <div className={styles.modalBody}>
                            {/* Booking Summary */}
                            <div className={styles.bookingSection}>
                                <h3 className={styles.sectionTitle}>
                                    <svg className={styles.sectionIcon} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                    </svg>
                                    Booking Information
                                </h3>
                                <div className={styles.bookingGrid}>
                                    <div className={styles.bookingField}>
                                        <label>Reference</label>
                                        <span>{selectedBooking?.bookingInfo?.bookingReference ?? 'N/A'}</span>
                                    </div>
                                    <div className={styles.bookingField}>
                                        <label>Status</label>
                                        <span
                                            className={styles.statusBadge}
                                            style={{ backgroundColor: getStatusColor(selectedBooking?.bookingInfo?.status) }}
                                        >
                                            {selectedBooking?.bookingInfo?.status ? getStatusDisplayName(selectedBooking.bookingInfo.status) : 'N/A'}
                                        </span>
                                    </div>
                                    <div className={styles.bookingField}>
                                        <label>Customer ID</label>
                                        <span>{selectedBooking?.bookingInfo?.userId ?? 'N/A'}</span>
                                    </div>
                                    <div className={styles.bookingField}>
                                        <label>Booking Type</label>
                                        <span>{selectedBooking?.bookingInfo?.type ?? 'N/A'}</span>
                                    </div>
                                    <div className={styles.bookingField}>
                                        <label>Created Date</label>
                                        <span>{selectedBooking?.bookingInfo?.createdAt ? formatDateTime(selectedBooking.bookingInfo.createdAt) : (selectedBooking?.bookingInfo?.bookingDate ? formatDateTime(selectedBooking.bookingInfo.bookingDate) : 'N/A')}</span>
                                    </div>
                                    {selectedBooking?.bookingInfo?.updatedAt && (
                                        <div className={styles.bookingField}>
                                            <label>Last Updated</label>
                                            <span>{formatDateTime(selectedBooking.bookingInfo.updatedAt)}</span>
                                        </div>
                                    )}
                                    {selectedBooking?.bookingInfo?.totalAmount !== undefined && selectedBooking?.bookingInfo?.totalAmount !== null && (
                                        <div className={styles.bookingField}>
                                            <label>Original Amount</label>
                                            <span>{formatPrice(selectedBooking.bookingInfo.totalAmount)}</span>
                                        </div>
                                    )}
                                    <div className={styles.bookingField}>
                                        <label>Total Paid</label>
                                        <span>
                                            {selectedBooking?.payments && selectedBooking.payments.length > 0
                                                ? formatPrice(calculateTotalFromPayments(selectedBooking.payments))
                                                : 'No payments'
                                            }
                                        </span>
                                    </div>
                                    {selectedBooking?.payments && selectedBooking.payments.length > 0 && selectedBooking?.bookingInfo?.totalAmount && (
                                        <div className={styles.bookingField}>
                                            <label>Payment Status</label>
                                            <span className={
                                                calculateTotalFromPayments(selectedBooking.payments) >= selectedBooking.bookingInfo.totalAmount
                                                    ? styles.statusPaid
                                                    : styles.statusPending
                                            }>
                                                {calculateTotalFromPayments(selectedBooking.payments) >= selectedBooking.bookingInfo.totalAmount
                                                    ? 'Fully Paid'
                                                    : `Partial Payment (${formatPrice(selectedBooking.bookingInfo.totalAmount - calculateTotalFromPayments(selectedBooking.payments))} remaining)`
                                                }
                                            </span>
                                        </div>
                                    )}
                                    {selectedBooking?.bookingInfo?.paymentDeadline && (
                                        <div className={styles.bookingField}>
                                            <label>Payment Deadline</label>
                                            <span>{formatDateTime(selectedBooking.bookingInfo.paymentDeadline)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Flight & Passenger Details */}
                            {selectedBooking.details && selectedBooking.details.length > 0 && (
                                <div className={styles.bookingSection}>
                                    <h3 className={styles.sectionTitle}>
                                        <svg className={styles.sectionIcon} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                                        </svg>
                                        Flight & Passenger Details
                                    </h3>
                                    <div className={styles.flightDetailsHorizontal}>
                                        {selectedBooking.details.map((detail, index) => (
                                            <div key={detail.bookingDetailId} className={styles.flightDetailHorizontal}>
                                                <div className={styles.flightHeader}>
                                                    <Plane className={styles.flightIcon} />
                                                    <span className={styles.flightCode}>{detail.flightCode}</span>
                                                    <span className={styles.route}>{detail.originAirportCode} → {detail.destinationAirportCode}</span>
                                                </div>
                                                <div className={styles.flightInfoHorizontal}>
                                                    <div className={styles.flightTime}>
                                                        <Clock />
                                                        <div>
                                                            <div>Departure: {formatDateTime(detail.departureTime)}</div>
                                                            {detail.arrivalTime && (
                                                                <div>Arrival: {formatDateTime(detail.arrivalTime)}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className={styles.passengerDetails}>
                                                        <User />
                                                        <div>
                                                            <div>Passenger: {detail.passenger?.title} {detail.passenger?.firstName} {detail.passenger?.lastName}</div>
                                                            <div>DOB: {formatDate(detail.passenger?.dateOfBirth)}</div>
                                                            <div>Gender: {detail.passenger?.gender}</div>
                                                            <div>Nationality: {detail.passenger?.nationality}</div>
                                                        </div>
                                                    </div>
                                                    <div className={styles.seatInfo}>
                                                        <Package />
                                                        <span>Seat: {detail.seatCode}</span>
                                                    </div>
                                                    <div className={styles.segmentPriceInfo}>
                                                        <CreditCard />
                                                        <span>Price: {formatPrice(detail.price)}</span>
                                                    </div>
                                                    <div className={styles.bookingType}>
                                                        <span>Fare: {detail.selectedFareName}</span>
                                                    </div>
                                                    <div>
                                                        <span>Status: {detail.status}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Baggage Addons */}
                            {selectedBooking.baggageAddons && selectedBooking.baggageAddons.length > 0 && (
                                <div className={styles.bookingSection}>
                                    <h3 className={styles.sectionTitle}>
                                        <svg className={styles.sectionIcon} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                                        </svg>
                                        Baggage Addons
                                    </h3>
                                    <div className={styles.baggageGrid}>
                                        {selectedBooking.baggageAddons.map((bag, idx) => (
                                            <div key={bag.id} className={styles.baggageCard}>
                                                <div className={styles.baggageCardHeader}>
                                                    <div className={styles.baggageTypeIcon}>
                                                        <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z" />
                                                        </svg>
                                                    </div>
                                                    <div className={styles.baggageType}>{bag.type}</div>
                                                    <div className={styles.baggagePrice}>{formatPrice(bag.price)}</div>
                                                </div>
                                                <div className={styles.baggageCardBody}>
                                                    <div className={styles.baggageDetail}>
                                                        <div className={styles.baggageDetailIcon}>
                                                            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.15 48.15 0 0012 4.5c-2.291 0-4.545.16-6.75.47v13.28A47.94 47.94 0 0112 17.5c2.291 0 4.545.16 6.75.47V4.97z" />
                                                            </svg>
                                                        </div>
                                                        <div className={styles.baggageDetailText}>
                                                            <span className={styles.baggageDetailLabel}>Weight</span>
                                                            <span className={styles.baggageDetailValue}>{bag.baggageWeight} kg</span>
                                                        </div>
                                                    </div>
                                                    <div className={styles.baggageDetail}>
                                                        <div className={styles.baggageDetailIcon}>
                                                            <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        </div>
                                                        <div className={styles.baggageDetailText}>
                                                            <span className={styles.baggageDetailLabel}>Purchase Time</span>
                                                            <span className={styles.baggageDetailValue}>{formatDateTime(bag.purchaseTime)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Payment Information */}
                            {selectedBooking.payments && selectedBooking.payments.length > 0 && (
                                <div className={styles.bookingSection}>
                                    <h3 className={styles.sectionTitle}>
                                        <svg className={styles.sectionIcon} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                                        </svg>
                                        Payment Information
                                    </h3>

                                    {/* Payment Summary */}
                                    <div className={styles.paymentSummary}>
                                        <div className={styles.summaryCard}>
                                            <div className={styles.summaryItem}>
                                                <span className={styles.summaryLabel}>Total Payments:</span>
                                                <span className={styles.summaryValue}>{selectedBooking.payments.length}</span>
                                            </div>
                                            <div className={styles.summaryItem}>
                                                <span className={styles.summaryLabel}>Total Paid Amount:</span>
                                                <span className={styles.summaryValueAmount}>{formatPrice(calculateTotalFromPayments(selectedBooking.payments))}</span>
                                            </div>
                                            {selectedBooking?.bookingInfo?.totalAmount && (() => {
                                                const remaining = selectedBooking.bookingInfo.totalAmount - calculateTotalFromPayments(selectedBooking.payments);
                                                return (
                                                    <div className={styles.summaryItem}>
                                                        <span className={styles.summaryLabel}>Remaining:</span>
                                                        <span className={`${styles.summaryValueRemaining} ${remaining <= 0 ? styles.statusPaid : ''}`}>
                                                            {remaining <= 0 ? 'Fully Paid' : formatPrice(remaining)}
                                                        </span>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    {/* Individual Payments */}
                                    <div className={styles.paymentDetails}>
                                        {selectedBooking.payments.map((payment, index) => (
                                            <div key={payment.paymentId} className={styles.paymentDetail}>
                                                <div className={styles.paymentField}>
                                                    <label>Method</label>
                                                    <span>{payment.paymentMethod || 'N/A'}</span>
                                                </div>
                                                <div className={styles.paymentField}>
                                                    <label>Amount</label>
                                                    <span>{formatPrice(payment.amount)}</span>
                                                </div>
                                                <div className={styles.paymentField}>
                                                    <label>Status</label>
                                                    <span className={styles.paymentStatus}>{payment.status}</span>
                                                </div>
                                                <div className={styles.paymentField}>
                                                    <label>Date</label>
                                                    <span>{formatDateTime(payment.createdAt)}</span>
                                                </div>
                                                <div className={styles.paymentField}>
                                                    <label>Transaction ID</label>
                                                    <span>{payment.transactionId}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookingManagement;
