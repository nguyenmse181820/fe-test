import React, { useState, useEffect, useMemo } from 'react';
import { Dialog } from '@headlessui/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Plane, 
  Users, 
  Filter, 
  Search, 
  ArrowRight, 
  CheckCircle,
  SlidersHorizontal,
  TrendingUp,
  Star,
  AlertCircle
} from 'lucide-react';
import FlightService from '../../services/FlightService';

const Flights = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [filteredFlights, setFilteredFlights] = useState([]);
  const [flights, setFlights] = useState([]);
  const [airports, setAirports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);  const [showFilters, setShowFilters] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [searchForm, setSearchForm] = useState({
    from: '',
    to: '',
    departureDate: ''
  });
  const [filters, setFilters] = useState({
    timeOfDay: ''
  });
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState(null);

  // Get actual search parameters from URL
  const searchCriteria = useMemo(() => {
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const departureDate = searchParams.get('departureDate');
    const returnDate = searchParams.get('returnDate');
    const passengers = searchParams.get('passengers') || '1 Adult';
    const flightClass = searchParams.get('class') || 'Economy';

    return {
      from,
      to,
      departureDate,
      returnDate,
      passengers,
      class: flightClass
    };
  }, [searchParams]);

  // Update search form when searchCriteria changes
  useEffect(() => {
    console.log('SearchCriteria updated:', searchCriteria);
    setSearchForm({
      from: searchCriteria.from || '',
      to: searchCriteria.to || '',
      departureDate: searchCriteria.departureDate || ''
    });
  }, [searchCriteria]);

  // Fetch airports and flights from backend
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { airports, flights } = await FlightService.getFlightData();
        setAirports(airports);
        setFlights(flights);
      } catch (err) {
        console.error('Error fetching flight data:', err);
        setError(err.message || 'Failed to fetch flights or airports');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Helper to get airport by code
  const getAirportByCode = (code) => {
    if (!Array.isArray(airports)) return null;
    return airports.find(a => a.code === code);
  };

  // Filtering logic
  useEffect(() => {
    let filtered = flights;
    
    // Filter by route if search criteria provided
    if (searchCriteria.from && searchCriteria.to) {
      filtered = filtered.filter(flight => 
        flight.origin?.code === searchCriteria.from &&
        flight.destination?.code === searchCriteria.to
      );
    }
    
    // Filter by time of day
    if (filters.timeOfDay) {
      filtered = filtered.filter(flight => {
        const hour = new Date(flight.departureTime).getHours();
        switch (filters.timeOfDay) {
          case 'morning': return hour >= 6 && hour < 12;
          case 'afternoon': return hour >= 12 && hour < 18;
          case 'evening': return hour >= 18 && hour < 24;
          case 'night': return hour >= 0 && hour < 6;
          default: return true;
        }
      });
    }
    
    setFilteredFlights(filtered);
  }, [flights, searchCriteria, filters]);

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleSearchFormChange = (field, value) => {
    setSearchForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNewSearch = () => {
    if (searchForm.from && searchForm.to && searchForm.departureDate) {
      const params = new URLSearchParams({
        from: searchForm.from,
        to: searchForm.to,
        departureDate: searchForm.departureDate,
        passengers: searchCriteria.passengers,
        class: searchCriteria.class
      });
      
      navigate(`/flights?${params.toString()}`);
    }
  };

  const handleSelectFlight = (flight) => {
    navigate(`/booking/${flight.id}`, {
      state: {
        flight,
        searchCriteria
      }
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format duration as "4h 25m" (rounded)
  const formatDuration = (departureTime, arrivalTime) => {
    const departure = new Date(departureTime);
    const arrival = new Date(arrivalTime);
    const diffMs = arrival - departure;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.round((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'SCHEDULED_OPEN': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'DELAYED': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CANCELLED': return 'bg-red-50 text-red-700 border-red-200';
      case 'BOARDING': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'DEPARTED': return 'bg-purple-50 text-purple-700 border-purple-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'SCHEDULED_OPEN': return <CheckCircle className="w-3 h-3" />;
      case 'DELAYED': return <AlertCircle className="w-3 h-3" />;
      case 'CANCELLED': return <AlertCircle className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  const getFromAirport = () => {
    return getAirportByCode(searchCriteria.from);
  };

  const getToAirport = () => {
    return getAirportByCode(searchCriteria.to);
  };

  // Modal for flight details
  const renderDetailsModal = () => (
    <Dialog open={detailsModalOpen} onClose={() => setDetailsModalOpen(false)} className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-30" />
        <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-auto p-8 z-10">
          <Dialog.Title className="text-xl font-bold mb-4">Flight Details</Dialog.Title>
          {selectedFlight && (
            <div>
              <div className="mb-2 font-semibold">{selectedFlight.code}</div>
              <div className="mb-2">{selectedFlight.origin.city} ({selectedFlight.origin.code}) → {selectedFlight.destination.city} ({selectedFlight.destination.code})</div>
              <div className="mb-2">Departure: {formatDate(selectedFlight.departureTime)} {formatTime(selectedFlight.departureTime)}</div>
              <div className="mb-2">Arrival: {formatDate(selectedFlight.estimatedArrivalTime)} {formatTime(selectedFlight.estimatedArrivalTime)}</div>
              <div className="mb-2">Duration: {formatDuration(selectedFlight.departureTime, selectedFlight.estimatedArrivalTime)}</div>
              <div className="mb-2">Status: {selectedFlight.status}</div>
              <div className="mb-2">Aircraft: {selectedFlight.aircraftId}</div>
              {/* Add more details as needed */}
            </div>
          )}
          <div className="flex justify-end mt-6">
            <button onClick={() => setDetailsModalOpen(false)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Close</button>
          </div>
        </div>
      </div>
    </Dialog>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-6"></div>
            <Plane className="w-6 h-6 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Finding flights</h3>
          <p className="text-gray-600">Searching for the best options...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load flights</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Modern Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Plane className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Flight Search</h1>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white/80 border border-gray-200 rounded-lg hover:bg-white hover:border-gray-300 transition-all duration-200"
                onClick={() => setShowSearchBar(!showSearchBar)}
              >
                <Search className="w-4 h-4 mr-2" />
                Search routes
              </button>
              <button 
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50/80 border border-blue-200 rounded-lg hover:bg-blue-100 transition-all duration-200"
                onClick={() => navigate('/')}
              >
                Go to Homepage
              </button>
            </div>
          </div>
        </div>
      </div>

      {renderDetailsModal()}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Inline Search Bar */}
        {showSearchBar && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Modify Your Search</h3>
              <button 
                onClick={() => setShowSearchBar(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* From */}              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={searchForm.from}
                  onChange={e => setSearchForm(prev => ({ ...prev, from: e.target.value }))}
                  placeholder="Search departure airport..."
                  onFocus={() => setShowFromDropdown(true)}
                  onBlur={() => setTimeout(() => setShowFromDropdown(false), 200)}
                  autoComplete="off"
                />
                {showFromDropdown && (
                  <div className="absolute z-50 bg-white border border-gray-200 rounded-lg mt-1 w-full max-h-48 overflow-y-auto shadow-lg">
                    {searchForm.from ? (
                      airports.filter(a => a.city.toLowerCase().includes(searchForm.from.toLowerCase()) || a.code.toLowerCase().includes(searchForm.from.toLowerCase())).map(airport => (
                        <div
                          key={airport.code}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                          onMouseDown={() => setSearchForm(prev => ({ ...prev, from: airport.code }))}
                        >
                          {airport.city} ({airport.code})
                        </div>
                      ))
                    ) : (
                      airports.map(airport => (
                        <div
                          key={airport.code}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                          onMouseDown={() => setSearchForm(prev => ({ ...prev, from: airport.code }))}
                        >
                          {airport.city} ({airport.code})
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              {/* To */}
              <div className="relative">                <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={searchForm.to}
                  onChange={e => setSearchForm(prev => ({ ...prev, to: e.target.value }))}
                  placeholder="Search destination airport..."
                  onFocus={() => setShowToDropdown(true)}
                  onBlur={() => setTimeout(() => setShowToDropdown(false), 200)}
                  autoComplete="off"
                />
                {showToDropdown && (
                  <div className="absolute z-50 bg-white border border-gray-200 rounded-lg mt-1 w-full max-h-48 overflow-y-auto shadow-lg">
                    {searchForm.to ? (
                      airports.filter(a => a.city.toLowerCase().includes(searchForm.to.toLowerCase()) || a.code.toLowerCase().includes(searchForm.to.toLowerCase())).map(airport => (
                        <div
                          key={airport.code}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                          onMouseDown={() => setSearchForm(prev => ({ ...prev, to: airport.code }))}
                        >
                          {airport.city} ({airport.code})
                        </div>
                      ))
                    ) : (
                      airports.map(airport => (
                        <div
                          key={airport.code}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                          onMouseDown={() => setSearchForm(prev => ({ ...prev, to: airport.code }))}
                        >
                          {airport.city} ({airport.code})
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Departure Date</label>
                <input 
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={searchForm.departureDate}
                  onChange={e => setSearchForm(prev => ({ ...prev, departureDate: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              {/* Search Button */}
              <div className="flex items-end">
                <button 
                  onClick={handleNewSearch}
                  disabled={!searchForm.from || !searchForm.to || !searchForm.departureDate}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <Search className="w-4 h-4" />
                    <span>Query</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Current Search Info */}
            {(searchCriteria.from && searchCriteria.to) && (
              <div className="mt-4 p-3 bg-blue-50/50 rounded-lg">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Current search:</span> {getFromAirport()?.city} ({searchCriteria.from}) → {getToAirport()?.city} ({searchCriteria.to})
                  {searchCriteria.departureDate && ` • ${formatDate(searchCriteria.departureDate)}`}
                  {` • ${searchCriteria.passengers} • ${searchCriteria.class}`}
                </div>
              </div>
            )}
          </div>
        )}
        {/* Enhanced Search Summary */}
        {searchCriteria.from && searchCriteria.to && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{getFromAirport()?.code}</div>
                    <div className="text-sm font-medium text-gray-600">{getFromAirport()?.city}</div>
                    <div className="text-xs text-gray-500">{getFromAirport()?.country}</div>
                  </div>
                  <div className="flex flex-col items-center">
                    <ArrowRight className="w-6 h-6 text-blue-600 mb-1" />
                    <div className="text-xs text-gray-500 font-medium">Direct</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{getToAirport()?.code}</div>
                    <div className="text-sm font-medium text-gray-600">{getToAirport()?.city}</div>
                    <div className="text-xs text-gray-500">{getToAirport()?.country}</div>
                  </div>
                </div>
                
                <div className="h-12 w-px bg-gray-200"></div>
                
                <div className="space-y-2">
                  {searchCriteria.departureDate && (
                    <div className="flex items-center text-gray-700 bg-blue-50/80 px-3 py-1.5 rounded-lg">
                      <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                      <span className="text-sm font-medium">{formatDate(searchCriteria.departureDate)}</span>
                    </div>
                  )}
                  <div className="flex items-center text-gray-700 bg-gray-50/80 px-3 py-1.5 rounded-lg">
                    <Users className="w-4 h-4 mr-2 text-gray-600" />
                    <span className="text-sm font-medium">{searchCriteria.passengers} • {searchCriteria.class}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{filteredFlights.length} flights</div>
                  <div className="text-xs text-gray-500">available</div>
                </div>
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-6">
          {/* Modern Filters Sidebar */}
          <div className="w-72 flex-shrink-0">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50 p-6 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                <div className="flex items-center space-x-2">
                  <SlidersHorizontal className="w-5 h-5 text-gray-400" />
                  <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className="lg:hidden p-1 rounded-md hover:bg-gray-100"
                  >
                    <Filter className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {/* Time of Day Filter */}
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-4">Departure Time</label>
                  <div className="space-y-3">
                    {[
                      { value: '', label: 'Any Time', icon: '🕐' },
                      { value: 'morning', label: 'Morning', time: '6AM - 12PM', icon: '🌅' },
                      { value: 'afternoon', label: 'Afternoon', time: '12PM - 6PM', icon: '☀️' },
                      { value: 'evening', label: 'Evening', time: '6PM - 12AM', icon: '🌆' },
                      { value: 'night', label: 'Night', time: '12AM - 6AM', icon: '🌙' }
                    ].map((option) => (
                      <label key={option.value} className="flex items-center p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-all duration-200">
                        <input
                          type="radio"
                          name="timeOfDay"
                          value={option.value}
                          checked={filters.timeOfDay === option.value}
                          onChange={(e) => handleFilterChange('timeOfDay', e.target.value)}
                          className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-2"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{option.icon}</span>
                            <span className="text-sm font-medium text-gray-900">{option.label}</span>
                          </div>
                          {option.time && (
                            <div className="text-xs text-gray-500 mt-0.5">{option.time}</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modern Flight Results */}
          <div className="flex-1">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  Available Flights
                </h2>
                <div className="text-sm text-gray-600">
                  Showing {filteredFlights.length} of {flights.length} flights
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {filteredFlights.length > 0 ? (
                filteredFlights.map(flight => (
                  <div key={flight.id} className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50 hover:shadow-lg hover:border-blue-200 transition-all duration-300">
                    <div className="p-6">
                      {/* Flight Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                            <Plane className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <div className="text-lg font-bold text-gray-900">{flight.code}</div>
                            <div className="text-sm text-gray-600">Boeing Aircraft</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusColor(flight.status)}`}>
                            {getStatusIcon(flight.status)}
                            <span>{flight.status.replace('_', ' ')}</span>
                          </span>
                          <button
                            className="ml-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100 text-xs font-medium"
                            onClick={() => { setSelectedFlight(flight); setDetailsModalOpen(true); }}
                          >
                            View Details
                          </button>
                        </div>
                      </div>

                      {/* Enhanced Flight Route */}
                      <div className="grid grid-cols-7 gap-4 items-center mb-6">
                        {/* Departure */}
                        <div className="col-span-2 text-center">
                          <div className="text-3xl font-bold text-gray-900 mb-1">{formatTime(flight.departureTime)}</div>
                          <div className="text-lg font-semibold text-gray-800">{flight.origin.code}</div>
                          <div className="text-sm text-gray-600 font-medium">{flight.origin.city}</div>
                          <div className="text-xs text-gray-500">{formatDate(flight.departureTime)}</div>
                          <div className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block">
                            {flight.origin.timezone.split('/')[1]}
                          </div>
                        </div>

                        {/* Route Line */}
                        <div className="col-span-3 flex flex-col items-center">
                          <div className="text-sm font-semibold text-gray-700 mb-2">
                            {formatDuration(flight.departureTime, flight.estimatedArrivalTime)}
                          </div>
                          <div className="w-full relative">
                            <div className="h-1 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200 rounded-full"></div>
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full shadow-sm"></div>
                            <Plane className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-white" />
                          </div>
                          <div className="text-xs text-gray-500 mt-2 flex items-center space-x-1">
                            <Star className="w-3 h-3 text-yellow-400" />
                            <span>Direct Flight</span>
                          </div>
                        </div>

                        {/* Arrival */}
                        <div className="col-span-2 text-center">
                          <div className="text-3xl font-bold text-gray-900 mb-1">{formatTime(flight.estimatedArrivalTime)}</div>
                          <div className="text-lg font-semibold text-gray-800">{flight.destination.code}</div>
                          <div className="text-sm text-gray-600 font-medium">{flight.destination.city}</div>
                          <div className="text-xs text-gray-500">{formatDate(flight.estimatedArrivalTime)}</div>
                          <div className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block">
                            {flight.destination.timezone.split('/')[1]}
                          </div>
                        </div>
                      </div>

                      {/* Flight Details and Action */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center space-x-6 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4" />
                            <span>{flight.origin.country} → {flight.destination.country}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4" />
                            <span>Aircraft: {flight.aircraftId.slice(-8)}</span>
                          </div>
                        </div>
                        
                        <button 
                          onClick={() => handleSelectFlight(flight)}
                          className="group/btn bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
                        >
                          <span className="flex items-center space-x-2">
                            <span>Select Flight</span>
                            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50 p-12 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Plane className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">No flights found</h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    We couldn't find any flights matching your criteria. Try searching for different routes or dates.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button 
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105"
                      onClick={() => setShowSearchBar(true)}
                    >
                      <Search className="w-5 h-5 mr-2" />
                      Search Different Route
                    </button>
                    <button 
                      className="inline-flex items-center px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-300"
                      onClick={() => navigate('/')}
                    >
                      Back to Homepage
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Flights;