import axiosInstance from '../utils/axios';

class RescheduleService {
    /**
     * Execute the flight reschedule
     * @param {string} bookingDetailId - ID of the booking detail to reschedule
     * @param {Object} rescheduleRequest - Reschedule request data
     * @returns {Promise<Object>} Response with reschedule result
     */
    static async rescheduleBooking(bookingDetailId, rescheduleRequest) {
        try {
            const response = await axiosInstance.post(
                `/booking-service/api/v1/bookings/${bookingDetailId}/reschedule`,
                rescheduleRequest
            );

            if (response.data && response.data.success) {
                return response.data.data;
            } else {
                throw new Error(response.data?.message || 'Failed to reschedule booking');
            }
        } catch (error) {
            console.error('RescheduleService - rescheduleBooking error:', error);

            if (error.response?.status === 400) {
                throw new Error(error.response?.data?.message || 'Invalid reschedule request');
            }
            if (error.response?.status === 404) {
                throw new Error('Booking detail not found');
            }
            if (error.response?.status === 409) {
                throw new Error('Selected seat is no longer available');
            }

            throw new Error(error.response?.data?.message || error.message || 'Failed to reschedule booking');
        }
    }

    /**
     * Check if a booking detail can be rescheduled
     * @param {string} bookingDetailId - The booking detail ID
     * @returns {Promise<boolean>} True if can reschedule, false otherwise
     */
    static async canRescheduleBookingDetail(bookingDetailId) {
        try {
            const response = await axiosInstance.get(
                `/booking-service/api/v1/bookings/${bookingDetailId}/reschedule/eligibility`
            );

            if (response.data && response.data.success) {
                return response.data.data;
            }
            return false;
        } catch (error) {
            console.error('RescheduleService - canRescheduleBookingDetail error:', error);
            return false;
        }
    }

    /**
     * Get reschedule history for a booking
     * @param {string} bookingReference - Booking reference
     * @returns {Promise<Array>} Array of reschedule history entries
     */
    static async getRescheduleHistory(bookingReference) {
        try {
            const response = await axiosInstance.get(
                `/booking-service/api/v1/bookings/${bookingReference}/reschedule-history`
            );

            if (response.data && response.data.success) {
                return response.data.data || [];
            } else {
                throw new Error(response.data?.message || 'Failed to fetch reschedule history');
            }
        } catch (error) {
            console.error('RescheduleService - getRescheduleHistory error:', error);

            if (error.response?.status === 404) {
                return []; // No history found is not an error
            }

            throw new Error(error.response?.data?.message || error.message || 'Failed to fetch reschedule history');
        }
    }

    /**
     * Check if a booking detail is eligible for rescheduling
     * @param {Object} bookingDetail - Booking detail object
     * @returns {Object} Eligibility result with reason if not eligible
     */
    static checkRescheduleEligibility(bookingDetail) {
        const currentTime = new Date();
        const departureTime = new Date(bookingDetail.departureTime);
        const hoursUntilDeparture = (departureTime - currentTime) / (1000 * 60 * 60);

        // Check if flight is within 24 hours
        if (hoursUntilDeparture <= 24) {
            return {
                eligible: false,
                reason: 'Cannot reschedule flights within 24 hours of departure'
            };
        }

        // Check if booking is paid
        if (bookingDetail.status !== 'PAID') {
            return {
                eligible: false,
                reason: 'Only paid bookings can be rescheduled'
            };
        }

        // Check if flight has already departed
        if (currentTime > departureTime) {
            return {
                eligible: false,
                reason: 'Cannot reschedule flights that have already departed'
            };
        }

        return {
            eligible: true,
            reason: null
        };
    }

    /**
     * Format price for display
     * @param {number} amount - Price amount
     * @param {string} currency - Currency code (default: VND)
     * @returns {string} Formatted price string
     */
    static formatPrice(amount, currency = 'VND') {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    /**
     * Determine if additional payment is required
     * @param {number} oldPrice - Old fare price (including VAT)
     * @param {number} newPrice - New fare price (including VAT)
     * @returns {Object} Payment requirement details
     */
    static calculatePaymentRequirement(oldPrice, newPrice) {
        const difference = newPrice - oldPrice;

        if (difference > 0) {
            return {
                requiresPayment: true,
                additionalAmount: difference,
                message: `Additional payment of ${this.formatPrice(difference)} is required`
            };
        } else if (difference < 0) {
            return {
                requiresPayment: false,
                additionalAmount: 0,
                message: `New fare is ${this.formatPrice(Math.abs(difference))} lower. No refund will be provided.`
            };
        } else {
            return {
                requiresPayment: false,
                additionalAmount: 0,
                message: 'No additional payment required'
            };
        }
    }
}

export default RescheduleService;
