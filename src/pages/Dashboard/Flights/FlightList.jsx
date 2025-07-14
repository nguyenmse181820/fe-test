import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../utils/axios';
import { 
  formatTimeWithTimezone, 
  formatDateWithTimezone, 
  getMultiTimezoneDisplay, 
  getUserTimezone,
  getTimezoneAbbreviation,
  parseBackendDateTime
} from '../../../utils/timezone';
import { 
  AlertCircle, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Info,
  Loader2, 
  Plane, 
  Search, 
  SortAsc, 
  SortDesc, 
  X
} from 'lucide-react';

// Shadcn components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const FlightList = () => {
  const navigate = useNavigate();
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  
  // Sorting state
  const [sortBy, setSortBy] = useState('departureTime:desc');
    // Filter state (applied filters)
  const [appliedFilters, setAppliedFilters] = useState({
    code: '',
    origin: '',
    destination: '',
    status: '',
    departureTime: '' // Will be formatted as ISO string range
  });
  // Modal state
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [flightDetails, setFlightDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  // Search form state (input values)
  const [searchForm, setSearchForm] = useState({ 
    code: '', 
    origin: '', 
    destination: '', 
    status: '', 
    startDate: '',
    endDate: ''
  });
  const [showSearchBar, setShowSearchBar] = useState(false);

  const fetchFlightDetails = async (flightId) => {
    try {
      setDetailsLoading(true);
      setDetailsError(null);
      
      const response = await axiosInstance.get(`/flight-service/api/v1/fs/flights/${flightId}/details`);
      
      if (response.data) {
        setFlightDetails(response.data);
      } else {
        throw new Error('Failed to fetch flight details');
      }
    } catch (err) {
      setDetailsError(err.message || 'An error occurred while fetching flight details');
      console.error('Error fetching flight details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };
  const handleViewDetails = (flight) => {
    setSelectedFlight(flight);
    setDetailsModalOpen(true);
    fetchFlightDetails(flight.id);
  };

  const fetchFlights = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      
      // Add pagination
      params.append('pageNo', currentPage);
      params.append('pageSize', pageSize);
      
      // Add sorting
      params.append('sortBy', sortBy);
        // Add filters (only non-empty values)
      Object.entries(appliedFilters).forEach(([key, value]) => {
        if (value) {
          if (key === 'departureTime' && value.includes(',')) {
            // Handle date range
            params.append(key, value);
          } else {
            params.append(key, value);
          }
        }
      });
      
      // This endpoint matches the one in FlightController.java
      const response = await axiosInstance.get(`/flight-service/api/v1/fs/flights?${params.toString()}`);
      
      if (response.data.statusCode === 200) {
        const { content, totalElements, totalPages } = response.data.data;
        setFlights(content);
        setTotalElements(totalElements);
        setTotalPages(totalPages);
      } else {
        throw new Error('Failed to fetch flights');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching flights');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchFlights();
  }, [currentPage, pageSize, sortBy, appliedFilters]);

  const handleSort = (field) => {
    const [currentField, currentDirection] = sortBy.split(':');
    const newDirection = currentField === field && currentDirection === 'asc' ? 'desc' : 'asc';
    setSortBy(`${field}:${newDirection}`);
  };
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setSearchForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (field, value) => {
    setSearchForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSearch = () => {
    // Convert search form to applied filters format
    const departureTime = searchForm.startDate && searchForm.endDate 
      ? `${new Date(searchForm.startDate).toISOString()},${new Date(searchForm.endDate).toISOString()}`
      : searchForm.startDate 
        ? `${new Date(searchForm.startDate).toISOString()},`
        : searchForm.endDate 
          ? `,${new Date(searchForm.endDate).toISOString()}`
          : '';

    setAppliedFilters({
      code: searchForm.code,
      origin: searchForm.origin,
      destination: searchForm.destination,
      status: searchForm.status,
      departureTime
    });
    setCurrentPage(1);
  };

  const handleClearSearch = () => {
    setSearchForm({
      code: '',
      origin: '',
      destination: '',
      status: '',
      startDate: '',
      endDate: ''
    });
    setAppliedFilters({
      code: '',
      origin: '',
      destination: '',
      status: '',
      departureTime: ''
    });
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  };
  const handleQuery = () => {
    handleSearch();
  };

  const formatDuration = (minutes) => {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h ${m}m`;
  };

  const getFareTypeColors = (fareType) => {
    switch (fareType) {
      case 'ECONOMY':
        return {
          badge: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
          border: 'border-l-blue-400'
        };
      case 'BUSINESS':
        return {
          badge: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
          border: 'border-l-purple-400'
        };
      case 'FIRST_CLASS':
        return {
          badge: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
          border: 'border-l-amber-400'
        };
      default:
        return {
          badge: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
          border: 'border-l-gray-400'
        };
    }
  };

  const formatFareType = (fareType) => {
    return fareType.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const getFlightStatusColors = (status) => {
    if (status.includes("SCHEDULED")) {
      return {
        variant: "outline",
        className: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 font-semibold"
      };
    } else if (status.includes("IN_PROGRESS")) {
      return {
        variant: "outline", 
        className: "bg-green-50 text-green-700 border-green-200 hover:bg-green-100 font-semibold"
      };
    } else if (status.includes("COMPLETED")) {
      return {
        variant: "outline",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-semibold"
      };
    } else if (status.includes("CANCELLED")) {
      return {
        variant: "outline",
        className: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 font-semibold"
      };
    } else {
      return {
        variant: "outline",
        className: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 font-semibold"
      };
    }
  };  const renderDetailsModal = () => {
    return (
      <Dialog open={detailsModalOpen} onOpenChange={isOpen => {
        if (!isOpen) {
          setDetailsModalOpen(false);
          setFlightDetails(null);
          setDetailsError(null);
        }
      }}>
        <DialogContent className="max-w-7xl w-[95vw] max-h-[95vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              Flight Details
            </DialogTitle>
            <DialogDescription>
              Complete information about the selected flight including fares and seat availability.
            </DialogDescription>
          </DialogHeader>
            
          {detailsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                <p className="text-lg font-medium">Loading flight details...</p>
                <p className="text-sm text-muted-foreground">Please wait while we fetch the latest information</p>
              </div>
            </div>
          ) : detailsError ? (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 text-destructive">
                  <AlertCircle className="h-6 w-6 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Failed to load flight details</p>
                    <p className="text-sm text-muted-foreground">{detailsError}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : flightDetails ? (
            <div className="space-y-6">
              {/* Flight Overview Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Flight {flightDetails.flightCode}</span>
                    <Badge 
                      variant={getFlightStatusColors(flightDetails.status).variant}
                      className={getFlightStatusColors(flightDetails.status).className}
                    >
                      {flightDetails.status.replace(/_/g, ' ')}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Route Information */}
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{flightDetails.originAirport.code}</div>
                        <div className="text-sm text-muted-foreground">{flightDetails.originAirport.name}</div>
                        <div className="text-xs text-muted-foreground">{flightDetails.originAirport.city}, {flightDetails.originAirport.country}</div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Departure</div>
                        {flightDetails.originAirport?.timezone ? (
                          <div className="space-y-1 text-sm">
                            {(() => {
                              const timezones = getMultiTimezoneDisplay(
                                flightDetails.departureTime, 
                                flightDetails.originAirport.timezone, 
                                flightDetails.destinationAirport?.timezone || 'UTC'
                              );
                              return (
                                <>
                                  <div className="font-medium">{timezones.user.time}</div>
                                  <div className="text-muted-foreground text-xs">{timezones.user.label}</div>
                                </>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="space-y-1 text-sm">
                            <div className="font-medium">{formatTimeWithTimezone(flightDetails.departureTime, getUserTimezone(), true)}</div>
                            <div className="text-muted-foreground text-xs">Your timezone</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Flight Duration */}
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Clock className="h-6 w-6 text-muted-foreground" />
                      <div className="text-lg font-medium">{formatDuration(flightDetails.flightDurationMinutes)}</div>
                      <div className="text-sm text-muted-foreground">Flight Duration</div>
                      <div className="text-center">
                        <div className="text-sm font-medium">{flightDetails.aircraft.code}</div>
                        <div className="text-xs text-muted-foreground">{flightDetails.aircraft.model}</div>
                      </div>
                    </div>

                    {/* Destination */}
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{flightDetails.destinationAirport.code}</div>
                        <div className="text-sm text-muted-foreground">{flightDetails.destinationAirport.name}</div>
                        <div className="text-xs text-muted-foreground">{flightDetails.destinationAirport.city}, {flightDetails.destinationAirport.country}</div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm font-medium">
                          {flightDetails.actualArrivalTime ? 'Actual Arrival' : 'Estimated Arrival'}
                        </div>
                        {flightDetails.destinationAirport?.timezone ? (
                          <div className="space-y-1 text-sm">
                            {(() => {
                              const arrivalTime = flightDetails.actualArrivalTime || flightDetails.estimatedArrivalTime;
                              const timezones = getMultiTimezoneDisplay(
                                arrivalTime, 
                                flightDetails.originAirport?.timezone || 'UTC', 
                                flightDetails.destinationAirport.timezone
                              );
                              return (
                                <>
                                  <div className="font-medium">{timezones.user.time}</div>
                                  <div className="text-muted-foreground text-xs">{timezones.user.label}</div>
                                </>
                              );
                            })()}
                          </div>
                        ) : (
                          <div className="space-y-1 text-sm">
                            <div className="font-medium">
                              {formatTimeWithTimezone(
                                flightDetails.actualArrivalTime || flightDetails.estimatedArrivalTime, 
                                getUserTimezone(), 
                                true
                              )}
                            </div>
                            <div className="text-muted-foreground text-xs">Your timezone</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Available Fares */}
              {flightDetails.availableFares && flightDetails.availableFares.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Available Fares & Pricing</CardTitle>
                    <CardDescription>
                      Current fare classes and pricing information for this flight
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      {flightDetails.availableFares.map((fare, index) => (
                        <Card 
                          key={fare.id} 
                          className={`border-l-4 ${getFareTypeColors(fare.fareType).border}`}
                        >
                          <CardContent className="pt-4">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-semibold text-lg">{fare.name}</h4>
                                  <Badge 
                                    variant="outline"
                                    className={`font-semibold ${getFareTypeColors(fare.fareType).badge}`}
                                  >
                                    {formatFareType(fare.fareType)}
                                  </Badge>
                                </div>
                                <div className="space-y-1">
                                  <div className="text-sm text-muted-foreground">Price</div>
                                  <div className="text-xl font-bold text-primary">
                                    {Number(fare.price).toLocaleString('vi-VN')} VND
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="text-sm text-muted-foreground">Seat Information</div>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span>Total Seats:</span>
                                    <span className="font-medium">{fare.totalSeats}</span>
                                  </div>
                                  <div className="flex justify-between text-sm">
                                    <span>Seat Range:</span>
                                    <code className="text-xs bg-muted px-1 rounded">
                                      {fare.seats && fare.seats.length > 0 
                                        ? `${fare.seats[0]} - ${fare.seats[fare.seats.length - 1]}` 
                                        : 'N/A'}
                                    </code>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="text-sm text-muted-foreground">Benefits</div>
                                {fare.benefits && fare.benefits.length > 0 ? (
                                  <div className="space-y-1">
                                    {fare.benefits.slice(0, 3).map((benefit, benefitIndex) => (
                                      <div key={benefitIndex} className="flex items-center gap-2 text-sm">
                                        <Check className="h-4 w-4 text-green-600" />
                                        <span>{benefit.name}</span>
                                      </div>
                                    ))}
                                    {fare.benefits.length > 3 && (
                                      <div className="text-xs text-muted-foreground">
                                        +{fare.benefits.length - 3} more benefits
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-sm text-muted-foreground">No additional benefits</div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Aircraft Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Aircraft Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Aircraft Code:</span>
                        <span className="font-medium">{flightDetails.aircraft.code}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Model:</span>
                        <span className="font-medium">{flightDetails.aircraft.model}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Aircraft ID:</span>
                        <span className="font-medium text-xs font-mono">{flightDetails.aircraft.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Capacity:</span>
                        <span className="font-medium">{flightDetails.totalSeats || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : selectedFlight ? (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold">Flight {selectedFlight.code}</h3>
                    <p className="text-muted-foreground">Basic information (detailed data unavailable)</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Origin:</span>
                        <span>{typeof selectedFlight.origin === 'object' ? (selectedFlight.origin.code || selectedFlight.origin.name) : selectedFlight.origin}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Departure:</span>
                        <span>{formatTimeWithTimezone(selectedFlight.departureTime, getUserTimezone(), true)}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Destination:</span>
                        <span>{typeof selectedFlight.destination === 'object' ? (selectedFlight.destination.code || selectedFlight.destination.name) : selectedFlight.destination}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Arrival:</span>
                        <span>{formatTimeWithTimezone(selectedFlight.estimatedArrivalTime, getUserTimezone(), true)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  <Plane className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No flight data available</p>
                </div>
              </CardContent>
            </Card>
          )}
            
          <DialogFooter className="mt-6">
            <Button 
              variant="outline" 
              onClick={() => {
                setDetailsModalOpen(false);
                setFlightDetails(null);
                setDetailsError(null);
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Add getSortIcon helper
  const getSortIcon = (field) => {
    const [currentField, currentDirection] = sortBy.split(':');
    if (currentField !== field) {
      return null;
    }
    return currentDirection === 'asc' ? (
      <SortAsc className="inline h-4 w-4 ml-1" />
    ) : (
      <SortDesc className="inline h-4 w-4 ml-1" />
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-600">Loading flights...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="mx-auto max-w-md p-6 my-8">
        <CardHeader>
          <div className="flex items-center justify-center text-red-600 mb-2">
            <AlertCircle className="h-8 w-8" />
          </div>
          <CardTitle className="text-center text-red-600">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center mb-4">{error}</p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={fetchFlights} variant="outline">
            Retry
          </Button>
        </CardFooter>
      </Card>
    );
  }
  return (
    <div className="w-full">
      {renderDetailsModal()}
      
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Flight Management</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate('/dashboard/flights/add')}
            className="gap-2"
          >
            <Plane className="h-4 w-4" />
            Create New Flight
          </Button>
          <Button
            variant="secondary"
            onClick={() => setShowSearchBar(!showSearchBar)}
            className="gap-2"
          >
            <Search className="h-4 w-4" />
            {showSearchBar ? 'Hide Search' : 'Show Search'}
          </Button>
        </div>
      </div>

      {showSearchBar && (
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="code">Flight Code</Label>
                <Input
                  id="code"
                  name="code"
                  placeholder="Flight Code"
                  value={searchForm.code}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="origin">Origin Airport</Label>
                <Input
                  id="origin"
                  name="origin"
                  placeholder="Origin Airport"
                  value={searchForm.origin}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination">Destination Airport</Label>
                <Input
                  id="destination"
                  name="destination"
                  placeholder="Destination Airport"
                  value={searchForm.destination}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={searchForm.status} 
                  onValueChange={(value) => handleFilterChange({ target: { name: 'status', value }})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Statuses</SelectItem>
                    <SelectItem value="SCHEDULED_OPEN">Scheduled Open</SelectItem>
                    <SelectItem value="SCHEDULED_CLOSED">Scheduled Closed</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={searchForm.startDate}
                  onChange={(e) => handleDateChange('startDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={searchForm.endDate}
                  onChange={(e) => handleDateChange('endDate', e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button variant="outline" onClick={handleClearSearch}>
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => handleSort('code')}>
                Flight Code {getSortIcon('code')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('origin')}>
                Origin {getSortIcon('origin')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('destination')}>
                Destination {getSortIcon('destination')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('departureTime')}>
                Departure (Your Time) {getSortIcon('departureTime')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('estimatedArrivalTime')}>
                Arrival (Your Time) {getSortIcon('estimatedArrivalTime')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('flightDurationMinutes')}>
                Duration {getSortIcon('flightDurationMinutes')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('status')}>
                Status {getSortIcon('status')}
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {flights.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-4 text-gray-500">
                  No flights found
                </TableCell>
              </TableRow>
            ) : (
              flights.map((flight) => (
                <TableRow key={flight.id}>
                  <TableCell>{flight.code}</TableCell>
                  <TableCell>{typeof flight.origin === 'object' ? (flight.origin.code || flight.origin.name) : flight.origin}</TableCell>
                  <TableCell>{typeof flight.destination === 'object' ? (flight.destination.code || flight.destination.name) : flight.destination}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {formatTimeWithTimezone(flight.departureTime, getUserTimezone(), true)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDateWithTimezone(flight.departureTime, getUserTimezone())}
                      </div>
                      <div className="text-xs text-gray-400">
                        UTC: {formatTimeWithTimezone(flight.departureTime, 'UTC', false)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">
                        {formatTimeWithTimezone(flight.estimatedArrivalTime, getUserTimezone(), true)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDateWithTimezone(flight.estimatedArrivalTime, getUserTimezone())}
                      </div>
                      <div className="text-xs text-gray-400">
                        UTC: {formatTimeWithTimezone(flight.estimatedArrivalTime, 'UTC', false)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{formatDuration(flight.flightDurationMinutes)}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-sm ${
                      flight.status.includes("SCHEDULED") ? "bg-blue-100 text-blue-800" :
                      flight.status.includes("IN_PROGRESS") ? "bg-yellow-100 text-yellow-800" :
                      flight.status.includes("COMPLETED") ? "bg-green-100 text-green-800" :
                      flight.status.includes("CANCELLED") ? "bg-red-100 text-red-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {flight.status.replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(flight)}
                      >
                        <Info className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/dashboard/flights/${flight.id}/edit`)}
                      >
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between mt-6">
        <div className="flex items-center gap-2">
          <Label htmlFor="pageSize">Rows per page:</Label>
          <Select value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange({ target: { value: Number(value) }})}>
            <SelectTrigger className="w-20">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="text-sm text-gray-600">
          Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalElements)} of {totalElements} entries
        </div>

        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
          >
            First
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = currentPage <= 3 
              ? i + 1 
              : currentPage >= totalPages - 2 
                ? totalPages - 4 + i 
                : currentPage - 2 + i;
            
            if (pageNum > 0 && pageNum <= totalPages) {
              return (
                <Button
                  key={pageNum}
                  size="sm"
                  variant={currentPage === pageNum ? "default" : "outline"}
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            }
            return null;
          })}

          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            Last
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FlightList;