import axiosInstance from "@/utils/axios";

export const createNewBoardingPassService = async (boardingPassData) => {
    try {
        const response = await axiosInstance.post('check-in-service/api/v1/boarding-pass', boardingPassData);
        return response.data.data;
    } catch (error) {
        console.error('Error creating new boarding pass:', error);
    }
}


export const getCheckedInBoardingPassesService = async (bookingReference) => {
    try {
        const response = await axiosInstance.get(`check-in-service/api/v1/boarding-pass?bookingReference=${bookingReference}`);
        return response.data.data;
    } catch (error) {
        console.error('Error creating new boarding pass:', error);
    }
}