import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../../../utils/axios';
import { 
  AlertCircle, 
  ArrowRight,
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Globe,
  Info,
  Loader2, 
  MapPin,
  Plus,
  Route,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

const RouteList = () => {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  
  // Sorting state
  const [sortBy, setSortBy] = useState('origin.name:asc');
  
  // Filter state (applied filters)
  const [appliedFilters, setAppliedFilters] = useState({
    'origin.name': '',
    'destination.name': '',
    'origin.code': '',
    'destination.code': ''
  });
  
  // Search form state (input values)
  const [searchForm, setSearchForm] = useState({ 
    originName: '', 
    destinationName: '', 
    originCode: '', 
    destinationCode: ''
  });
  const [showSearchBar, setShowSearchBar] = useState(false);

  // Modal state
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);

  const fetchRoutes = async () => {
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
          params.append(key, value);
        }
      });

      const response = await axiosInstance.get(`/flight-service/api/v1/fs/routes?${params.toString()}`);
      
      if (response.data.statusCode === 200) {
        const { content, totalElements, totalPages } = response.data.data;
        setRoutes(content);
        setTotalElements(totalElements);
        setTotalPages(totalPages);
      } else {
        throw new Error('Failed to fetch routes');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching routes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
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

  const handleSearch = () => {
    setAppliedFilters({
      'origin.name': searchForm.originName,
      'destination.name': searchForm.destinationName,
      'origin.code': searchForm.originCode,
      'destination.code': searchForm.destinationCode
    });
    setCurrentPage(1);
    setShowSearchBar(false);
  };

  const handleClearFilters = () => {
    setSearchForm({ 
      originName: '', 
      destinationName: '', 
      originCode: '', 
      destinationCode: ''
    });
    setAppliedFilters({
      'origin.name': '',
      'destination.name': '',
      'origin.code': '',
      'destination.code': ''
    });
    setCurrentPage(1);
  };

  const handleViewDetails = (route) => {
    setSelectedRoute(route);
    setDetailsModalOpen(true);
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

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

  if (loading && routes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-600">Loading routes...</p>
      </div>
    );
  }

  if (error && routes.length === 0) {
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
          <Button onClick={fetchRoutes} variant="outline">
            Retry
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Route className="h-8 w-8" />
          Routes Management
        </h1>
        <div className="flex gap-2">
          <Button
            onClick={() => navigate('/dashboard/routes/create')}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Route
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

      {/* Search/Filter Bar */}
      {showSearchBar && (
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="originName">Origin Name</Label>
                <Input
                  id="originName"
                  name="originName"
                  placeholder="Search by origin name..."
                  value={searchForm.originName}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="originCode">Origin Code</Label>
                <Input
                  id="originCode"
                  name="originCode"
                  placeholder="Search by origin code..."
                  value={searchForm.originCode}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destinationName">Destination Name</Label>
                <Input
                  id="destinationName"
                  name="destinationName"
                  placeholder="Search by destination name..."
                  value={searchForm.destinationName}
                  onChange={handleFilterChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destinationCode">Destination Code</Label>
                <Input
                  id="destinationCode"
                  name="destinationCode"
                  placeholder="Search by destination code..."
                  value={searchForm.destinationCode}
                  onChange={handleFilterChange}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
              <Button variant="outline" onClick={handleClearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Applied Filters Display */}
      {Object.values(appliedFilters).some(filter => filter) && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-blue-800">Active filters:</span>
              {Object.entries(appliedFilters).map(([key, value]) => 
                value && (
                  <Badge key={key} variant="secondary" className="bg-blue-100 text-blue-800">
                    {key.replace('.', ' ')}: {value}
                  </Badge>
                )
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearFilters}
                className="text-blue-600 hover:text-blue-800"
              >
                <X className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Routes Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => handleSort('origin.name')}>
                Origin {getSortIcon('origin.name')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('destination.name')}>
                Destination {getSortIcon('destination.name')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('estimatedDurationMinutes')}>
                Duration {getSortIcon('estimatedDurationMinutes')}
              </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {routes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <Route className="h-12 w-12 opacity-50" />
                    <p>No routes found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              routes.map((route) => (
                <TableRow key={route.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-600" />
                          <span className="font-semibold text-lg">{route.origin.code}</span>
                        </div>
                        <div className="text-sm font-medium">{route.origin.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {route.origin.city}, {route.origin.country}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-green-600" />
                          <span className="font-semibold text-lg">{route.destination.code}</span>
                        </div>
                        <div className="text-sm font-medium">{route.destination.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {route.destination.city}, {route.destination.country}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="font-medium">{formatDuration(route.estimatedDurationMinutes)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(route)}
                    >
                      <Info className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-6">
        <div className="flex items-center gap-2">
          <Label htmlFor="pageSize">Rows per page:</Label>
          <Select value={pageSize.toString()} onValueChange={(value) => {
            setPageSize(Number(value));
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-20">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
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
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          >
            First
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCurrentPage(currentPage - 1)}
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
                  onClick={() => setCurrentPage(pageNum)}
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
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            Last
          </Button>
        </div>
      </div>

      {/* Route Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setDetailsModalOpen(false);
          setSelectedRoute(null);
        }
      }}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Route className="h-5 w-5" />
              Route Details
            </DialogTitle>
            <DialogDescription>
              Complete information about the selected route including airports and flight duration.
            </DialogDescription>
          </DialogHeader>
          
          {selectedRoute && (
            <div className="space-y-6">
              {/* Route Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Route Information</span>
                    <Badge variant="outline" className="font-mono">
                      ID: {selectedRoute.id}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Origin */}
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <MapPin className="h-5 w-5 text-blue-600" />
                          <span className="text-sm font-medium text-blue-600">ORIGIN</span>
                        </div>
                        <div className="text-2xl font-bold">{selectedRoute.origin.code}</div>
                        <div className="text-sm text-muted-foreground">{selectedRoute.origin.name}</div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Location:</span>
                          <span>{selectedRoute.origin.city}, {selectedRoute.origin.country}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Timezone:</span>
                          <div className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            <span className="font-mono text-xs">{selectedRoute.origin.timezone}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <ArrowRight className="h-8 w-8 text-gray-400" />
                      <div className="text-center">
                        <div className="flex items-center gap-2 justify-center mb-1">
                          <Clock className="h-5 w-5 text-gray-600" />
                          <span className="text-lg font-bold">{formatDuration(selectedRoute.estimatedDurationMinutes)}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">Estimated Duration</div>
                      </div>
                    </div>

                    {/* Destination */}
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <MapPin className="h-5 w-5 text-green-600" />
                          <span className="text-sm font-medium text-green-600">DESTINATION</span>
                        </div>
                        <div className="text-2xl font-bold">{selectedRoute.destination.code}</div>
                        <div className="text-sm text-muted-foreground">{selectedRoute.destination.name}</div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Location:</span>
                          <span>{selectedRoute.destination.city}, {selectedRoute.destination.country}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Timezone:</span>
                          <div className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            <span className="font-mono text-xs">{selectedRoute.destination.timezone}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Additional Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      Origin Airport Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Airport Code</div>
                        <div className="font-medium">{selectedRoute.origin.code}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Full Name</div>
                        <div className="font-medium">{selectedRoute.origin.name}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">City</div>
                        <div className="font-medium">{selectedRoute.origin.city}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Country</div>
                        <div className="font-medium">{selectedRoute.origin.country}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-green-600" />
                      Destination Airport Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Airport Code</div>
                        <div className="font-medium">{selectedRoute.destination.code}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Full Name</div>
                        <div className="font-medium">{selectedRoute.destination.name}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">City</div>
                        <div className="font-medium">{selectedRoute.destination.city}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Country</div>
                        <div className="font-medium">{selectedRoute.destination.country}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDetailsModalOpen(false)}
            >
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RouteList;
