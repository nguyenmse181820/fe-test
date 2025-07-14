import React, { useState, useEffect, useMemo } from 'react';
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
  AlertCircle,
  ArrowLeft,
  RotateCw,
  Shield
} from 'lucide-react';
import FlightService from '../../services/FlightService';
import { CustomTabs, CustomTabsList, CustomTabsTrigger } from '../../components/ui/custom-tabs';
import { getMultiTimezoneDisplay, formatTimeWithTimezone, formatDateWithTimezone, getUserTimezone, parseBackendDateTime, convertLocalToUTC } from '../../utils/timezone';
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const Flights = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [filteredFlights, setFilteredFlights] = useState([]);
  const [returnFlights, setReturnFlights] = useState([]);
  const [flights, setFlights] = useState([]);
  const [airports, setAirports] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState("departure");
  const [searchForm, setSearchForm] = useState({
    from: '',
    to: '',
    departureDate: '',
    returnDate: '',
    tripType: 'one-way',
    passengers: {
      adults: 1,
      children: 0,
      babies: 0
    }
  });
  const [filters, setFilters] = useState({
    timeOfDay: ''
  });
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [flightDetails, setFlightDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedDepartureFlight, setSelectedDepartureFlight] = useState(null);
  const [selectedReturnFlight, setSelectedReturnFlight] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState('details');

  // Get actual search parameters from URL
  const searchCriteria = useMemo(() => {
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const routeId = searchParams.get('routeId');
    const departureDate = searchParams.get('departureDate');
    const returnDate = searchParams.get('returnDate');
    const adults = searchParams.get('adults') || '1';
    const children = searchParams.get('children') || '0';
    const babies = searchParams.get('babies') || '0';
    const tripType = searchParams.get('tripType') || 'one-way';
    const flightClass = searchParams.get('class') || 'ECONOMY';

    return {
      from,
      to,
      routeId,
      departureDate,
      returnDate,
      tripType,
      passengers: {
        adults: parseInt(adults) || 1,
        children: parseInt(children) || 0,
        babies: parseInt(babies) || 0
      },
      class: flightClass
    };
  }, [searchParams]);

  // Update search form when searchCriteria changes
  useEffect(() => {
    setSearchForm({
      from: searchCriteria.from || '',
      to: searchCriteria.to || '',
      departureDate: searchCriteria.departureDate || '',
      returnDate: searchCriteria.returnDate || '',
      tripType: searchCriteria.tripType || 'one-way',
      passengers: {
        adults: searchCriteria.passengers?.adults || 1,
        children: searchCriteria.passengers?.children || 0,
        babies: searchCriteria.passengers?.babies || 0
      }
    });
  }, [searchCriteria]);

  // Fetch airports and flights from backend
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch basic data including routes
        const [airportData, routeData] = await Promise.all([
          FlightService.getAirports(),
          FlightService.getRoutes().catch(() => [])
        ]);

        setAirports(airportData);
        setRoutes(routeData);

        // Search for departure flights if we have a route ID
        if (searchCriteria.routeId && searchCriteria.departureDate) {
          const searchRequest = {
            routeId: searchCriteria.routeId,
            departureDate: searchCriteria.departureDate,
            noAdults: searchCriteria.passengers?.adults || 1,
            noChildren: searchCriteria.passengers?.children || 0,
            noBabies: searchCriteria.passengers?.babies || 0
          };

          try {
            const searchResults = await FlightService.searchFlights(searchRequest);

            // Transform direct flights
            const transformedDirectFlights = (searchResults.directs || []).map(flight => ({
              id: flight.flightId,
              code: flight.flightCode,
              origin: flight.originAirport,
              destination: flight.destinationAirport,
              departureTime: flight.departureTime,
              estimatedArrivalTime: flight.estimatedArrivalTime,
              actualArrivalTime: flight.actualArrivalTime,
              status: flight.status,
              aircraftId: flight.aircraft?.id || flight.aircraft?.code,
              aircraft: flight.aircraft,
              totalSeats: flight.totalSeats,
              remainingSeats: flight.remainingSeats,
              availableFares: flight.availableFares,
              flightDurationMinutes: flight.flightDurationMinutes,
              type: 'direct'
            }));

            // Transform connecting flights
            const transformedConnectingFlights = (searchResults.connects || []).map((flightGroup, index) => {
              // For connecting flights, we'll create a combined flight object
              const firstFlight = flightGroup[0];
              const lastFlight = flightGroup[flightGroup.length - 1];

              return {
                id: `connect-${index}-${firstFlight.flightId}`,
                code: flightGroup.map(f => f.flightCode).join(' → '),
                origin: firstFlight.originAirport,
                destination: lastFlight.destinationAirport,
                departureTime: firstFlight.departureTime,
                estimatedArrivalTime: lastFlight.estimatedArrivalTime,
                actualArrivalTime: lastFlight.actualArrivalTime,
                status: firstFlight.status, // Use first flight's status
                aircraftId: firstFlight.aircraft?.id || firstFlight.aircraft?.code,
                aircraft: firstFlight.aircraft,
                totalSeats: Math.min(...flightGroup.map(f => f.totalSeats)), // Minimum seats across all segments
                remainingSeats: Math.min(...flightGroup.map(f => f.remainingSeats)),
                availableFares: firstFlight.availableFares, // Use first flight's fares for now
                flightDurationMinutes: flightGroup.reduce((total, f) => total + (f.flightDurationMinutes || 0), 0),
                type: 'connecting',
                segments: flightGroup, // Store all flight segments
                stops: flightGroup.length - 1
              };
            });

            // Combine both direct and connecting flights
            const allTransformedFlights = [...transformedDirectFlights, ...transformedConnectingFlights];

            setFlights(allTransformedFlights);
            setFilteredFlights(allTransformedFlights);

            // If this is a round trip, search for return flights too
            if (searchCriteria.tripType === 'round-trip' && searchCriteria.returnDate) {
              try {
                const currentRoute = routeData.find(route => route.id === searchCriteria.routeId);

                if (currentRoute) {
                  // Find the return route (destination → origin)
                  const returnRoute = routeData.find(route =>
                    route.origin?.code === currentRoute.destination?.code &&
                    route.destination?.code === currentRoute.origin?.code
                  );

                  // Debug: Let's see all HAN → SGN routes
                  const hanToSgnRoutes = routeData.filter(route =>
                    route.origin?.code === 'HAN' && route.destination?.code === 'SGN'
                  );

                  if (returnRoute) {
                    const returnSearchRequest = {
                      routeId: returnRoute.id,
                      departureDate: searchCriteria.returnDate,
                      noAdults: searchCriteria.passengers?.adults || 1,
                      noChildren: searchCriteria.passengers?.children || 0,
                      noBabies: searchCriteria.passengers?.babies || 0
                    };

                    const returnSearchResults = await FlightService.searchFlights(returnSearchRequest);

                    // If no flights found on the primary return route, try other HAN → SGN routes
                    if (returnSearchResults.total === 0 && hanToSgnRoutes.length > 1) {

                      for (const alternateRoute of hanToSgnRoutes) {
                        if (alternateRoute.id !== returnRoute.id) {
                          const alternateRequest = {
                            ...returnSearchRequest,
                            routeId: alternateRoute.id
                          };

                          try {
                            const alternateResults = await FlightService.searchFlights(alternateRequest);

                            if (alternateResults.total > 0) {
                              Object.assign(returnSearchResults, alternateResults);
                              break;
                            }
                          } catch (err) {
                            console.log(`❌ Error searching alternate route ${alternateRoute.id}:`, err);
                          }
                        }
                      }
                    }

                    // If no flights found on the exact date, let's check nearby dates
                    if (returnSearchResults.total === 0) {

                      // Check the next few days
                      const checkDates = [];
                      const baseDate = new Date(searchCriteria.returnDate);
                      for (let i = 1; i <= 3; i++) {
                        const nextDate = new Date(baseDate);
                        nextDate.setDate(baseDate.getDate() + i);
                        checkDates.push(nextDate.toISOString().split('T')[0]);
                      }

                      for (const checkDate of checkDates) {
                        try {
                          const checkRequest = { ...returnSearchRequest, departureDate: checkDate };
                          const checkResults = await FlightService.searchFlights(checkRequest);
                          if (checkResults.total > 0) {
                            console.log('Flights found on', checkDate, ':', checkResults.directs.map(f => f.flightCode));
                          }
                        } catch (err) {
                          console.log(`Error checking ${checkDate}:`, err);
                        }
                      }
                    }

                    // Transform return flights (both direct and connecting)
                    const transformedReturnDirectFlights = (returnSearchResults.directs || []).map(flight => ({
                      id: flight.flightId,
                      code: flight.flightCode,
                      origin: flight.originAirport,
                      destination: flight.destinationAirport,
                      departureTime: flight.departureTime,
                      estimatedArrivalTime: flight.estimatedArrivalTime,
                      actualArrivalTime: flight.actualArrivalTime,
                      status: flight.status,
                      aircraftId: flight.aircraft?.id || flight.aircraft?.code,
                      aircraft: flight.aircraft,
                      totalSeats: flight.totalSeats,
                      remainingSeats: flight.remainingSeats,
                      availableFares: flight.availableFares,
                      flightDurationMinutes: flight.flightDurationMinutes,
                      type: 'direct'
                    }));

                    const transformedReturnConnectingFlights = (returnSearchResults.connects || []).map((flightGroup, index) => {
                      const firstFlight = flightGroup[0];
                      const lastFlight = flightGroup[flightGroup.length - 1];

                      return {
                        id: `return-connect-${index}-${firstFlight.flightId}`,
                        code: flightGroup.map(f => f.flightCode).join(' → '),
                        origin: firstFlight.originAirport,
                        destination: lastFlight.destinationAirport,
                        departureTime: firstFlight.departureTime,
                        estimatedArrivalTime: lastFlight.estimatedArrivalTime,
                        actualArrivalTime: lastFlight.actualArrivalTime,
                        status: firstFlight.status,
                        aircraftId: firstFlight.aircraft?.id || firstFlight.aircraft?.code,
                        aircraft: firstFlight.aircraft,
                        totalSeats: Math.min(...flightGroup.map(f => f.totalSeats)),
                        remainingSeats: Math.min(...flightGroup.map(f => f.remainingSeats)),
                        availableFares: firstFlight.availableFares,
                        flightDurationMinutes: flightGroup.reduce((total, f) => total + (f.flightDurationMinutes || 0), 0),
                        type: 'connecting',
                        segments: flightGroup,
                        stops: flightGroup.length - 1
                      };
                    });

                    const allTransformedReturnFlights = [...transformedReturnDirectFlights, ...transformedReturnConnectingFlights];
                    setReturnFlights(allTransformedReturnFlights);
                  } else {
                    console.log('Looking for route from', currentRoute.destination?.code, 'to', currentRoute.origin?.code);
                  }
                } else {
                  console.warn('Current route not found with ID:', searchCriteria.routeId);
                }
              } catch (returnSearchErr) {
                console.error(' Error searching return flights:', returnSearchErr);
              }
            } else {
            }
          } catch (searchErr) {
            console.error('Error searching flights:', searchErr);
            setError(searchErr.message || 'Failed to search for flights');
          }
        }
      } catch (err) {
        console.error('Error fetching flight data:', err);
        setError(err.message || 'Failed to fetch flights or airports');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchCriteria.routeId, searchCriteria.departureDate, searchCriteria.returnDate, searchCriteria.tripType]);

  // Update search bar visibility when flights are loaded
  useEffect(() => {
    if (!loading && filteredFlights.length === 0) {
      // Automatically show search bar when no flights are found
      setShowSearchBar(true);
    }
  }, [loading, filteredFlights]);

  // Helper to format passenger count
  const formatPassengerCount = (passengers) => {
    if (!passengers || typeof passengers !== 'object') return '1 Passenger';

    const { adults = 0, children = 0, babies = 0 } = passengers;
    const total = adults + children + babies;

    if (total === 1) return '1 Passenger';
    if (total === 0) return '1 Passenger';

    const parts = [];
    if (adults > 0) parts.push(`${adults} Adult${adults > 1 ? 's' : ''}`);
    if (children > 0) parts.push(`${children} Child${children > 1 ? 'ren' : ''}`);
    if (babies > 0) parts.push(`${babies} Baby${babies > 1 ? 'ies' : ''}`);

    return parts.join(', ');
  };

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
        const date = parseBackendDateTime(flight.departureTime);
        if (!date || isNaN(date.getTime())) return true;

        // Get hour in user's timezone for filtering
        const hour = date.toLocaleString('en-US', {
          timeZone: getUserTimezone(),
          hour: 'numeric',
          hour12: false
        });
        const hourNum = parseInt(hour, 10);

        switch (filters.timeOfDay) {
          case 'morning': return hourNum >= 6 && hourNum < 12;
          case 'afternoon': return hourNum >= 12 && hourNum < 18;
          case 'evening': return hourNum >= 18 && hourNum < 24;
          case 'night': return hourNum >= 0 && hourNum < 6;
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

  const handleNewSearch = async () => {
    if (searchForm.from && searchForm.to && searchForm.departureDate) {
      try {
        // Ensure routes are loaded
        if (!routes || routes.length === 0) {
          toast({
            variant: "destructive",
            title: "Loading Routes",
            description: "Please wait for routes to load before searching.",
          });
          return;
        }

        // Find the route ID based on the selected origin and destination
        const route = routes.find(r =>
          r.origin?.code === searchForm.from &&
          r.destination?.code === searchForm.to
        );

        if (!route) {
          toast({
            variant: "destructive",
            title: "Invalid Route",
            description: "No route found between the selected airports. Please select a different route.",
          });
          return;
        }

        // Prepare search parameters for navigation
        const params = new URLSearchParams({
          routeId: route.id,
          from: searchForm.from,
          to: searchForm.to,
          departureDate: searchForm.departureDate,
          tripType: searchForm.tripType,
          adults: searchForm.passengers.adults.toString(),
          children: searchForm.passengers.children.toString(),
          babies: searchForm.passengers.babies.toString()
        });

        // Add return date for round-trip
        if (searchForm.tripType === 'round-trip' && searchForm.returnDate) {
          params.append('returnDate', searchForm.returnDate);
        }

        // Prepare search request based on required API structure
        const searchRequest = {
          routeId: route.id,
          departureDate: searchForm.departureDate,
          noAdults: searchForm.passengers.adults,
          noChildren: searchForm.passengers.children,
          noBabies: searchForm.passengers.babies
        };

        try {
          // Send search request to API
          await FlightService.searchFlights(searchRequest);
        } catch (searchError) {
          console.error('Pre-search failed:', searchError);
          // Continue to navigate even if pre-search fails
        }

        // Log the search details with timezone information
        const userTimezone = getUserTimezone();
        const searchDate = new Date(searchForm.departureDate);
        const localSearchTime = searchDate.toISOString();
        const utcSearchTime = convertLocalToUTC(searchDate);

        // Add return date timezone info for round-trip
        if (searchForm.tripType === 'round-trip' && searchForm.returnDate) {
          const returnDate = new Date(searchForm.returnDate);
          const returnLocalTime = returnDate.toISOString();
        }

        // Navigate to flights page with search parameters
        navigate(`/flights?${params.toString()}`);
      } catch (error) {
        console.error('Search failed:', error);
        toast({
          variant: "destructive",
          title: "Search Failed",
          description: "Unable to search flights. Please try again.",
        });
      }
    } else {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all required fields before searching.",
      });
    }
  };

  // Helper function to extract flight IDs from a flight object
  const extractFlightIds = (flight) => {
    if (!flight) return [];

    // For connecting flights, extract all segment flight IDs
    if (flight.type === 'connecting' && flight.segments && flight.segments.length > 0) {
      return flight.segments.map(segment => segment.flightId || segment.id).filter(id => id);
    }

    // For direct flights, use the main flight ID
    return [flight.id];
  };

  const handleSelectFlight = (flight) => {
    // If this is a one-way trip or if we're on the return tab with a selected departure flight
    if (searchCriteria.tripType === 'one-way' || (activeTab === 'return' && selectedDepartureFlight)) {
      // Extract flight IDs
      let allFlightIds = [];

      if (searchCriteria.tripType === 'one-way') {
        // For one-way trips, just get the selected flight's IDs
        allFlightIds = extractFlightIds(flight);
      } else {
        // For round-trip, combine departure and return flight IDs
        const departureFlightIds = extractFlightIds(selectedDepartureFlight);
        const returnFlightIds = extractFlightIds(flight);
        allFlightIds = [...departureFlightIds, ...returnFlightIds];
      }

      // Calculate number of passengers (adults + children, excluding babies)
      const noPassengers = (searchCriteria.passengers?.adults || 1) + (searchCriteria.passengers?.children || 0);

      // Create URL parameters with detailed passenger breakdown
      const params = new URLSearchParams({
        flights: allFlightIds.join(','),
        noPassengers: noPassengers.toString(),
        adults: (searchCriteria.passengers?.adults || 1).toString(),
        children: (searchCriteria.passengers?.children || 0).toString(),
        infants: (searchCriteria.passengers?.babies || 0).toString()
      });

      // Navigate to booking page with flight IDs as parameters
      navigate(`/booking?${params.toString()}`);
    } else if (activeTab === 'departure' && searchCriteria.tripType === 'round-trip') {
      // For round-trip, first select departure flight, then show return flight tab
      setSelectedDepartureFlight(flight);
      setActiveTab('return');
    }
  };

  const handleViewDetails = async (flight) => {
    setSelectedFlight(flight);
    setDetailsModalOpen(true);
    setLoadingDetails(true);
    setFlightDetails(null);
    setActiveDetailTab('details');

    try {
      const details = await FlightService.getFlightDetails(flight.id);
      setFlightDetails(details);
    } catch (error) {
      console.error('Error fetching flight details:', error);
      // Still show basic details from the flight list even if detailed API fails
    } finally {
      setLoadingDetails(false);
    }
  };

  const formatTime = (dateString) => {
    const date = parseBackendDateTime(dateString);
    if (!date || isNaN(date.getTime())) {
      return 'Invalid Time';
    }

    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDate = (dateString) => {
    const date = parseBackendDateTime(dateString);
    if (!date || isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  // Enhanced timezone-aware time formatting for flights
  const formatFlightTime = (dateTime, originTimezone = null, destinationTimezone = null) => {
    if (!dateTime) return 'N/A';

    const userTimezone = getUserTimezone();

    // For local display (main time shown)
    const localTime = formatTimeWithTimezone(dateTime, userTimezone, false);

    // If we have airport timezone info, show that too
    if (originTimezone) {
      const originTime = formatTimeWithTimezone(dateTime, originTimezone, false);
      return {
        local: localTime,
        origin: originTime,
        userTimezone,
        originTimezone
      };
    }

    return {
      local: localTime,
      userTimezone
    };
  };

  // Get timezone display for flight times
  const getFlightTimezoneDisplay = (flight) => {
    const originTimezone = flight.originAirport?.timezone || flight.origin?.timezone;
    const destinationTimezone = flight.destinationAirport?.timezone || flight.destination?.timezone;

    return {
      departure: formatFlightTime(flight.departureTime, originTimezone, destinationTimezone),
      arrival: formatFlightTime(flight.estimatedArrivalTime || flight.actualArrivalTime, destinationTimezone, originTimezone)
    };
  };

  // Format duration as "4h 25m" (rounded)
  const formatDuration = (departureTime, arrivalTime) => {
    const departure = parseBackendDateTime(departureTime);
    const arrival = parseBackendDateTime(arrivalTime);

    if (!departure || !arrival || isNaN(departure.getTime()) || isNaN(arrival.getTime())) {
      return 'N/A';
    }

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
  const renderDetailsModal = () => {
    if (!detailsModalOpen) return null;

    const details = flightDetails || selectedFlight;

    return (
      <>
        {/* Enhanced Flight Details Modal */}
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setDetailsModalOpen(false)}
          />

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="relative bg-white rounded-2xl shadow-xl max-w-4xl w-full mx-auto transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                      <Plane className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">Flight Details</h2>
                      <p className="text-sm text-gray-600">{details?.flightCode || details?.code || 'Flight Information'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDetailsModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Loading State */}
              {loadingDetails && (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading flight details...</p>
                </div>
              )}

              {/* Modal Content */}
              {!loadingDetails && (
                <div className="p-6">
                  {/* Flight Summary Card */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                      {/* Departure */}
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {formatTime(details?.departureTime)}
                        </div>
                        <div className="text-xs text-gray-500 mb-2">Your Time</div>
                        <div className="text-lg font-semibold text-gray-800">
                          {details?.originAirport?.code || details?.origin?.code}
                        </div>
                        <div className="text-sm text-gray-600">
                          {details?.originAirport?.city || details?.origin?.city}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(details?.departureTime)}
                        </div>
                        {(details?.originAirport?.timezone || details?.origin?.timezone) && (
                          <div className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded mt-1 inline-block">
                            Local: {formatTimeWithTimezone(details.departureTime, details.originAirport?.timezone || details.origin?.timezone, false)}
                          </div>
                        )}
                        <div className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block">
                          UTC: {formatTimeWithTimezone(details?.departureTime, 'UTC', false)}
                        </div>
                      </div>

                      {/* Flight Info */}
                      <div className="text-center">
                        <div className="text-sm font-medium text-gray-700 mb-2">
                          {details?.flightDurationMinutes ?
                            `${Math.floor(details.flightDurationMinutes / 60)}h ${details.flightDurationMinutes % 60}m` :
                            formatDuration(details?.departureTime, details?.estimatedArrivalTime)
                          }
                        </div>
                        <div className="w-full relative mb-2">
                          {details?.type === 'connecting' ? (
                            <div className="h-1 bg-gradient-to-r from-blue-200 via-orange-400 to-blue-200 rounded-full relative">
                              <div className="absolute top-1/2 left-1/4 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-orange-500 rounded-full"></div>
                              <div className="absolute top-1/2 right-1/4 transform translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-orange-500 rounded-full"></div>
                            </div>
                          ) : (
                            <div>
                              <div className="h-1 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200 rounded-full"></div>
                              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full"></div>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center justify-center space-x-1">
                          {details?.type === 'connecting' ? (
                            <>
                              <svg className="w-3 h-3 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                              </svg>
                              <span>{details.stops} Stop{details.stops > 1 ? 's' : ''}</span>
                            </>
                          ) : (
                            <>
                              <Star className="w-3 h-3 text-yellow-400" />
                              <span>Direct Flight</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Arrival */}
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 mb-1">
                          {formatTime(details?.estimatedArrivalTime || details?.actualArrivalTime)}
                        </div>
                        <div className="text-xs text-gray-500 mb-2">Your Time</div>
                        <div className="text-lg font-semibold text-gray-800">
                          {details?.destinationAirport?.code || details?.destination?.code}
                        </div>
                        <div className="text-sm text-gray-600">
                          {details?.destinationAirport?.city || details?.destination?.city}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(details?.estimatedArrivalTime || details?.actualArrivalTime)}
                        </div>
                        {(details?.destinationAirport?.timezone || details?.destination?.timezone) && (
                          <div className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded mt-1 inline-block">
                            Local: {formatTimeWithTimezone(details.estimatedArrivalTime || details.actualArrivalTime, details.destinationAirport?.timezone || details.destination?.timezone, false)}
                          </div>
                        )}
                        <div className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block">
                          UTC: {formatTimeWithTimezone(details?.estimatedArrivalTime || details?.actualArrivalTime, 'UTC', false)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-8">
                      {[
                        { id: 'details', label: 'Flight Details', icon: Plane },
                        { id: 'benefits', label: 'Additional Benefits', icon: CheckCircle },
                        { id: 'policies', label: 'Policies', icon: Shield }
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveDetailTab(tab.id)}
                          className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${activeDetailTab === tab.id
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                          <tab.icon className="w-4 h-4" />
                          <span>{tab.label}</span>
                        </button>
                      ))}
                    </nav>
                  </div>

                  {/* Tab Content */}
                  {activeDetailTab === 'details' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column - Flight Information */}
                      <div className="space-y-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <Plane className="w-4 h-4 mr-2 text-blue-600" />
                            Flight Information
                          </h3>
                          <div className="space-y-2 text-sm">
                            {details?.type === 'connecting' ? (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Flight Type:</span>
                                  <span className="font-medium text-orange-600">{details.stops} Stop{details.stops > 1 ? 's' : ''}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Segments:</span>
                                  <span className="font-medium">{details.segments?.length || 0} flights</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Via:</span>
                                  <span className="font-medium">{details.segments?.[0]?.destinationAirport?.city || 'Transit Airport'}</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Aircraft:</span>
                                  <span className="font-medium">{details?.aircraft?.model || 'Boeing Aircraft'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Registration:</span>
                                  <span className="font-medium">{details?.aircraft?.code || details?.aircraftId || 'N/A'}</span>
                                </div>
                              </>
                            )}
                            <div className="flex justify-between">
                              <span className="text-gray-600">Status:</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(details?.status)}`}>
                                {details?.status?.replace('_', ' ') || 'Scheduled'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Total Seats:</span>
                              <span className="font-medium">{details?.totalSeats || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Available Seats:</span>
                              <span className="font-medium text-green-600">{details?.remainingSeats || 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Connecting Flight Segments (if applicable) */}
                        {details?.type === 'connecting' && details?.segments && (
                          <div className="bg-blue-50 rounded-lg p-4">
                            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                              Flight Segments
                            </h3>
                            <div className="space-y-3">
                              {details.segments.map((segment, index) => (
                                <div key={segment.flightId || index} className="bg-white rounded-lg p-3 border border-blue-200">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium text-blue-600">{segment.flightCode}</span>
                                    <span className="text-xs text-gray-500">{segment.aircraft?.model || 'Boeing Aircraft'}</span>
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {segment.originAirport?.code} → {segment.destinationAirport?.code}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {formatTime(segment.departureTime)} - {formatTime(segment.estimatedArrivalTime)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Baggage Information */}
                        {(details?.carryOnLuggageWeight || details?.checkedBaggageWeight) && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                              <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                              Baggage Allowance
                            </h3>
                            <div className="space-y-2 text-sm">
                              {details?.carryOnLuggageWeight && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Carry-on:</span>
                                  <span className="font-medium">{details.carryOnLuggageWeight} kg</span>
                                </div>
                              )}
                              {details?.checkedBaggageWeight && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Checked:</span>
                                  <span className="font-medium">{details.checkedBaggageWeight} kg</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Column - Fare Classes */}
                      <div className="space-y-4">
                        {details?.availableFares?.map((fare, index) => (
                          <div key={fare.id || index} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-3">
                              <h3 className="font-semibold text-gray-900">
                                {fare.name?.replace('_', ' ') || fare.fareType?.replace('_', ' ')}
                              </h3>
                              <div className="text-right">
                                <div className="text-lg font-bold text-orange-600">
                                  {new Intl.NumberFormat('vi-VN', {
                                    style: 'currency',
                                    currency: 'VND'
                                  }).format(fare.price)}
                                </div>
                                <div className="text-xs text-gray-500">/pax</div>
                              </div>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div className="flex justify-between">
                                <span>Available Seats:</span>
                                <span className="font-medium">{fare.totalSeats - (fare.occupiedSeats?.length || 0)}</span>
                              </div>
                              {fare.seats && (
                                <div className="text-xs text-gray-500">
                                  Seats: {fare.seats.slice(0, 5).join(', ')}{fare.seats.length > 5 ? '...' : ''}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeDetailTab === 'benefits' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="text-sm text-green-800">Refundable</span>
                          </div>
                          <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="text-sm text-green-800">Reschedule Available</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center space-x-2 mb-2">
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              </svg>
                              <span className="text-sm font-medium text-blue-800">Special Offers</span>
                            </div>
                            <p className="text-xs text-blue-700">BAY77QUOCTE up to 400K off</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeDetailTab === 'policies' && (
                    <div className="space-y-4">
                      <div className="prose prose-sm max-w-none">
                        <h4 className="text-gray-900 font-semibold">Cancellation & Refund Policy</h4>
                        <p className="text-gray-600">This ticket is refundable according to the fare rules. Cancellation fees may apply.</p>

                        <h4 className="text-gray-900 font-semibold mt-4">Change & Reschedule Policy</h4>
                        <p className="text-gray-600">Changes are permitted with applicable fees. Date and time changes subject to availability.</p>

                        <h4 className="text-gray-900 font-semibold mt-4">Baggage Policy</h4>
                        <p className="text-gray-600">Carry-on and checked baggage allowances as specified. Additional fees apply for excess baggage.</p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                    <button
                      onClick={() => setDetailsModalOpen(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        setDetailsModalOpen(false);
                        handleSelectFlight(selectedFlight);
                      }}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Choose This Flight
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    );
  };

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
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-30">
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

            {/* Trip Type Selector */}
            <div className="mb-4">
              <div className="flex space-x-4">
                <button
                  onClick={() => setSearchForm(prev => ({ ...prev, tripType: 'one-way' }))}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${searchForm.tripType === 'one-way'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  One-way
                </button>
                <button
                  onClick={() => setSearchForm(prev => ({ ...prev, tripType: 'round-trip' }))}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${searchForm.tripType === 'round-trip'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  Round-trip
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* From */}
              <div className="relative">
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
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
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

              {/* Departure Date */}
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

              {/* Return Date (only for round-trip) */}
              {searchForm.tripType === 'round-trip' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Return Date</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={searchForm.returnDate}
                    onChange={e => setSearchForm(prev => ({ ...prev, returnDate: e.target.value }))}
                    min={searchForm.departureDate || new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}
            </div>

            {/* Passengers */}
            <div className="mt-4 space-y-2">
              <label className="block text-sm font-medium text-gray-700">Passengers</label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-600">Adults</label>
                  <input
                    type="number"
                    min="1"
                    max="9"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    value={searchForm.passengers.adults}
                    onChange={(e) => setSearchForm(prev => ({
                      ...prev,
                      passengers: {
                        ...prev.passengers,
                        adults: parseInt(e.target.value) || 1
                      }
                    }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Children</label>
                  <input
                    type="number"
                    min="0"
                    max="9"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    value={searchForm.passengers.children}
                    onChange={(e) => setSearchForm(prev => ({
                      ...prev,
                      passengers: {
                        ...prev.passengers,
                        children: parseInt(e.target.value) || 0
                      }
                    }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Infants</label>
                  <input
                    type="number"
                    min="0"
                    max="9"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    value={searchForm.passengers.babies}
                    onChange={(e) => setSearchForm(prev => ({
                      ...prev,
                      passengers: {
                        ...prev.passengers,
                        babies: parseInt(e.target.value) || 0
                      }
                    }))}
                  />
                </div>
              </div>
            </div>

            {/* Search Button */}
            <div className="flex justify-end mt-4">
              <button
                onClick={handleNewSearch}
                disabled={!searchForm.from || !searchForm.to || !searchForm.departureDate || (searchForm.tripType === 'round-trip' && !searchForm.returnDate)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg transition-all duration-300"
              >
                <div className="flex items-center justify-center space-x-2">
                  <Search className="w-4 h-4" />
                  <span>Search Flights</span>
                </div>
              </button>
            </div>

            {/* Current Search Info */}
            {(searchCriteria.from && searchCriteria.to) && (
              <div className="mt-4 p-3 bg-blue-50/50 rounded-lg">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Current search:</span> {getFromAirport()?.city} ({searchCriteria.from}) → {getToAirport()?.city} ({searchCriteria.to})
                  {searchCriteria.departureDate && ` • ${formatDate(searchCriteria.departureDate)}`}
                  {` • ${formatPassengerCount(searchCriteria.passengers || { adults: 1, children: 0, babies: 0 })} • ${searchCriteria.class}`}
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
                    <span className="text-sm font-medium">{formatPassengerCount(searchCriteria.passengers || { adults: 1, children: 0, babies: 0 })} • {searchCriteria.class}</span>
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
                  Showing {(activeTab === 'departure' ? filteredFlights : returnFlights).length} of {(activeTab === 'departure' ? flights : returnFlights).length} flights
                </div>
              </div>
            </div>

            {/* Improved Custom Tabs for Round Trip */}
            {searchCriteria.tripType === 'round-trip' && (
              <CustomTabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                <CustomTabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-xl">
                  <CustomTabsTrigger
                    value="departure"
                    className="rounded-lg transition-all duration-200 px-4 py-2"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="text-sm font-medium">
                        Outbound
                      </div>
                      {selectedDepartureFlight && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                  </CustomTabsTrigger>
                  <CustomTabsTrigger
                    value="return"
                    className="rounded-lg transition-all duration-200 px-4 py-2"
                    disabled={!selectedDepartureFlight}
                  >
                    <div className="flex items-center space-x-2">
                      <div className="text-sm font-medium">
                        Return
                      </div>
                      {selectedReturnFlight && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                  </CustomTabsTrigger>
                </CustomTabsList>
              </CustomTabs>
            )}

            {/* Selected Flight Summary for Round Trip */}
            {searchCriteria.tripType === 'round-trip' && selectedDepartureFlight && (
              <div className="mb-6 p-4 bg-blue-50/50 rounded-xl border border-blue-200/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">Outbound Flight Selected</div>
                      <div className="text-xs text-gray-600">
                        {selectedDepartureFlight.code} • {formatTime(selectedDepartureFlight.departureTime)} {selectedDepartureFlight.origin?.code} → {selectedDepartureFlight.destination?.code}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedDepartureFlight(null);
                      setActiveTab('departure');
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Change
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {(activeTab === 'departure' ? filteredFlights : returnFlights).length > 0 ? (
                (activeTab === 'departure' ? filteredFlights : returnFlights).map(flight => (
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
                            <div className="text-sm text-gray-600">
                              {flight.type === 'connecting' ? (
                                `${flight.stops} Stop${flight.stops > 1 ? 's' : ''} • Multiple Aircraft`
                              ) : (
                                flight.aircraft?.model || 'Boeing Aircraft'
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusColor(flight.status)}`}>
                            {getStatusIcon(flight.status)}
                            <span>{flight.status.replace('_', ' ')}</span>
                          </span>
                          <button
                            className="ml-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100 text-xs font-medium"
                            onClick={() => handleViewDetails(flight)}
                          >
                            View Details
                          </button>
                        </div>
                      </div>

                      {/* Enhanced Flight Route */}
                      {flight.type === 'connecting' ? (
                        // Timeline view for connecting flights
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="text-sm font-semibold text-gray-700">
                              Total Duration: {flight.flightDurationMinutes ?
                                `${Math.floor(flight.flightDurationMinutes / 60)}h ${flight.flightDurationMinutes % 60}m` :
                                formatDuration(flight.departureTime, flight.estimatedArrivalTime)
                              }
                            </div>
                            <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                              {flight.stops} Stop{flight.stops > 1 ? 's' : ''}
                            </div>
                          </div>

                          {/* Timeline using OriginUI pattern */}
                          <div className="flow-root">
                            <ul className="-mb-8">
                              {flight.segments?.map((segment, segmentIdx) => {
                                const isLastSegment = segmentIdx === flight.segments.length - 1;
                                const nextSegment = !isLastSegment ? flight.segments[segmentIdx + 1] : null;

                                // Calculate layover time
                                let layoverDuration = '';
                                if (nextSegment) {
                                  const arrivalTime = new Date(segment.estimatedArrivalTime);
                                  const nextDepartureTime = new Date(nextSegment.departureTime);
                                  const diffMs = nextDepartureTime - arrivalTime;
                                  const hours = Math.floor(diffMs / (1000 * 60 * 60));
                                  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                                  layoverDuration = `${hours}h ${minutes}m`;
                                }

                                return (
                                  <React.Fragment key={segment.flightId || segmentIdx}>
                                    {/* Flight segment */}
                                    <li>
                                      <div className="relative pb-8">
                                        {!isLastSegment && (
                                          <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                                        )}
                                        <div className="relative flex space-x-3">
                                          <div>
                                            <span className="bg-blue-500 h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white">
                                              <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                              </svg>
                                            </span>
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="grid grid-cols-3 gap-4 items-center">
                                              {/* Departure */}
                                              <div>
                                                <div className="text-lg font-bold text-gray-900">
                                                  {formatTime(segment.departureTime)}
                                                </div>
                                                <div className="text-sm font-medium text-gray-700">
                                                  {segment.originAirport?.city} ({segment.originAirport?.code})
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                  {formatDate(segment.departureTime)}
                                                </div>
                                              </div>

                                              {/* Flight info */}
                                              <div className="text-center">
                                                <div className="text-sm font-medium text-blue-600">{segment.flightCode}</div>
                                                <div className="text-xs text-gray-500">{segment.aircraft?.model || 'Boeing Aircraft'}</div>
                                                <div className="text-xs text-gray-500">
                                                  {segment.flightDurationMinutes ?
                                                    `${Math.floor(segment.flightDurationMinutes / 60)}h ${segment.flightDurationMinutes % 60}m` :
                                                    formatDuration(segment.departureTime, segment.estimatedArrivalTime)
                                                  }
                                                </div>
                                              </div>

                                              {/* Arrival */}
                                              <div className="text-right">
                                                <div className="text-lg font-bold text-gray-900">
                                                  {formatTime(segment.estimatedArrivalTime)}
                                                </div>
                                                <div className="text-sm font-medium text-gray-700">
                                                  {segment.destinationAirport?.city} ({segment.destinationAirport?.code})
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                  {formatDate(segment.estimatedArrivalTime)}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </li>

                                    {/* Layover */}
                                    {!isLastSegment && (
                                      <li>
                                        <div className="relative pb-8">
                                          <span className="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                                          <div className="relative flex space-x-3">
                                            <div>
                                              <span className="bg-yellow-400 h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white">
                                                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                              </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                                <div className="flex items-center space-x-2">
                                                  <span className="text-sm font-medium text-yellow-800">
                                                    Stop in {segment.destinationAirport?.city}
                                                  </span>
                                                  <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded">
                                                    {layoverDuration}
                                                  </span>
                                                </div>
                                                <div className="text-xs text-yellow-700 mt-1">
                                                  {segment.destinationAirport?.name}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </li>
                                    )}
                                  </React.Fragment>
                                );
                              })}

                              {/* Final arrival */}
                              <li>
                                <div className="relative">
                                  <div className="relative flex space-x-3">
                                    <div>
                                      <span className="bg-green-500 h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white">
                                        <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                      </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-green-700">Final Arrival</div>
                                    </div>
                                  </div>
                                </div>
                              </li>
                            </ul>
                          </div>
                        </div>
                      ) : (
                        // Original layout for direct flights
                        <div className="grid grid-cols-7 gap-4 items-center mb-6">
                          {/* Departure */}
                          <div className="col-span-2 text-center">
                            <div className="text-3xl font-bold text-gray-900 mb-1">{formatTime(flight.departureTime)}</div>
                            <div className="text-xs text-gray-500 mb-2">Your Time</div>
                            <div className="text-lg font-semibold text-gray-800">
                              {flight.origin?.code || flight.origin}
                            </div>
                            <div className="text-sm text-gray-600 font-medium">
                              {flight.origin?.city || getAirportByCode(flight.origin)?.city}
                            </div>
                            <div className="text-xs text-gray-500">{formatDate(flight.departureTime)}</div>
                            {flight.origin?.timezone && (
                              <div className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded mt-1 inline-block">
                                Local: {formatTimeWithTimezone(flight.departureTime, flight.origin.timezone, false)}
                              </div>
                            )}
                            <div className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block">
                              UTC: {formatTimeWithTimezone(flight.departureTime, 'UTC', false)}
                            </div>
                          </div>

                          {/* Route Line */}
                          <div className="col-span-3 flex flex-col items-center">
                            <div className="text-sm font-semibold text-gray-700 mb-2">
                              {flight.flightDurationMinutes ?
                                `${Math.floor(flight.flightDurationMinutes / 60)}h ${flight.flightDurationMinutes % 60}m` :
                                formatDuration(flight.departureTime, flight.estimatedArrivalTime)
                              }
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
                            <div className="text-xs text-gray-500 mb-2">Your Time</div>
                            <div className="text-lg font-semibold text-gray-800">
                              {flight.destination?.code || flight.destination}
                            </div>
                            <div className="text-sm text-gray-600 font-medium">
                              {flight.destination?.city || getAirportByCode(flight.destination)?.city}
                            </div>
                            <div className="text-xs text-gray-500">{formatDate(flight.estimatedArrivalTime)}</div>
                            {flight.destination?.timezone && (
                              <div className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded mt-1 inline-block">
                                Local: {formatTimeWithTimezone(flight.estimatedArrivalTime, flight.destination.timezone, false)}
                              </div>
                            )}
                            <div className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block">
                              UTC: {formatTimeWithTimezone(flight.estimatedArrivalTime, 'UTC', false)}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Flight Details and Action */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex items-center space-x-6 text-sm text-gray-600">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4" />
                            <span>
                              {flight.origin?.country && flight.destination?.country ?
                                `${flight.origin.country} → ${flight.destination.country}` :
                                'International Flight'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4" />
                            <span>
                              {flight.type === 'connecting' ? (
                                `${flight.segments?.length || 0} Segments`
                              ) : (
                                `Aircraft: ${flight.aircraft?.code || flight.aircraftId?.slice(-8) || 'Unknown'}`
                              )}
                            </span>
                          </div>
                          {flight.type === 'connecting' && flight.segments?.length > 0 && (
                            <div className="flex items-center space-x-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Layover in {flight.segments[0]?.destinationAirport?.city}</span>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleSelectFlight(flight)}
                          className={`
                            group/btn py-3 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg
                            text-white font-semibold
                            ${activeTab === 'departure' || (activeTab === 'return' && selectedDepartureFlight)
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                              : 'bg-gray-400 cursor-not-allowed'
                            }
                          `}
                          disabled={activeTab === 'return' && !selectedDepartureFlight}
                        >
                          <span className="flex items-center space-x-2">
                            <span>
                              {activeTab === 'departure' && searchCriteria.tripType === 'round-trip'
                                ? 'Select Outbound'
                                : activeTab === 'return'
                                  ? 'Select Return'
                                  : 'Select Flight'}
                            </span>
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
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    No {activeTab === 'departure' ? 'departure' : 'return'} flights found
                  </h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    {activeTab === 'return'
                      ? `No return flights available from ${searchCriteria.to} to ${searchCriteria.from} on ${new Date(searchCriteria.returnDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}. Try selecting a different return date.`
                      : "We couldn't find any flights matching your criteria. Try searching for different routes or dates."
                    }
                  </p>
                  <div className="flex justify-center">
                    <button
                      className="mt-6 inline-flex items-center px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 transition-all duration-200"
                      onClick={() => {
                        // Navigate to home page for new search
                        navigate('/');
                      }}
                    >
                      <Search className="w-5 h-5 mr-2" />
                      Search Different Route
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* No Toaster here - using global one in App.jsx */}
    </div>
  );
};

export default Flights;