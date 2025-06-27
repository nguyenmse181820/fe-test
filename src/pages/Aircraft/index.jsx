import { useEffect, useState } from "react"
import { Container, Row, Col, Card, Button, Badge, Modal, Form, Pagination, Spinner, Alert, Nav } from "react-bootstrap"
import { FaPlane, FaPlus, FaSearch, FaFilter, FaEdit, FaCogs } from "react-icons/fa"
import "bootstrap/dist/css/bootstrap.min.css"
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import AircraftDetail from "../../components/AircraftDetail"
import AircraftCreate from "../../components/AircraftCreate"
import AircraftTypeCreate from "../../components/AircraftTypeCreate"
import axiosInstance from '../../utils/axios'
import "./Aircraft.css"

function AircraftManagement() {
  const [activeTab, setActiveTab] = useState('aircraft')
  
  // Aircraft states
  const [aircrafts, setAircrafts] = useState([])
  const [filteredAircrafts, setFilteredAircrafts] = useState(aircrafts)
  const [selectedAircraft, setSelectedAircraft] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [searchTerm, setSearchTerm] = useState("")
  const [searchField, setSearchField] = useState("code")
  const [showDeleted, setShowDeleted] = useState(false)
  
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(8)
  const [totalItems, setTotalItems] = useState(0)

  const [showEditModal, setShowEditModal] = useState(false)
  const [editingAircraft, setEditingAircraft] = useState(null)

  // Aircraft Type states
  const [aircraftTypes, setAircraftTypes] = useState([])
  const [filteredAircraftTypes, setFilteredAircraftTypes] = useState([])
  const [selectedAircraftType, setSelectedAircraftType] = useState(null)
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [showCreateTypeModal, setShowCreateTypeModal] = useState(false)
  const [typeLoading, setTypeLoading] = useState(true)
  const [typeError, setTypeError] = useState(null)
  
  const [typeSearchTerm, setTypeSearchTerm] = useState("")
  const [typeSearchField, setTypeSearchField] = useState("model")
  const [showDeletedTypes, setShowDeletedTypes] = useState(false)
  
  const [typeCurrentPage, setTypeCurrentPage] = useState(1)
  const [typeTotalItems, setTypeTotalItems] = useState(0)

  const [showEditTypeModal, setShowEditTypeModal] = useState(false)
  const [editingAircraftType, setEditingAircraftType] = useState(null)

  const fetchAircrafts = async () => {
    setLoading(true)
    setError(null)
    try {
        const response = await axiosInstance.get('/air-craft/api/v1/aircraft', {
          params: {
            currentPage: currentPage,
            pageSize: itemsPerPage,
          }
        })

        if (response.data.code === 'Success') {
          setAircrafts(response.data.data || [])
          setTotalItems(response.data.totalElements || 0)
        } else {
          setError('Unexpected response format')
        }
      } catch (err) {
        setError('Failed to fetch aircraft data')
        console.error('API Error:', err)
      } finally {
        setLoading(false)
      }
  };

  const fetchAircraftTypes = async () => {
    setTypeLoading(true)
    setTypeError(null)
    try {
        const response = await axiosInstance.get('/air-craft/api/v1/aircraft-type', {
          params: {
            currentPage: typeCurrentPage,
            pageSize: itemsPerPage,
          }
        })

        if (response.data.code === 'Success') {
          setAircraftTypes(response.data.data || [])
          setTypeTotalItems(response.data.totalElements || 0)
        } else {
          setTypeError('Unexpected response format')
        }
      } catch (err) {
        setTypeError('Failed to fetch aircraft type data')
        console.error('API Error:', err)
      } finally {
        setTypeLoading(false)
      }
  };

  useEffect(() => {
    if (activeTab === 'aircraft') {
      fetchAircrafts()
    } else {
      fetchAircraftTypes()
    }
  }, [activeTab, currentPage, typeCurrentPage, itemsPerPage])

  useEffect(() => {
    const filtered = aircrafts.filter(aircraft => {
      if (!showDeleted && aircraft.deleted) return false
      
      const searchLower = searchTerm.toLowerCase()
      switch (searchField) {
        case 'code':
          return aircraft.code.toLowerCase().includes(searchLower)
        case 'model':
          return aircraft.aircraftType?.model.toLowerCase().includes(searchLower)
        case 'manufacturer':
          return aircraft.aircraftType?.manufacturer.toLowerCase().includes(searchLower)
        default:
          return true
      }
    })
    
    setFilteredAircrafts(filtered)
  }, [aircrafts, searchTerm, searchField, showDeleted])

  useEffect(() => {
    const filtered = aircraftTypes.filter(type => {
      if (!showDeletedTypes && type.deleted) return false
      
      const searchLower = typeSearchTerm.toLowerCase()
      switch (typeSearchField) {
        case 'model':
          return type.model.toLowerCase().includes(searchLower)
        case 'manufacturer':
          return type.manufacturer.toLowerCase().includes(searchLower)
        default:
          return true
      }
    })
    
    setFilteredAircraftTypes(filtered)
  }, [aircraftTypes, typeSearchTerm, typeSearchField, showDeletedTypes])

  const handleViewDetails = (aircraft) => {
    setSelectedAircraft(aircraft)
    setShowModal(true)
  }

  const handleViewTypeDetails = (aircraftType) => {
    
    var formAircraftType = {
      aircraftType: {
        model: aircraftType.model,
        manufacturer: aircraftType.manufacturer,
        totalSeats: aircraftType.totalSeats,
        seatMap: {
          layout: aircraftType.seatMap.layout
        }
      }
    }

    setSelectedAircraftType(formAircraftType)
    setShowTypeModal(true)
  }

  const handleDeleteAircraft = async (id) => {
    if (!window.confirm("Are you sure you want to delete this aircraft?")) return
    
    try {
       const response = await axiosInstance.delete(`/air-craft/api/v1/aircraft/${id}`)

       if (response.data.status == 'Success') {
          toast.success("You deleted successfully!")
          fetchAircrafts()
       }
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete aircraft')
    }
  }

  const handleDeleteAircraftType = async (id) => {
    if (!window.confirm("Are you sure you want to delete this aircraft type?")) return
    
    try {
       const response = await axiosInstance.delete(`/air-craft/api/v1/aircraft-type/${id}`)

        console.log(response)

       if (response.data.status == 'Success') {
          toast.success("Aircraft type deleted successfully!")
          fetchAircraftTypes()
       }
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete aircraft type')
    }
  }

  const handleRestoreAircraft = async (id) => {
    try {
      const response = await axiosInstance.put(`/air-craft/api/v1/aircraft/${id}/restore`)

      if (response.data.status == 'Success') {
          toast.success("You restored successfully!")
          fetchAircrafts()
       }
    } catch (err) {
      console.error('Restore error:', err)
      alert('Failed to restore aircraft')
    }
  }

  const handleRestoreAircraftType = async (id) => {
    try {
      const response = await axiosInstance.put(`/air-craft/api/v1/aircraft-type/${id}/restore`)

      if (response.data.status == 'Success') {
          toast.success("Aircraft type restored successfully!")
          fetchAircraftTypes()
       }
    } catch (err) {
      console.error('Restore error:', err)
      alert('Failed to restore aircraft type')
    }
  }

  const getManufacturerIcon = (manufacturer) => {
    switch (manufacturer?.toLowerCase()) {
      case "boeing":
        return <FaPlane className="text-primary" />
      case "airbus":
        return <FaPlane className="text-info" />
      default:
        return <FaPlane className="text-secondary" />
    }
  }

  const getTotalSeats = (seatMap) => {
    if (!seatMap || !seatMap.layout) return 0
    return Object.values(seatMap.layout).reduce((total, section) => {
      return total + (section.seats ? section.seats.length : 0)
    }, 0)
  }

  const handleEditAircraft = (aircraft) => {
    const initialData = {
      id: aircraft.id,
      code: aircraft.code,
      manufacturer: aircraft.aircraftType?.manufacturer || 'Boeing',
      model: aircraft.aircraftType?.model || '',
      seatClasses: [],
      spaces: []
    };

    if (aircraft.aircraftType?.seatMap?.layout) {
      Object.entries(aircraft.aircraftType.seatMap.layout).forEach(([key, value]) => {
        if (value.type === 'space') {
          initialData.spaces.push({
            type: value.type,
            label: value.label,
            fromRow: value.fromRow,
            toRow: value.toRow
          });
        } else {
          initialData.seatClasses.push({
            class: key,
            fromRow: value.fromRow,
            toRow: value.toRow,
            pattern: value.pattern,
            seats: value.seats
          });
        }
      });
    }

    setEditingAircraft(initialData);
    setShowEditModal(true);
  };

  const handleEditAircraftType = (aircraftType) => {
    const initialData = {
      id: aircraftType.id,
      manufacturer: aircraftType.manufacturer || 'Boeing',
      model: aircraftType.model || '',
      seatClasses: [],
      spaces: []
    };

    if (aircraftType.seatMap?.layout) {
      Object.entries(aircraftType.seatMap.layout).forEach(([key, value]) => {
        if (value.type === 'space') {
          initialData.spaces.push({
            type: value.type,
            label: value.label,
            fromRow: value.fromRow,
            toRow: value.toRow
          });
        } else {
          initialData.seatClasses.push({
            class: key,
            fromRow: value.fromRow,
            toRow: value.toRow,
            pattern: value.pattern,
            seats: value.seats
          });
        }
      });
    }

    setEditingAircraftType(initialData);
    setShowEditTypeModal(true);
  };

  const currentData = activeTab === 'aircraft' ? filteredAircrafts : filteredAircraftTypes
  const currentLoading = activeTab === 'aircraft' ? loading : typeLoading
  const currentError = activeTab === 'aircraft' ? error : typeError
  const currentTotalItems = activeTab === 'aircraft' ? totalItems : typeTotalItems
  const currentPage_active = activeTab === 'aircraft' ? currentPage : typeCurrentPage
  const setCurrentPage_active = activeTab === 'aircraft' ? setCurrentPage : setTypeCurrentPage

  const totalPages = Math.ceil(currentTotalItems / itemsPerPage)
  const paginationItems = []
  for (let number = 1; number <= totalPages; number++) {
    paginationItems.push(
      <Pagination.Item 
        key={number} 
        active={number === currentPage_active}
        onClick={() => setCurrentPage_active(number)}
      >
        {number}
      </Pagination.Item>
    )
  }

  const renderAircraftCard = (aircraft) => (
    <Col key={aircraft.id} xl={3} lg={4} md={6}>
      <Card className="h-100 aircraft-card shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center bg-white border-bottom-0 pb-0">
          <div className="d-flex align-items-center">
            <span className="me-2">
              {getManufacturerIcon(aircraft.aircraftType?.manufacturer)}
            </span>
            <h5 className="mb-0">{aircraft.code}</h5>
            {aircraft.deleted && (
              <Badge bg="danger" className="ms-2">
                Deleted
              </Badge>
            )}
          </div>
          <Badge bg="light" text="dark">
            {aircraft.aircraftType?.model}
          </Badge>
        </Card.Header>

        <Card.Body>
          <div className="d-flex justify-content-between mb-2">
            <div>
              <small className="text-muted">Manufacturer</small>
              <p className="mb-0 fw-bold">
                {aircraft.aircraftType?.manufacturer || "N/A"}
              </p>
            </div>
            <div className="text-end">
              <small className="text-muted">Total Seats</small>
              <p className="mb-0 fw-bold">
                {getTotalSeats(aircraft.aircraftType?.seatMap) || "N/A"}
              </p>
            </div>
          </div>

          <div className="d-flex justify-content-between">
            <div>
              <small className="text-muted">Status</small>
              <p className="mb-0">
                {aircraft.deleted ? (
                  <Badge bg="danger">Deleted</Badge>
                ) : (
                  <Badge bg="success">Active</Badge>
                )}
              </p>
            </div>
          </div>
        </Card.Body>

        <Card.Footer className="bg-white border-top-0 d-flex justify-content-between">
          <Button 
            variant="outline-primary" 
            size="sm"
            onClick={() => handleViewDetails(aircraft)}
          >
            Details
          </Button>
          <Button 
            variant="outline-warning" 
            size="sm"
            onClick={() => handleEditAircraft(aircraft)}
            className="me-2"
          >
            Edit
          </Button>
          {aircraft.deleted ? (
            <Button 
              variant="outline-success" 
              size="sm"
              onClick={() => handleRestoreAircraft(aircraft.id)}
            >
              Restore
            </Button>
          ) : (
            <Button 
              variant="outline-danger" 
              size="sm"
              onClick={() => handleDeleteAircraft(aircraft.id)}
            >
              Delete
            </Button>
          )}
        </Card.Footer>
      </Card>
    </Col>
  )

  const renderAircraftTypeCard = (aircraftType) => (
    <Col key={aircraftType.id} xl={3} lg={4} md={6}>
      <Card className="h-100 aircraft-card shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center bg-white border-bottom-0 pb-0">
          <div className="d-flex align-items-center">
            <span className="me-2">
              {getManufacturerIcon(aircraftType.manufacturer)}
            </span>
            <h5 className="mb-0">{aircraftType.model}</h5>
            {aircraftType.deleted && (
              <Badge bg="danger" className="ms-2">
                Deleted
              </Badge>
            )}
          </div>
          <Badge bg="light" text="dark">
            Type
          </Badge>
        </Card.Header>

        <Card.Body>
          <div className="d-flex justify-content-between mb-2">
            <div>
              <small className="text-muted">Manufacturer</small>
              <p className="mb-0 fw-bold">
                {aircraftType.manufacturer || "N/A"}
              </p>
            </div>
            <div className="text-end">
              <small className="text-muted">Total Seats</small>
              <p className="mb-0 fw-bold">
                {getTotalSeats(aircraftType.seatMap) || "N/A"}
              </p>
            </div>
          </div>

          <div className="d-flex justify-content-between">
            <div>
              <small className="text-muted">Status</small>
              <p className="mb-0">
                {aircraftType.deleted ? (
                  <Badge bg="danger">Deleted</Badge>
                ) : (
                  <Badge bg="success">Active</Badge>
                )}
              </p>
            </div>
          </div>
        </Card.Body>

        <Card.Footer className="bg-white border-top-0 d-flex justify-content-between">
          <Button 
            variant="outline-primary" 
            size="sm"
            onClick={() => handleViewTypeDetails(aircraftType)}
          >
            Details
          </Button>
          <Button 
            variant="outline-warning" 
            size="sm"
            onClick={() => handleEditAircraftType(aircraftType)}
            className="me-2"
          >
            Edit
          </Button>
          {aircraftType.deleted ? (
            <Button 
              variant="outline-success" 
              size="sm"
              onClick={() => handleRestoreAircraftType(aircraftType.id)}
            >
              Restore
            </Button>
          ) : (
            <Button 
              variant="outline-danger" 
              size="sm"
              onClick={() => handleDeleteAircraftType(aircraftType.id)}
            >
              Delete
            </Button>
          )}
        </Card.Footer>
      </Card>
    </Col>
  )

  return (
    <Container fluid className="py-4 aircraft-management">
      {/* Navigation Tabs */}
      <Nav variant="tabs" className="mb-4">
        <Nav.Item>
          <Nav.Link 
            active={activeTab === 'aircraft'} 
            onClick={() => setActiveTab('aircraft')}
            className="d-flex align-items-center"
          >
            <FaPlane className="me-2" />
            Aircraft Management
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link 
            active={activeTab === 'aircraftType'} 
            onClick={() => setActiveTab('aircraftType')}
            className="d-flex align-items-center"
          >
            <FaCogs className="me-2" />
            Aircraft Type Management
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {/* Header Section */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h1 className="display-5 fw-bold mb-1">
              {activeTab === 'aircraft' ? (
                <>
                  <FaPlane className="me-2" /> Aircraft Management
                </>
              ) : (
                <>
                  <FaCogs className="me-2" /> Aircraft Type Management
                </>
              )}
            </h1>
            <p className="text-muted mb-0">
              {activeTab === 'aircraft' 
                ? "Manage and configure your airline's aircraft inventory"
                : "Manage aircraft types and their configurations"
              }
            </p>
          </div>
          <Button 
            variant="primary" 
            onClick={() => activeTab === 'aircraft' ? setShowCreateModal(true) : setShowCreateTypeModal(true)}
            className="d-flex align-items-center"
          >
            <FaPlus className="me-2" /> 
            {activeTab === 'aircraft' ? 'Add New Aircraft' : 'Add New Aircraft Type'}
          </Button>
        </div>

        {/* Search and Filter Bar */}
        <Card className="mb-4 shadow-sm">
          <Card.Body>
            <Row className="g-3">
              <Col md={4}>
                <Form.Group controlId="searchField">
                  <Form.Label>Search Field</Form.Label>
                  <Form.Select 
                    value={activeTab === 'aircraft' ? searchField : typeSearchField}
                    onChange={(e) => activeTab === 'aircraft' ? setSearchField(e.target.value) : setTypeSearchField(e.target.value)}
                  >
                    {activeTab === 'aircraft' ? (
                      <>
                        <option value="code">Aircraft Code</option>
                        <option value="model">Model</option>
                        <option value="manufacturer">Manufacturer</option>
                      </>
                    ) : (
                      <>
                        <option value="model">Model</option>
                        <option value="manufacturer">Manufacturer</option>
                      </>
                    )}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={5}>
                <Form.Group controlId="searchTerm">
                  <Form.Label>Search Term</Form.Label>
                  <div className="input-group">
                    <Form.Control 
                      type="text" 
                      placeholder={`Search by ${activeTab === 'aircraft' ? searchField : typeSearchField}...`}
                      value={activeTab === 'aircraft' ? searchTerm : typeSearchTerm}
                      onChange={(e) => activeTab === 'aircraft' ? setSearchTerm(e.target.value) : setTypeSearchTerm(e.target.value)}
                    />
                    <Button variant="outline-secondary">
                      <FaSearch />
                    </Button>
                  </div>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group controlId="showDeleted">
                  <Form.Label>Status Filter</Form.Label>
                  <div className="d-flex align-items-center">
                    <Form.Check
                      type="switch"
                      id="show-deleted-switch"
                      label="Show Deleted"
                      checked={activeTab === 'aircraft' ? showDeleted : showDeletedTypes}
                      onChange={() => activeTab === 'aircraft' ? setShowDeleted(!showDeleted) : setShowDeletedTypes(!showDeletedTypes)}
                      className="me-2"
                    />
                    <FaFilter />
                  </div>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </div>

      {/* Status Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="shadow-sm border-start border-primary border-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-uppercase text-muted mb-0">
                    Total {activeTab === 'aircraft' ? 'Aircraft' : 'Types'}
                  </h6>
                  <h3 className="mb-0">{currentTotalItems}</h3>
                </div>
                <div className="icon-circle bg-primary-light">
                  {activeTab === 'aircraft' ? <FaPlane className="text-primary" /> : <FaCogs className="text-primary" />}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="shadow-sm border-start border-success border-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-uppercase text-muted mb-0">Active</h6>
                  <h3 className="mb-0">
                    {activeTab === 'aircraft' 
                      ? aircrafts.filter(a => !a.deleted).length
                      : aircraftTypes.filter(a => !a.deleted).length
                    }
                  </h3>
                </div>
                <div className="icon-circle bg-success-light">
                  {activeTab === 'aircraft' ? <FaPlane className="text-success" /> : <FaCogs className="text-success" />}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="shadow-sm border-start border-danger border-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-uppercase text-muted mb-0">Deleted</h6>
                  <h3 className="mb-0">
                    {activeTab === 'aircraft' 
                      ? aircrafts.filter(a => a.deleted).length
                      : aircraftTypes.filter(a => a.deleted).length
                    }
                  </h3>
                </div>
                <div className="icon-circle bg-danger-light">
                  {activeTab === 'aircraft' ? <FaPlane className="text-danger" /> : <FaCogs className="text-danger" />}
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="shadow-sm border-start border-info border-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="text-uppercase text-muted mb-0">Showing</h6>
                  <h3 className="mb-0">
                    {currentData.length} / {activeTab === 'aircraft' ? aircrafts.length : aircraftTypes.length}
                  </h3>
                </div>
                <div className="icon-circle bg-info-light">
                  <FaFilter className="text-info" />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Loading and Error States */}
      {currentLoading && (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading {activeTab === 'aircraft' ? 'aircraft' : 'aircraft type'} data...</p>
        </div>
      )}

      {currentError && (
        <Alert variant="danger" className="my-4">
          <strong>Error:</strong> {currentError}
        </Alert>
      )}

      {/* Data Grid */}
      {!currentLoading && !currentError && (
        <>
          {currentData.length === 0 ? (
            <Card className="text-center py-5 shadow-sm">
              <Card.Body>
                {activeTab === 'aircraft' ? <FaPlane className="text-muted mb-3" size={48} /> : <FaCogs className="text-muted mb-3" size={48} />}
                <h4>No {activeTab === 'aircraft' ? 'aircraft' : 'aircraft types'} found</h4>
                <p className="text-muted">Try adjusting your search or filter criteria</p>
                <Button variant="primary" onClick={() => {
                  if (activeTab === 'aircraft') {
                    setSearchTerm("")
                    setSearchField("code")
                    setShowDeleted(false)
                  } else {
                    setTypeSearchTerm("")
                    setTypeSearchField("model")
                    setShowDeletedTypes(false)
                  }
                }}>
                  Reset filters
                </Button>
              </Card.Body>
            </Card>
          ) : (
            <>
              <Row className="g-4 mb-4">
                {activeTab === 'aircraft' 
                  ? currentData.map(renderAircraftCard)
                  : currentData.map(renderAircraftTypeCard)
                }
              </Row>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="d-flex justify-content-center">
                  <Pagination>
                    <Pagination.First 
                      onClick={() => setCurrentPage_active(1)} 
                      disabled={currentPage_active === 1} 
                    />
                    <Pagination.Prev 
                      onClick={() => setCurrentPage_active(p => Math.max(1, p - 1))} 
                      disabled={currentPage_active === 1} 
                    />
                    {paginationItems}
                    <Pagination.Next 
                      onClick={() => setCurrentPage_active(p => Math.min(totalPages, p + 1))} 
                      disabled={currentPage_active === totalPages} 
                    />
                    <Pagination.Last 
                      onClick={() => setCurrentPage_active(totalPages)} 
                      disabled={currentPage_active === totalPages} 
                    />
                  </Pagination>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Aircraft Detail Modal */}
      <AircraftDetail 
        show={showModal} 
        onHide={() => setShowModal(false)} 
        selectedAircraft={selectedAircraft}
      />

      {/* Aircraft Type Detail Modal */}
      <AircraftDetail 
        show={showTypeModal} 
        onHide={() => setShowTypeModal(false)} 
        selectedAircraft={selectedAircraftType}
        isAircraftType={true}
      />

      {/* Create Aircraft Modal */}
      <Modal 
        show={showCreateModal} 
        onHide={() => setShowCreateModal(false)}
        size="xl"
        centered
        backdrop="static"
      >
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <FaPlus className="me-2" /> Register New Aircraft
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          <AircraftCreate onSuccess={() => {
            setShowCreateModal(false)
            toast.success('Create aircraft successfully!');
            fetchAircrafts()
          }} />
        </Modal.Body>
      </Modal>

      {/* Create Aircraft Type Modal */}
      <Modal 
        show={showCreateTypeModal} 
        onHide={() => setShowCreateTypeModal(false)}
        size="xl"
        centered
        backdrop="static"
      >
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <FaPlus className="me-2" /> Register New Aircraft Type
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          <AircraftTypeCreate onSuccess={() => {
            setShowCreateTypeModal(false)
            toast.success('Create aircraft type successfully!');
            fetchAircraftTypes()
          }} />
        </Modal.Body>
      </Modal>

      {/* Edit Aircraft Modal */}
      <Modal 
        show={showEditModal} 
        onHide={() => setShowEditModal(false)}
        size="xl"
        centered
        backdrop="static"
      >
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <FaEdit className="me-2" /> Update Aircraft
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          <AircraftCreate 
            onSuccess={() => {
              setShowEditModal(false);
              toast.success('Aircraft updated successfully!');
              fetchAircrafts();
            }} 
            initialData={editingAircraft}
            isEditMode={true}
          />
        </Modal.Body>
      </Modal>

      {/* Edit Aircraft Type Modal */}
      <Modal 
        show={showEditTypeModal} 
        onHide={() => setShowEditTypeModal(false)}
        size="xl"
        centered
        backdrop="static"
      >
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <FaEdit className="me-2" /> Update Aircraft Type
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          <AircraftTypeCreate 
            onSuccess={() => {
              setShowEditTypeModal(false);
              toast.success('Aircraft type updated successfully!');
              fetchAircraftTypes();
            }} 
            initialData={editingAircraftType}
            isEditMode={true}
          />
        </Modal.Body>
      </Modal>

      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
        theme="light"
      />

    </Container>
  )
}

export default AircraftManagement
