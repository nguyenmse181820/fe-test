import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { getFreshFlightDetails } from '../../services/BookingService';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [paymentDetails, setPaymentDetails] = useState({
    booking: '',
    transaction: '',
    amount: ''
  });
  const [refreshingData, setRefreshingData] = useState(false);

  useEffect(() => {
    const booking = searchParams.get('booking');
    const transaction = searchParams.get('transaction');
    const amount = searchParams.get('amount');
    const flightId = searchParams.get('flightId'); // If available from booking

    if (booking && transaction && amount) {
      setPaymentDetails({
        booking,
        transaction,
        amount: formatAmount(amount)
      });

      // Refresh flight data in background to ensure updated seat availability
      if (flightId) {
        refreshFlightData(flightId);
      }
    }
  }, [searchParams]);

  const refreshFlightData = async (flightId) => {
    try {
      setRefreshingData(true);
      await getFreshFlightDetails(flightId);
      console.log('Flight data refreshed successfully after payment');
    } catch (error) {
      console.warn('Failed to refresh flight data after payment:', error.message);
      // Don't show error to user as this is background refresh
    } finally {
      setRefreshingData(false);
    }
  };

  const formatAmount = (amount) => {
    const numAmount = parseInt(amount);
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(numAmount);
  };

  const handleGoToBookings = () => {
    navigate('/booking-overview');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
            <h2 className="mt-4 text-2xl font-bold text-gray-900">
              Thanh toán thành công!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Cảm ơn bạn đã đặt vé. Thông tin đặt vé đã được gửi vào email của bạn.
            </p>
          </div>

          <div className="mt-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Chi tiết thanh toán</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Mã đặt vé:</span>
                  <span className="text-sm font-medium text-gray-900">{paymentDetails.booking}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Mã giao dịch:</span>
                  <span className="text-sm font-medium text-gray-900">{paymentDetails.transaction}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Số tiền:</span>
                  <span className="text-sm font-medium text-green-600">{paymentDetails.amount}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col space-y-3">
            <button
              onClick={handleGoToBookings}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to booking Overview
            </button>
            <button
              onClick={handleGoHome}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go Homepage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
