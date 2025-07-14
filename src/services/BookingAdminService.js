import axiosInstance from '../utils/axios';

const BOOKING_SERVICE_BASE = '/booking-service/api/v1';

const BookingAdminService = {
    // Get all bookings with filters for admin
    getAllBookings: async (params = {}) => {
        try {
            const queryParams = new URLSearchParams();

            // Pagination
            if (params.page !== undefined) queryParams.append('page', params.page);
            if (params.size !== undefined) queryParams.append('size', params.size);
            if (params.sort) queryParams.append('sort', params.sort);

            // Filters
            if (params.status) queryParams.append('status', params.status);
            if (params.searchTerm) queryParams.append('searchTerm', params.searchTerm);
            if (params.userId) queryParams.append('userId', params.userId);
            if (params.flightCode) queryParams.append('flightCode', params.flightCode);
            if (params.totalAmountMin) queryParams.append('totalAmountMin', params.totalAmountMin);
            if (params.totalAmountMax) queryParams.append('totalAmountMax', params.totalAmountMax);
            if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
            if (params.dateTo) queryParams.append('dateTo', params.dateTo);

            const response = await axiosInstance.get(`${BOOKING_SERVICE_BASE}/admin/bookings?${queryParams.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching bookings:', error);
            throw error;
        }
    },

    // Get booking details by reference for admin
    getBookingDetails: async (bookingReference) => {
        try {
            const response = await axiosInstance.get(`${BOOKING_SERVICE_BASE}/admin/bookings/${bookingReference}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching booking details:', error);
            throw error;
        }
    },

    // Get booking statistics for admin dashboard
    getBookingStatistics: async (dateFrom = null, dateTo = null) => {
        try {
            const params = new URLSearchParams();
            if (dateFrom) params.append('dateFrom', dateFrom);
            if (dateTo) params.append('dateTo', dateTo);

            const response = await axiosInstance.get(`${BOOKING_SERVICE_BASE}/admin/bookings/statistics?${params.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching booking statistics:', error);
            throw error;
        }
    },

    // Get revenue from payments (more accurate as it includes reschedule fees and excludes refunded amounts)
    getRevenueFromPayments: async (dateFrom = null, dateTo = null) => {
        try {
            const params = new URLSearchParams();
            if (dateFrom) params.append('dateFrom', dateFrom);
            if (dateTo) params.append('dateTo', dateTo);

            const response = await axiosInstance.get(`${BOOKING_SERVICE_BASE}/admin/payments/revenue?${params.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching revenue from payments:', error);
            throw error;
        }
    },

    // Get enhanced booking statistics including paid status and payment-based revenue
    getEnhancedBookingStatistics: async (dateFrom = null, dateTo = null) => {
        try {
            const params = new URLSearchParams();
            if (dateFrom) params.append('dateFrom', dateFrom);
            if (dateTo) params.append('dateTo', dateTo);

            const response = await axiosInstance.get(`${BOOKING_SERVICE_BASE}/admin/bookings/enhanced-statistics?${params.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching enhanced booking statistics:', error);
            throw error;
        }
    },

    // Get daily revenue data for admin analytics
    getDailyRevenue: async (dateFrom = null, dateTo = null) => {
        try {
            const params = new URLSearchParams();
            if (dateFrom) params.append('dateFrom', dateFrom);
            if (dateTo) params.append('dateTo', dateTo);

            const response = await axiosInstance.get(`${BOOKING_SERVICE_BASE}/admin/bookings/revenue/daily?${params.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching daily revenue:', error);
            throw error;
        }
    },

    // Get top routes for admin analytics
    getTopRoutes: async (dateFrom = null, dateTo = null, limit = 10) => {
        try {
            const params = new URLSearchParams();
            if (dateFrom) params.append('dateFrom', dateFrom);
            if (dateTo) params.append('dateTo', dateTo);
            params.append('limit', limit.toString());

            const response = await axiosInstance.get(`${BOOKING_SERVICE_BASE}/admin/bookings/top-routes?${params.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching top routes:', error);
            throw error;
        }
    },

    // Update booking status (admin only)
    updateBookingStatus: async (bookingReference, newStatus, reason = null) => {
        try {
            const params = new URLSearchParams();
            params.append('newStatus', newStatus);
            if (reason) params.append('reason', reason);

            const response = await axiosInstance.put(`${BOOKING_SERVICE_BASE}/admin/bookings/${bookingReference}/status?${params.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error updating booking status:', error);
            throw error;
        }
    },

    // Export bookings data
    exportBookings: async (status = null, dateFrom = null, dateTo = null, format = 'csv') => {
        try {
            const params = new URLSearchParams();
            if (status) params.append('status', status);
            if (dateFrom) params.append('dateFrom', dateFrom);
            if (dateTo) params.append('dateTo', dateTo);
            params.append('format', format);

            const response = await axiosInstance.get(`${BOOKING_SERVICE_BASE}/admin/bookings/export?${params.toString()}`);
            return response.data;
        } catch (error) {
            console.error('Error exporting bookings:', error);
            throw error;
        }
    }
};

export default BookingAdminService;
