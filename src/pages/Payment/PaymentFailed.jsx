import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { XCircleIcon } from '@heroicons/react/24/solid';

const PaymentFailed = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState('');
  const bookingReference = searchParams.get('bookingReference');

  useEffect(() => {
    // Get error message from URL parameters
    const message = searchParams.get('message');
    // Get additional information if available
    const vnp_ResponseCode = searchParams.get('vnp_ResponseCode');
    const errorCode = searchParams.get('errorCode');
    
    if (message) {
      // Try to translate common Vietnamese error messages to English
      const translatedMessage = translateErrorMessage(decodeURIComponent(message));
      setErrorMessage(translatedMessage);
    } else if (vnp_ResponseCode || errorCode) {
      // Handle VNPay specific response codes or other error codes
      const code = vnp_ResponseCode || errorCode;
      setErrorMessage(`Payment gateway error (Code: ${code}). Please try again or use a different payment method.`);
    } else {
      setErrorMessage('Payment was unsuccessful. Please try again.');
    }
  }, [searchParams]);

  // Function to translate common Vietnamese error messages
  const translateErrorMessage = (message) => {
    if (message.includes('Thanh toán không thành công')) {
      return 'Payment was unsuccessful. Please try again.';
    }
    if (message.includes('Giao dịch đã tồn tại')) {
      return 'Transaction already exists.';
    }
    if (message.includes('Số tiền không hợp lệ')) {
      return 'Invalid payment amount.';
    }
    // Return original message if no translation found
    return message;
  };

  const handleRetry = () => {
    if (bookingReference) {
      // If we have a booking reference, go directly to that booking's details
      navigate(`/booking-details/${bookingReference}`);
    } else {
      // Otherwise, go to the booking overview page
      navigate('/booking-overview');
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <XCircleIcon className="mx-auto h-16 w-16 text-red-500" />
            <h2 className="mt-4 text-2xl font-bold text-gray-900">
              Payment Failed
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Sorry, an error occurred during the payment process. Your booking was not completed.
            </p>
            {bookingReference && (
              <p className="mt-1 text-sm font-medium text-gray-800">
                Booking Reference: <span className="font-mono">{bookingReference}</span>
              </p>
            )}
          </div>

          <div className="mt-6">
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-red-800 mb-2">Error Reason:</h3>
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col space-y-3">
            <button
              onClick={handleRetry}
              className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {bookingReference ? 'View Booking Details' : 'View My Bookings'}
            </button>
            <button
              onClick={handleGoHome}
              className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7m-7-7v14" />
              </svg>
              Back to Home
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              If the problem persists, please contact our customer support team at <span className="font-medium">support@boeing-airlines.com</span> or call <span className="font-medium">1-800-BOEING</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailed;
