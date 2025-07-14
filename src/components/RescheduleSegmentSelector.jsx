import React, { useState } from 'react';
import { X, Clock, MapPin, Calendar, Plane, ArrowRight, RotateCcw } from 'lucide-react';
import RescheduleService from '../services/RescheduleService';

const RescheduleSegmentSelector = ({
    isOpen,
    onClose,
    booking,
    onSegmentSelect
}) => {
    const [selectedSegment, setSelectedSegment] = useState(null);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (dateString) => {
        return new Date(dateString).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getCityName = (code) => {
        const cities = {
            'SGN': 'Ho Chi Minh City',
            'HAN': 'Hanoi',
            'DAD': 'Da Nang',
            'CXR': 'Nha Trang',
            'PQC': 'Phu Quoc'
        };
        return cities[code] || code;
    };

    const eligibleSegments = booking.details ? booking.details.filter(detail => {
        const eligibility = RescheduleService.checkRescheduleEligibility(detail);
        return eligibility.eligible;
    }) : [];

    const handleSegmentSelect = (segment) => {
        setSelectedSegment(segment);
    };

    const handleProceed = () => {
        if (selectedSegment) {
            onSegmentSelect(selectedSegment);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Select Flight Segment to Reschedule</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-6">
                        <p className="text-gray-600">
                            Your booking contains multiple flight segments. Please select which segment you would like to reschedule:
                        </p>
                    </div>

                    <div className="space-y-4">
                        {eligibleSegments.map((segment, index) => {
                            const isSelected = selectedSegment?.bookingDetailId === segment.bookingDetailId;

                            return (
                                <div
                                    key={segment.bookingDetailId}
                                    className={`border rounded-lg p-4 cursor-pointer transition-all ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    onClick={() => handleSegmentSelect(segment)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <div className="flex items-center space-x-2">
                                                <Plane className="w-4 h-4 text-blue-600" />
                                                <span className="font-semibold">{segment.flightCode}</span>
                                            </div>
                                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                                                <span>{getCityName(segment.departureAirportCode)}</span>
                                                <ArrowRight className="w-3 h-3" />
                                                <span>{getCityName(segment.arrivalAirportCode)}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-medium text-gray-900">
                                                Segment {index + 1}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {segment.fareClass}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex items-center space-x-6 text-sm text-gray-600">
                                        <div className="flex items-center space-x-1">
                                            <Clock className="w-4 h-4" />
                                            <span>{formatTime(segment.departureTime)}</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <Calendar className="w-4 h-4" />
                                            <span>{formatDate(segment.departureTime)}</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <MapPin className="w-4 h-4" />
                                            <span>Seat: {segment.seatCode}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {eligibleSegments.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <RotateCcw className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>No segments are eligible for rescheduling at this time.</p>
                            <p className="text-sm mt-2">
                                Segments can only be rescheduled if they are more than 24 hours away from departure.
                            </p>
                        </div>
                    )}

                    <div className="flex space-x-3 mt-6">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleProceed}
                            disabled={!selectedSegment}
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                        >
                            <RotateCcw className="w-4 h-4" />
                            <span>Proceed to Reschedule</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RescheduleSegmentSelector;
