import { apiClient } from './api';

const API_ENDPOINTS = {
    VOUCHER_TEMPLATES: '/loyalty-service/api/v1/vouchers',
    USER_VOUCHERS: '/booking-service/api/v1/bookings/user/vouchers',
    LOYALTY_USER_VOUCHERS: '/loyalty-service/api/v1/user-vouchers',
    LOYALTY_API: '/loyalty-service/api/v1/loyalty',
    MEMBERSHIPS: '/loyalty-service/api/v1/memberships'
};

const voucherService = {
    // Get all vouchers
    getAllVouchers: async () => {
        try {
            const response = await apiClient.get(API_ENDPOINTS.VOUCHER_TEMPLATES);
            return response.data;
        } catch (error) {
            console.error('Error fetching vouchers:', error);
            throw error;
        }
    },

    // Get voucher by ID
    getVoucherById: async (id) => {
        try {
            const response = await apiClient.get(`${API_ENDPOINTS.VOUCHER_TEMPLATES}/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Create new voucher
    createVoucher: async (voucherData) => {
        try {
            const response = await apiClient.post(API_ENDPOINTS.VOUCHER_TEMPLATES, voucherData);
            return response.data;
        } catch (error) {
            console.error('Error creating voucher:', error);
            throw error;
        }
    },

    // Update voucher
    updateVoucher: async (id, voucherData) => {
        try {
            const response = await apiClient.put(`${API_ENDPOINTS.VOUCHER_TEMPLATES}/${id}`, voucherData);
            return response.data;
        } catch (error) {
            console.error('Error updating voucher:', error);
            throw error;
        }
    },

    // Delete voucher
    deleteVoucher: async (id) => {
        try {
            const response = await apiClient.delete(`${API_ENDPOINTS.VOUCHER_TEMPLATES}/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting voucher:', error);
            throw error;
        }
    },

    // Get voucher templates
    getVoucherTemplates: async () => {
        try {
            const response = await apiClient.get(API_ENDPOINTS.VOUCHER_TEMPLATES);
            // Handle paginated response structure from OpenAPI spec
            return response.data?.voucherTemplates || response.data || [];
        } catch (error) {
            console.error('Error fetching voucher templates:', error);
            throw error;
        }
    },

    // Get user vouchers (from booking service)
    getUserVouchers: async (userId) => {
        try {
            const response = await apiClient.get(API_ENDPOINTS.USER_VOUCHERS);
            return response.data;
        } catch (error) {
            console.error('Error fetching user vouchers:', error);
            throw error;
        }
    },

    // Get available vouchers for user (from loyalty service)
    getAvailableVouchers: async (userId) => {
        try {
            const response = await apiClient.get(`${API_ENDPOINTS.LOYALTY_USER_VOUCHERS}/user/${userId}`);
            // Handle paginated response structure from OpenAPI spec
            return response.data?.userVouchers || response.data || [];
        } catch (error) {
            console.error('Error fetching available vouchers:', error);
            throw error;
        }
    },

    // Redeem voucher template for user (using templateId)
    redeemVoucherTemplate: async (userId, templateId) => {
        try {
            const response = await apiClient.post(`${API_ENDPOINTS.LOYALTY_USER_VOUCHERS}/user/${userId}/redeem/${templateId}`);
            return response.data;
        } catch (error) {
            console.error('Error redeeming voucher template:', error);
            throw error;
        }
    },

    // Use voucher by code
    useVoucherByCode: async (voucherCode) => {
        try {
            const response = await apiClient.post(`${API_ENDPOINTS.LOYALTY_API}/vouchers/${voucherCode}/use`);
            return response.data;
        } catch (error) {
            console.error('Error using voucher:', error);
            throw error;
        }
    },

    // Use voucher by ID
    useVoucherById: async (voucherId) => {
        try {
            const response = await apiClient.post(`${API_ENDPOINTS.LOYALTY_USER_VOUCHERS}/${voucherId}/use`);
            return response.data;
        } catch (error) {
            console.error('Error using voucher:', error);
            throw error;
        }
    },

    // Get user membership
    getUserMembership: async (userId) => {
        try {
            const response = await apiClient.get(`${API_ENDPOINTS.MEMBERSHIPS}/user/${userId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching user membership:', error);
            throw error;
        }
    },

    // Validate voucher for booking
    validateVoucher: async (voucherCode, userId, bookingAmount, flightCode) => {
        try {
            const response = await apiClient.post(`${API_ENDPOINTS.LOYALTY_API}/vouchers/validate`, {
                voucherCode,
                userId,
                bookingAmount,
                flightCode
            });
            return response.data;
        } catch (error) {
            console.error('Error validating voucher:', error);
            throw error;
        }
    },

    // Apply voucher for booking (validate and return discount information)
    applyVoucher: async (userId, voucherCode, bookingAmount, flightCode = null) => {
        try {
            const requestData = {
                voucherCode,
                userId,
                bookingAmount: Math.round(bookingAmount * 100) / 100, // Round to 2 decimal places
                flightCode
            };
            
            console.log('Voucher validation request:', requestData);
            console.log('API endpoint:', `${API_ENDPOINTS.LOYALTY_API}/vouchers/validate`);
            
            const response = await apiClient.post(`${API_ENDPOINTS.LOYALTY_API}/vouchers/validate`, requestData);
            
            console.log('Voucher validation response:', response.data);
            
            // Handle nested data structure - API returns {data: {...}} 
            const validationResult = response.data.data || response.data;
            
            console.log('Parsed validation result:', validationResult);
            console.log('Is valid?', validationResult.valid);
            
            if (validationResult.valid) {
                return {
                    success: true,
                    code: voucherCode,
                    discount: validationResult.discountPercentage,
                    discountType: 'PERCENTAGE',
                    discountAmount: validationResult.discountAmount,
                    finalAmount: bookingAmount - validationResult.discountAmount,
                    maxDiscount: validationResult.maxDiscount,
                    minSpend: validationResult.minSpend
                };
            } else {
                const errorMessage = validationResult.errorMessage || 'Invalid voucher';
                console.log('Voucher validation failed:', errorMessage);
                return {
                    success: false,
                    message: errorMessage
                };
            }
        } catch (error) {
            console.error('Error applying voucher:', error);
            console.error('Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            return {
                success: false,
                message: error.response?.data?.errorMessage || error.response?.data?.message || error.message || 'Failed to apply voucher'
            };
        }
    }
};

export default voucherService;
