import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_ENDPOINTS = {
    VOUCHERS: '/loyalty-service/api/v1/vouchers',
    MEMBERSHIPS: '/loyalty-service/api/v1/memberships',
    POINTS: '/loyalty-service/api/v1/points',
    LOYALTY: '/loyalty-service/api/v1/loyalty',
    USER_VOUCHERS: '/loyalty-service/api/v1/user-vouchers'
};

const voucherService = {
    // Get all vouchers
    getAllVouchers: async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.VOUCHERS}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching vouchers:', error);
            throw error;
        }
    },

    // Get voucher by ID
    getVoucherById: async (id) => {
        try {
            const response = await axios.get(`${API_BASE_URL}${API_ENDPOINTS.VOUCHERS}/${id}`);
            return response.data;
        } catch (error) {
            throw error.response?.data || error.message;
        }
    },

    // Create new voucher
    createVoucher: async (voucherData) => {
        try {
            const response = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.VOUCHERS}`, voucherData);
            return response.data;
        } catch (error) {
            console.error('Error creating voucher:', error);
            throw error;
        }
    },

    // Update voucher
    updateVoucher: async (id, voucherData) => {
        try {
            const response = await axios.put(`${API_BASE_URL}${API_ENDPOINTS.VOUCHERS}/${id}`, voucherData);
            return response.data;
        } catch (error) {
            console.error('Error updating voucher:', error);
            throw error;
        }
    },

    // Delete voucher
    deleteVoucher: async (id) => {
        try {
            const response = await axios.delete(`${API_BASE_URL}${API_ENDPOINTS.VOUCHERS}/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting voucher:', error);
            throw error;
        }
    }
};

export default voucherService;
