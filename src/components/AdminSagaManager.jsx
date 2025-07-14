import React, { useState } from 'react';
import axios from '../utils/axios';

const AdminSagaManager = () => {
    const [sagaReport, setSagaReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState('');

    const getSagaReport = async () => {
        setLoading(true);
        try {
            const response = await axios.get('/api/v1/payment/admin/saga-status-report');
            setSagaReport(response.data);
            setResults('Saga report loaded successfully');
        } catch (error) {
            console.error('Error getting saga report:', error);
            setResults(`Error: ${error.response?.data?.error || error.message}`);
        }
        setLoading(false);
    };

    const fixAllStuckSagas = async () => {
        setLoading(true);
        try {
            const response = await axios.post('/api/v1/payment/admin/fix-all-stuck-sagas');
            setResults(`Bulk fix completed:\n- Fixed: ${response.data.fixed}\n- Skipped: ${response.data.skipped}\n- Details: ${JSON.stringify(response.data.details, null, 2)}`);
        } catch (error) {
            console.error('Error fixing sagas:', error);
            setResults(`Error: ${error.response?.data?.error || error.message}`);
        }
        setLoading(false);
    };

    const [bookingRef, setBookingRef] = useState('');
    
    const forceFixSaga = async () => {
        if (!bookingRef.trim()) {
            setResults('Please enter a booking reference');
            return;
        }
        
        setLoading(true);
        try {
            const response = await axios.post(`/api/v1/payment/force-saga-progression/${bookingRef}`);
            setResults(`Force fix result: ${JSON.stringify(response.data, null, 2)}`);
        } catch (error) {
            console.error('Error force fixing saga:', error);
            setResults(`Error: ${error.response?.data?.error || error.message}`);
        }
        setLoading(false);
    };

    const nuclearFixSaga = async () => {
        if (!bookingRef.trim()) {
            setResults('Please enter a booking reference');
            return;
        }
        
        if (!confirm(`NUCLEAR OPTION: Are you absolutely sure you want to force complete saga for ${bookingRef}? This cannot be undone!`)) {
            return;
        }
        
        setLoading(true);
        try {
            const response = await axios.post(`/api/v1/payment/admin/nuclear-fix-saga/${bookingRef}`);
            setResults(`Nuclear fix result: ${JSON.stringify(response.data, null, 2)}`);
        } catch (error) {
            console.error('Error nuclear fixing saga:', error);
            setResults(`Error: ${error.response?.data?.error || error.message}`);
        }
        setLoading(false);
    };

    return (
        <div className="max-w-6xl mx-auto p-6 bg-white shadow-lg rounded-lg">
            <h1 className="text-3xl font-bold text-red-600 mb-6">
                🚨 ADMIN: Saga Manager - NUCLEAR OPTION
            </h1>
            
            <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6">
                <h2 className="text-lg font-semibold text-yellow-800">⚠️ CẢNH BÁO</h2>
                <p className="text-yellow-700">
                    Đây là công cụ mạnh tay để loại bỏ hoàn toàn vấn đề saga bị stuck. 
                    Chỉ sử dụng khi bạn hiểu rõ hậu quả!
                </p>
            </div>

            {/* Saga Status Report */}
            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">📊 Saga Status Report</h2>
                <button 
                    onClick={getSagaReport}
                    disabled={loading}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
                >
                    {loading ? 'Loading...' : 'Get Saga Report'}
                </button>
                
                {sagaReport && (
                    <div className="bg-gray-100 p-4 rounded">
                        <h3 className="font-semibold mb-2">Report Summary:</h3>
                        <p><strong>Total Sagas:</strong> {sagaReport.totalSagas}</p>
                        <p><strong>Problematic Sagas:</strong> {sagaReport.problematicCount}</p>
                        
                        <h3 className="font-semibold mb-2 mt-4">Status Distribution:</h3>
                        <pre className="text-sm bg-white p-2 rounded">
                            {JSON.stringify(sagaReport.statusDistribution, null, 2)}
                        </pre>
                        
                        {sagaReport.problematicSagas && sagaReport.problematicSagas.length > 0 && (
                            <>
                                <h3 className="font-semibold mb-2 mt-4 text-red-600">🚨 Problematic Sagas:</h3>
                                <div className="max-h-64 overflow-y-auto bg-white p-2 rounded">
                                    <pre className="text-sm">
                                        {JSON.stringify(sagaReport.problematicSagas, null, 2)}
                                    </pre>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Bulk Fix */}
            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">🔧 Bulk Fix All Stuck Sagas</h2>
                <button 
                    onClick={fixAllStuckSagas}
                    disabled={loading}
                    className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded"
                >
                    {loading ? 'Fixing...' : 'Fix All Stuck Sagas'}
                </button>
                <p className="text-sm text-gray-600 mt-2">
                    Tự động fix tất cả saga bị stuck trong các trạng thái problematic
                </p>
            </div>

            {/* Individual Fix */}
            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">🎯 Fix Individual Saga</h2>
                <div className="flex gap-4 mb-4">
                    <input
                        type="text"
                        value={bookingRef}
                        onChange={(e) => setBookingRef(e.target.value)}
                        placeholder="Booking Reference (e.g., BK001, BK002)"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={forceFixSaga}
                        disabled={loading || !bookingRef.trim()}
                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                    >
                        {loading ? 'Fixing...' : 'Force Fix Saga'}
                    </button>
                    <button 
                        onClick={nuclearFixSaga}
                        disabled={loading || !bookingRef.trim()}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                    >
                        {loading ? 'Fixing...' : '💣 NUCLEAR FIX'}
                    </button>
                </div>
                <div className="text-sm text-gray-600 mt-2">
                    <p><strong>Force Fix:</strong> Kiểm tra và trigger saga progression nếu payment đã complete</p>
                    <p><strong>Nuclear Fix:</strong> Force complete saga bất kể trạng thái (SỬ DỤNG CẨN THẬN!)</p>
                </div>
            </div>

            {/* Results */}
            {results && (
                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">📋 Results</h2>
                    <div className="bg-gray-100 p-4 rounded">
                        <pre className="text-sm whitespace-pre-wrap">{results}</pre>
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-100 border-l-4 border-blue-500 p-4">
                <h2 className="text-lg font-semibold text-blue-800 mb-2">📖 Usage Instructions</h2>
                <ol className="text-blue-700 text-sm list-decimal ml-4">
                    <li>Trước tiên, click "Get Saga Report" để xem tình trạng hiện tại</li>
                    <li>Nếu có saga bị stuck, click "Fix All Stuck Sagas" để fix hàng loạt</li>
                    <li>Hoặc nhập booking reference để fix từng booking cụ thể</li>
                    <li>Nuclear Fix chỉ dùng khi tất cả cách khác thất bại</li>
                    <li>Luôn kiểm tra results sau khi fix</li>
                </ol>
            </div>
        </div>
    );
};

export default AdminSagaManager;
