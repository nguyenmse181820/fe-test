import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { XCircleIcon } from '@heroicons/react/24/solid';

const PaymentFailed = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const message = searchParams.get('message');
    if (message) {
      setErrorMessage(decodeURIComponent(message));
    } else {
      setErrorMessage('Thanh toán không thành công. Vui lòng thử lại.');
    }
  }, [searchParams]);

  const handleRetry = () => {
    navigate('/bookings'); // Go back to bookings to retry payment
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
              Thanh toán thất bại
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Rất tiếc, đã có lỗi xảy ra trong quá trình thanh toán.
            </p>
          </div>

          <div className="mt-6">
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-red-800 mb-2">Lý do lỗi:</h3>
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-col space-y-3">
            <button
              onClick={handleRetry}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Thử lại thanh toán
            </button>
            <button
              onClick={handleGoHome}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Về trang chủ
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Nếu vấn đề vẫn tiếp tục, vui lòng liên hệ với bộ phận hỗ trợ khách hàng.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailed;
