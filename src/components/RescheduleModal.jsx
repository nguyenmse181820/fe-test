import React, { useState, useEffect } from 'react';
import { X, Search, Plane, Calendar, Clock, MapPin, ArrowRight, AlertCircle, CheckCircle, CreditCard, Loader2, Info } from 'lucide-react';
import RescheduleService from '../services/RescheduleService';
import FlightService from '../services/FlightService';
import SeatMap from './SeatMap/SeatMap';
import { useToast } from '../hooks/use-toast';

const RescheduleModal = ({
    isOpen,
    onClose,
    bookingDetail,
    bookingReference,
    onRescheduleSuccess
}) => {
    const { toast } = useToast();
    const [currentStep, setCurrentStep] = useState(1); // 1: Search, 2: Select, 3: Confirm
    const [searchParams, setSearchParams] = useState({
        origin: bookingDetail?.departureAirportCode || '',
        destination: bookingDetail?.arrivalAirportCode || '',
        departureDate: ''
    });
    const [searchResults, setSearchResults] = useState([]);
    const [selectedFlight, setSelectedFlight] = useState(null);
    const [selectedFare, setSelectedFare] = useState(null);
    const [selectedSeat, setSelectedSeat] = useState(null);
    const [rescheduleResult, setRescheduleResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPaymentWarning, setShowPaymentWarning] = useState(false);
    const [airports, setAirports] = useState([]);
    const [routes, setRoutes] = useState([]);

    useEffect(() => {
        if (!isOpen) {
            resetModal();
        }
    }, [isOpen]);

    // Load airports and routes data
    useEffect(() => {
        const loadData = async () => {
            try {
                const [airportsData, routesData] = await Promise.all([
                    FlightService.getAirports(),
                    FlightService.getRoutes().catch(() => [])
                ]);
                setAirports(airportsData);
                setRoutes(routesData);
            } catch (error) {
                console.error('Failed to load airports and routes:', error);
                setAirports([]);
                setRoutes([]);
            }
        };

        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    const resetModal = () => {
        setCurrentStep(1);
        setSearchResults([]);
        setSelectedFlight(null);
        setSelectedFare(null);
        setSelectedSeat(null);
        setRescheduleResult(null);
        setError('');
        setShowPaymentWarning(false);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Date TBA';
        try {
            return new Date(dateString).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch (error) {
            return 'Date TBA';
        }
    };

    const formatTime = (dateString) => {
        if (!dateString) return '--:--';
        try {
            return new Date(dateString).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return '--:--';
        }
    };

    const formatPrice = (amount) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    };

    const getCityName = (code) => {
        const airport = airports.find(a => a.code === code);
        return airport ? airport.name : code;
    };

    const handleSearch = async () => {
        if (!searchParams.origin) {
            setError('Please select an origin airport');
            return;
        }

        if (!searchParams.destination) {
            setError('Please select a destination airport');
            return;
        }

        if (!searchParams.departureDate) {
            setError('Please select a departure date');
            return;
        }

        if (searchParams.origin === searchParams.destination) {
            setError('Origin and destination cannot be the same');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Find the route ID based on the selected origin and destination
            const route = routes.find(r =>
                r.origin?.code === searchParams.origin &&
                r.destination?.code === searchParams.destination
            );

            if (!route) {
                setError('No route found between the selected airports. Please select a different route.');
                setLoading(false);
                return;
            }

            const searchData = {
                routeId: route.id,
                departureDate: searchParams.departureDate,
                noAdults: 1,
                noChildren: 0,
                noBabies: 0
            };

            const results = await FlightService.searchFlights(searchData);
            console.log('Search results:', results);

            // Transform API response to match UI expectations
            const transformedResults = (results.directs || []).map(flight => ({
                ...flight,
                id: flight.flightId, // Map flightId to id
                aircraftId: flight.aircraft?.id,
                aircraftType: flight.aircraft?.model,
                basePrice: flight.availableFares?.[0]?.price || 0,
                fareDetails: flight.availableFares?.map(fare => ({
                    ...fare,
                    fareClass: fare.fareType,
                    name: fare.name
                })) || [],
                departureAirportCode: flight.originAirport?.code,
                arrivalAirportCode: flight.destinationAirport?.code,
                arrivalTime: flight.estimatedArrivalTime,
                duration: flight.flightDurationMinutes || 0
            }));

            console.log('Transformed results:', transformedResults);

            // Filter out current flight and past flights
            const currentTime = new Date();
            const filteredResults = transformedResults.filter(flight => {
                const flightTime = new Date(flight.departureTime);
                console.log('Flight filter check:', {
                    flightId: flight.id,
                    hasId: !!flight.id,
                    currentBookingFlightId: bookingDetail?.flightId,
                    isDifferentFlight: flight.id !== bookingDetail?.flightId,
                    flightTime: flightTime,
                    currentTime: currentTime,
                    isFuture: flightTime > currentTime,
                    hasDepartureTime: !!flight.departureTime,
                    hasArrivalTime: !!flight.arrivalTime
                });

                return flight.id && // Must have valid ID
                    flight.id !== bookingDetail?.flightId &&
                    flightTime > currentTime &&
                    flight.departureTime && // Must have departure time
                    flight.arrivalTime; // Must have arrival time
            });

            console.log('Filtered results:', filteredResults);

            // For debugging, let's also try with minimal filtering
            const minimalFilteredResults = transformedResults.filter(flight => {
                return flight.id && flight.departureTime;
            });
            console.log('Minimal filtered results:', minimalFilteredResults);

            setSearchResults(filteredResults.length > 0 ? filteredResults : minimalFilteredResults);
            setCurrentStep(2);
        } catch (err) {
            setError(err.message || 'Failed to search flights');
        } finally {
            setLoading(false);
        }
    };

    const handleFlightSelect = async (flight) => {
        if (!flight.id) {
            setError('Invalid flight data. Please try again.');
            return;
        }

        setSelectedFlight(flight);
        setSelectedSeat(null); // Reset seat selection
        setLoading(true);
        setError('');

        try {
            // Don't pre-select any fare class, let user choose seat first
            // The fare will be determined when seat is selected
            setSelectedFare(null);
            console.log('Flight selected:', flight);
            console.log('Available fareDetails:', flight.fareDetails);

        } catch (err) {
            setError(err.message || 'Failed to load flight details');
        } finally {
            setLoading(false);
        }
    };

    const handleSeatSelect = (seat) => {
        if (!seat.available) return;

        // Find the fare class that contains this seat
        const fareForSeat = selectedFlight.fareDetails?.find(fare =>
            fare.seats?.includes(seat.code)
        );

        console.log('Selected seat:', seat.code);
        console.log('Fare for seat:', fareForSeat);

        if (fareForSeat) {
            setSelectedFare(fareForSeat);
            console.log('Updated selectedFare to:', fareForSeat);
        }

        setSelectedSeat(seat);
        // Auto advance to confirmation step
        setCurrentStep(3);
    };

    const calculatePriceDifference = () => {
        if (!bookingDetail) return 0;

        const oldPrice = bookingDetail.price; // Already includes VAT

        // If selectedFare is null, try to find it based on selected seat
        let fareToUse = selectedFare;
        if (!fareToUse && selectedSeat && selectedFlight) {
            fareToUse = selectedFlight.fareDetails?.find(fare =>
                fare.seats?.includes(selectedSeat.code)
            );
        }

        const newPrice = fareToUse?.price || selectedFlight?.basePrice || 0;
        const newPriceWithVAT = newPrice * 1.1; // Add 10% VAT

        return newPriceWithVAT - oldPrice;
    };

    const handleConfirmReschedule = async () => {
        if (!selectedFlight || !selectedFlight.id || !selectedSeat) {
            setError('Please select flight and seat');
            return;
        }

        // If selectedFare is null, find it based on the selected seat
        let fareToUse = selectedFare;
        if (!fareToUse) {
            fareToUse = selectedFlight.fareDetails?.find(fare =>
                fare.seats?.includes(selectedSeat.code)
            );
        }

        if (!fareToUse) {
            setError('Unable to determine fare for selected seat');
            return;
        }

        const priceDifference = calculatePriceDifference();

        // Show payment warning if price difference > 0
        if (priceDifference > 0 && !showPaymentWarning) {
            setShowPaymentWarning(true);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const rescheduleRequest = {
                newFlightId: selectedFlight.id,
                newFareName: fareToUse.name,
                newSeatCode: selectedSeat.code,
                paymentMethod: 'VNPAY'
            };

            const result = await RescheduleService.rescheduleBooking(
                bookingDetail.bookingDetailId,
                rescheduleRequest
            );

            setRescheduleResult(result);

            // Handle different payment scenarios
            if (result.paymentStatus === 'PAYMENT_REQUIRED' && result.paymentUrl) {
                // Redirect to payment page
                window.location.href = result.paymentUrl;
            } else {
                // Success without payment or no refund case
                toast({
                    title: "Reschedule Successful",
                    description: result.message,
                    variant: "default"
                });

                setTimeout(() => {
                    onRescheduleSuccess();
                    onClose();
                }, 2000);
            }
        } catch (err) {
            setError(err.message || 'Failed to reschedule booking');
        } finally {
            setLoading(false);
        }
    };

    const renderStep1 = () => {
        console.log('BookingDetail object:', bookingDetail);

        return (
            <div className="space-y-6">
                <div className="border-b pb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Search New Flight</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        Current booking: {bookingDetail?.flightCode} • {getCityName(bookingDetail?.departureAirportCode)} → {getCityName(bookingDetail?.arrivalAirportCode)}
                    </p>
                    <p className="text-sm text-blue-600 mt-1">
                        You can change the route, date, and seat for your reschedule
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            From
                        </label>
                        <select
                            value={searchParams.origin}
                            onChange={(e) => setSearchParams({ ...searchParams, origin: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Select origin airport</option>
                            {airports.map(airport => (
                                <option key={airport.code} value={airport.code}>
                                    {airport.name} ({airport.code})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            To
                        </label>
                        <select
                            value={searchParams.destination}
                            onChange={(e) => setSearchParams({ ...searchParams, destination: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Select destination airport</option>
                            {airports.map(airport => (
                                <option key={airport.code} value={airport.code}>
                                    {airport.name} ({airport.code})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Departure Date
                        </label>
                        <input
                            type="date"
                            value={searchParams.departureDate}
                            onChange={(e) => setSearchParams({ ...searchParams, departureDate: e.target.value })}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <span className="text-red-700">{error}</span>
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSearch}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        Search Flights
                    </button>
                </div>
            </div>
        );
    }; const renderStep2 = () => (
        <div className="space-y-6">
            <div className="border-b pb-4">
                <h3 className="text-lg font-semibold text-gray-900">Select New Flight & Seat</h3>
                <p className="text-sm text-gray-600 mt-1">
                    {searchResults.length} flights found for {getCityName(searchParams.origin)} → {getCityName(searchParams.destination)}
                </p>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-4">
                {searchResults.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <Plane className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No flights found for your search criteria.</p>
                        <p className="text-sm mt-2">Try adjusting your search parameters.</p>
                    </div>
                ) : (
                    searchResults.map((flight) => (
                        <div
                            key={flight.id}
                            className={`border rounded-lg p-4 cursor-pointer transition-all ${selectedFlight?.id === flight.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                                } ${!flight.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                            onClick={() => flight.id && handleFlightSelect(flight)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-gray-100 rounded-lg">
                                        <Plane className="h-5 w-5 text-gray-600" />
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900">{flight.flightCode}</div>
                                        <div className="text-sm text-gray-600">{flight.aircraftType}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-medium text-gray-900">
                                        {flight.basePrice ? formatPrice(flight.basePrice) : 'Contact for price'}
                                    </div>
                                    <div className="text-sm text-gray-600">+ VAT</div>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="text-center">
                                        <div className="font-medium text-gray-900">{formatTime(flight.departureTime)}</div>
                                        <div className="text-sm text-gray-600">{flight.departureAirportCode}</div>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <div className="h-px bg-gray-300 w-8"></div>
                                        <ArrowRight className="h-4 w-4" />
                                        <div className="h-px bg-gray-300 w-8"></div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-medium text-gray-900">{formatTime(flight.arrivalTime)}</div>
                                        <div className="text-sm text-gray-600">{flight.arrivalAirportCode}</div>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-600">
                                    {flight.duration && flight.duration > 0 ?
                                        `${Math.floor(flight.duration / 60)}h ${flight.duration % 60}m` :
                                        'Duration TBA'
                                    }
                                </div>
                            </div>
                        </div>
                    )))}
            </div>

            {/* Seat selection for selected flight */}
            {selectedFlight && selectedFlight.id && (
                <div className="border-t pt-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Select Seat</h4>
                    {selectedFlight.aircraftId ? (
                        <div className="border rounded-lg p-4">
                            <SeatMap
                                flightId={selectedFlight.id}
                                aircraftId={selectedFlight.aircraftId}
                                passengerCount={1}
                                selectedSeats={selectedSeat ? [selectedSeat.code] : []}
                                onSeatSelect={(seats) => {
                                    if (seats.length > 0) {
                                        handleSeatSelect({ code: seats[0], available: true });
                                    } else {
                                        setSelectedSeat(null);
                                    }
                                }}
                                selectedFareClass="all"
                                disabled={false}
                                allowFlexibleSelection={true}
                                enableRealTimeUpdates={true}
                                flightDetails={selectedFlight}
                            />
                        </div>
                    ) : (
                        <div className="border rounded-lg p-4 text-center text-gray-500">
                            <p>Seat map is not available for this flight.</p>
                            <p className="text-sm mt-2">You can select any available seat at check-in.</p>
                            <button
                                onClick={() => handleSeatSelect({ code: 'PENDING', available: true })}
                                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Continue without seat selection
                            </button>
                        </div>
                    )}
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <span className="text-red-700">{error}</span>
                </div>
            )}

            <div className="flex justify-between">
                <button
                    onClick={() => setCurrentStep(1)}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                    Back
                </button>
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => selectedFlight && selectedFlight.id && selectedSeat && setCurrentStep(3)}
                        disabled={!selectedFlight || !selectedFlight.id || !selectedSeat || loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue'}
                    </button>
                </div>
            </div>
        </div>
    ); const renderStep3 = () => {
        const priceDifference = calculatePriceDifference();

        return (
            <div className="space-y-6">
                <div className="border-b pb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Confirm Reschedule</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        Review your changes and confirm reschedule
                    </p>
                </div>

                {/* Flight comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <h4 className="font-medium text-red-900 mb-3">Current Flight</h4>
                        <div className="space-y-2 text-sm">
                            <div>Flight: {bookingDetail?.flightCode}</div>
                            <div>Date: {formatDate(bookingDetail?.departureTime)}</div>
                            <div>Time: {formatTime(bookingDetail?.departureTime)}</div>
                            <div>Seat: {bookingDetail?.selectedSeatCode || bookingDetail?.seatCode || bookingDetail?.seat || 'Not assigned'}</div>
                            <div>Price: {formatPrice(bookingDetail?.price)} (incl. VAT)</div>
                        </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-medium text-green-900 mb-3">New Flight</h4>
                        <div className="space-y-2 text-sm">
                            <div>Flight: {selectedFlight?.flightCode}</div>
                            <div>Date: {formatDate(selectedFlight?.departureTime)}</div>
                            <div>Time: {formatTime(selectedFlight?.departureTime)}</div>
                            <div>Seat: {selectedSeat?.code}</div>
                            <div>Fare Class: {selectedFare?.name || selectedFare?.fareClass || 'N/A'}</div>
                            <div>Price: {formatPrice((selectedFare?.price || selectedFlight?.basePrice || 0) * 1.1)} (incl. VAT)</div>
                        </div>
                    </div>
                </div>

                {/* Price difference */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Price Summary</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span>Original price (incl. VAT):</span>
                            <span>{formatPrice(bookingDetail?.price)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>New price (incl. VAT):</span>
                            <span>{formatPrice((selectedFare?.price || selectedFlight?.basePrice || 0) * 1.1)}</span>
                        </div>
                        <div className="border-t pt-2">
                            <div className="flex justify-between font-medium">
                                <span>Price difference:</span>
                                <span className={priceDifference > 0 ? 'text-red-600' : priceDifference < 0 ? 'text-green-600' : 'text-gray-900'}>
                                    {priceDifference > 0 ? '+' : ''}{formatPrice(priceDifference)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payment warning */}
                {priceDifference > 0 && showPaymentWarning && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                            <div>
                                <h4 className="font-medium text-yellow-900">Payment Required</h4>
                                <p className="text-sm text-yellow-800 mt-1">
                                    You will need to pay an additional {formatPrice(priceDifference)} to complete this reschedule.
                                    You will be redirected to the payment page after confirmation.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* No refund policy */}
                {priceDifference < 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div>
                                <h4 className="font-medium text-blue-900">No Refund Policy</h4>
                                <p className="text-sm text-blue-800 mt-1">
                                    The new ticket is {formatPrice(Math.abs(priceDifference))} cheaper, but no refund will be issued as per our policy.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <span className="text-red-700">{error}</span>
                    </div>
                )}

                <div className="flex justify-between">
                    <button
                        onClick={() => setCurrentStep(2)}
                        className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Back
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirmReschedule}
                            disabled={loading || !selectedSeat}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                            {priceDifference > 0 ? 'Proceed to Payment' : 'Confirm Reschedule'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderSuccess = () => (
        <div className="space-y-6 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
                <h3 className="text-lg font-semibold text-gray-900">Reschedule Successful!</h3>
                <p className="text-gray-600 mt-2">{rescheduleResult?.message}</p>
            </div>
            <button
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
                Close
            </button>
        </div>
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 mt-16">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
                <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between rounded-t-lg">
                    <h2 className="text-xl font-semibold text-gray-900">Reschedule Flight</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {rescheduleResult?.paymentStatus !== 'PAYMENT_REQUIRED' && rescheduleResult ? (
                        renderSuccess()
                    ) : currentStep === 1 ? (
                        renderStep1()
                    ) : currentStep === 2 ? (
                        renderStep2()
                    ) : (
                        renderStep3()
                    )}
                </div>
            </div>
        </div>
    );
};

export default RescheduleModal;
