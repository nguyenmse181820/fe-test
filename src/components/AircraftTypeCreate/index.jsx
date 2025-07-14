import { useState } from 'react';
import { Container, Form, Button, Row, Col, Card, Alert, Badge, Tab, Tabs } from 'react-bootstrap';
import { FaCogs, FaTrash, FaPlus, FaChair } from 'react-icons/fa';
import axiosInstance from '../../utils/axios'
import { useToast } from "@/hooks/use-toast";

import AircraftDetail from "../AircraftDetail"

const MAX_SEATS_PER_ROW = 12;
const MAX_TOTAL_ROWS = 20;
const MAX_ROW_NUMBER = 20;

function AircraftTypeCreate({ onSuccess, initialData, isEditMode = false }) {
  const { toast } = useToast();

  const [formData, setFormData] = useState(initialData || {
    manufacturer: 'Boeing',
    model: '',
    seatClasses: [
      { class: 'first', fromRow: 1, toRow: 2, pattern: '1-1-1', seats: generateSeats(1, 2, '1-1-1') },
      { class: 'business', fromRow: 4, toRow: 6, pattern: '2-2-2', seats: generateSeats(4, 6, '2-2-2') },
      { class: 'economy', fromRow: 8, toRow: 12, pattern: '3-4-3', seats: generateSeats(8, 12, '3-4-3') }
    ],
    spaces: [
      { type: 'space', label: 'galley', fromRow: 3, toRow: 3 },
      { type: 'space', label: 'toilet', fromRow: 7, toRow: 7 }
    ]
  });

  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('basic');

  const formTitle = isEditMode ? "Update Aircraft Type" : "Create New Aircraft Type";
  const submitButtonText = isEditMode ? "Update" : "Create";

  // Hàm tạo ghế tự động
  function generateSeats(fromRow, toRow, pattern) {
    if (!fromRow || !toRow || !pattern) return [];
    
    const seats = [];
    const seatGroups = pattern.split('-');
    
    for (let row = fromRow; row <= toRow; row++) {
      let seatLetterCode = 65;
      
      seatGroups.forEach(group => {
        const seatCount = parseInt(group);
        
        for (let i = 0; i < seatCount; i++) {
          const letter = String.fromCharCode(seatLetterCode + i);
          seats.push({ seatCode: `${row}${letter}` });
        }
        
        seatLetterCode += seatCount;
      });
    }
    
    return seats;
  }

  const handleBasicInfoChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Xử lý thay đổi hạng ghế
  const handleSeatClassChange = (index, field, value) => {
    const updatedSeatClasses = [...formData.seatClasses];
    updatedSeatClasses[index][field] = value;
    
    if (['fromRow', 'toRow', 'pattern'].includes(field)) {
      updatedSeatClasses[index].seats = generateSeats(
        updatedSeatClasses[index].fromRow,
        updatedSeatClasses[index].toRow,
        updatedSeatClasses[index].pattern
      );
    }
    
    setFormData(prev => ({ ...prev, seatClasses: updatedSeatClasses }));
  };

  // Xử lý thay đổi khoảng trống
  const handleSpaceChange = (index, field, value) => {
  const updatedSpaces = [...formData.spaces];
  
  if (field === 'fromRow') {
    updatedSpaces[index].fromRow = value;
    updatedSpaces[index].toRow = value;
  } else if (field === 'toRow') {
    if (value !== updatedSpaces[index].fromRow) return;
    updatedSpaces[index].toRow = value;
  } else {
    updatedSpaces[index][field] = value;
  }

  setFormData(prev => ({ ...prev, spaces: updatedSpaces }));
};

  // Thêm hạng ghế mới
  const addSeatClass = () => {
    setFormData(prev => ({
      ...prev,
      seatClasses: [
        ...prev.seatClasses,
        { class: '', fromRow: 1, toRow: 2, pattern: '', seats: [] }
      ]
    }));
  };

  // Thêm khoảng trống mới
  const addSpace = () => {
    setFormData(prev => ({
      ...prev,
      spaces: [
        ...prev.spaces,
        { type: 'space', label: '', fromRow: 1, toRow: 1 }
      ]
    }));
  };

  // Xóa hạng ghế
  const removeSeatClass = (index) => {
    const updatedSeatClasses = [...formData.seatClasses];
    updatedSeatClasses.splice(index, 1);
    setFormData(prev => ({ ...prev, seatClasses: updatedSeatClasses }));
  };

  // Xóa khoảng trống
  const removeSpace = (index) => {
    const updatedSpaces = [...formData.spaces];
    updatedSpaces.splice(index, 1);
    setFormData(prev => ({ ...prev, spaces: updatedSpaces }));
  };

  const validateForm = () => {
  const newErrors = {};
  let isValid = true;
  const usedRowRanges = [];
  let totalRows = 0;
  let maxRowNumber = 0;

  // Validate basic info
  if (!formData.model.trim()) {
    newErrors.model = "Model is required";
    isValid = false;
    toast({
      variant: "destructive",
      title: "Validation Error",
      description: "Model is required",
      duration: 3000,
    });
  }

  // Validate seat classes
  formData.seatClasses.forEach((seatClass, index) => {
    const keyPrefix = `seatClass-${index}`;
    
    if (!seatClass.class.trim()) {
      newErrors[`${keyPrefix}-class`] = "Class is required";
      isValid = false;
    }

    const fromRow = Number(seatClass.fromRow);
    const toRow = Number(seatClass.toRow);
    
    if (isNaN(fromRow)) {
      newErrors[`${keyPrefix}-fromRow`] = "From row must be a number";
      isValid = false;
    }
    
    if (isNaN(toRow)) {
      newErrors[`${keyPrefix}-toRow`] = "To row must be a number";
      isValid = false;
    }
    
    if (!isNaN(fromRow) && !isNaN(toRow)) {
      // Validate row number range
      if (fromRow < 1 || fromRow > MAX_ROW_NUMBER || toRow < 1 || toRow > MAX_ROW_NUMBER) {
        newErrors[`${keyPrefix}-rows`] = `Row must be between 1 and ${MAX_ROW_NUMBER}`;
        isValid = false;
      }
      
      // Validate fromRow <= toRow
      if (fromRow > toRow) {
        newErrors[`${keyPrefix}-rows`] = "From row cannot be greater than to row";
        isValid = false;
      }
      
      // Calculate total rows and max row
      if (isValid) {
        const rowCount = toRow - fromRow + 1;
        totalRows += rowCount;
        maxRowNumber = Math.max(maxRowNumber, toRow);
      }
    }

    // Validate pattern
    if (!seatClass.pattern.trim()) {
      newErrors[`${keyPrefix}-pattern`] = "Pattern is required";
      isValid = false;
    } else if (!/^\d+(?:-\d+)*$/.test(seatClass.pattern)) {
      newErrors[`${keyPrefix}-pattern`] = "Pattern is not valid (EX: 2-2-2, 3-4-3)";
      isValid = false;
    } else {
      const seatsPerRow = seatClass.pattern.split('-').reduce((sum, num) => sum + Number(num), 0);
      if (seatsPerRow > MAX_SEATS_PER_ROW) {
        newErrors[`${keyPrefix}-pattern`] = `Maximum ${MAX_SEATS_PER_ROW} seats per row (current: ${seatsPerRow})`;
        isValid = false;
      }
    }

    // Check for row conflicts only if rows are valid
    if (!newErrors[`${keyPrefix}-rows`] && !isNaN(fromRow) && !isNaN(toRow)) {
      const newRange = { from: fromRow, to: toRow, type: "seatClass", index };
      
      for (const existingRange of usedRowRanges) {
        if (isRangeOverlap(newRange, existingRange)) {
          newErrors[`${keyPrefix}-rows`] = 
            `Rows ${fromRow}-${toRow} conflict with existing rows ${existingRange.from}-${existingRange.to} in ${existingRange.type}`;
          isValid = false;
          break;
        }
      }
      
      if (!newErrors[`${keyPrefix}-rows`]) {
        usedRowRanges.push(newRange);
      }
    }
  });

  // Validate spaces
  formData.spaces.forEach((space, index) => {
    const keyPrefix = `space-${index}`;
    
    if (!space.label.trim()) {
      newErrors[`${keyPrefix}-label`] = "Label is required";
      isValid = false;
    }

    const fromRow = Number(space.fromRow);
    const toRow = Number(space.toRow);
    
    if (isNaN(fromRow)) {
      newErrors[`${keyPrefix}-fromRow`] = "From row must be a number";
      isValid = false;
    }
    
    if (isNaN(toRow)) {
      newErrors[`${keyPrefix}-toRow`] = "To row must be a number";
      isValid = false;
    }
    
    if (!isNaN(fromRow) && !isNaN(toRow)) {
      // Validate row number range
      if (fromRow < 1 || fromRow > MAX_ROW_NUMBER || toRow < 1 || toRow > MAX_ROW_NUMBER) {
        newErrors[`${keyPrefix}-rows`] = `Row must be between 1 and ${MAX_ROW_NUMBER}`;
        isValid = false;
      }
      
      // Validate fromRow === toRow for spaces
      if (fromRow !== toRow) {
        newErrors[`${keyPrefix}-rows`] = "From row and To row must be equal for spaces";
        isValid = false;
      }
      
      // Calculate total rows and max row
      if (isValid) {
        totalRows += 1; // Space always counts as 1 row
        maxRowNumber = Math.max(maxRowNumber, toRow);
      }
    }

    // Check for row conflicts only if rows are valid
    if (!newErrors[`${keyPrefix}-rows`] && !isNaN(fromRow) && !isNaN(toRow)) {
      const newRange = { from: fromRow, to: toRow, type: "space", index };
      
      for (const existingRange of usedRowRanges) {
        if (isRangeOverlap(newRange, existingRange)) {
          newErrors[`${keyPrefix}-rows`] =
            `Rows ${fromRow}-${toRow} conflict with existing rows ${existingRange.from}-${existingRange.to} in ${existingRange.type}`;
          isValid = false;
          break;
        }
      }
      
      if (!newErrors[`${keyPrefix}-rows`]) {
        usedRowRanges.push(newRange);
      }
    }
  });

  // Validate total rows
  if (totalRows > MAX_TOTAL_ROWS) {
    newErrors.global = `Total rows cannot exceed ${MAX_TOTAL_ROWS} (current: ${totalRows})`;
    isValid = false;
  }

  // Validate max row number
  if (maxRowNumber > MAX_ROW_NUMBER) {
    newErrors.global = newErrors.global 
      ? `${newErrors.global} and max row cannot exceed ${MAX_ROW_NUMBER}`
      : `Max row cannot exceed ${MAX_ROW_NUMBER}`;
    isValid = false;
  }

  setErrors(newErrors);
  return isValid;
};

  function isRangeOverlap(range1, range2) {
    return (
      (range1.from >= range2.from && range1.from <= range2.to) ||
      (range1.to >= range2.from && range1.to <= range2.to) ||
      (range2.from >= range1.from && range2.from <= range1.to)
    );
  }

  const generatePayload = () => {
    const totalSeats = formData.seatClasses.reduce(
      (total, seatClass) => total + seatClass.seats.length, 0
    );
    
    const layout = {};
    
    // Thêm các hạng ghế
    formData.seatClasses.forEach(seatClass => {
      layout[seatClass.class] = {
        seats: seatClass.seats,
        fromRow: seatClass.fromRow,
        toRow: seatClass.toRow,
        pattern: seatClass.pattern
      };
    });
    
    // Thêm các khoảng trống
    formData.spaces.forEach((space, index) => {
      layout[`space${index + 1}`] = {
        type: space.type,
        label: space.label,
        fromRow: space.fromRow,
        toRow: space.toRow
      };
    });
    
    return {
      aircraftType: {
        model: formData.model,
        manufacturer: formData.manufacturer,
        totalSeats: totalSeats,
        seatMap: {
          layout: layout
        }
      }
    };
    
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      const payload = generatePayload();
      console.log('Payload to send:', payload);
      
      try {
        if (isEditMode) {
          const response = await axiosInstance.put(`/air-craft/api/v1/aircraft-type/${initialData.id}`, payload);
        
          if (response.data && response.data.status === 'Success') {
            setTimeout(() => {
              onSuccess();
            }, 1500);
          }
        } else {
          const response = await axiosInstance.post('/air-craft/api/v1/aircraft-type', payload);
        
          if (response.data && response.data.status === 'Success') {
            setTimeout(() => {
              onSuccess();
            }, 1500);
          }
        }
      } catch (error) {
        console.error('Error creating aircraft type:', error);
      }
    }
  };

  // Tính tổng số ghế
  const totalSeats = formData.seatClasses.reduce(
    (total, seatClass) => total + seatClass.seats.length, 0
  );

const handleViewMap = () => {
    const isValid = validateForm(); // Kiểm tra validation
    
    console.log(isValid)

    if (isValid) {
      setShowPreview(true); // Chỉ hiển thị preview khi không có lỗi
    } else {
      // Có thể thêm toast thông báo nếu muốn
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fix all errors before viewing map",
        duration: 3000,
      });
    }
  };

  return (
    <Container className="py-4">
      <Card className="shadow-lg border-0">
        <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <FaCogs className="me-2" size={24} />
            <h4 className="mb-0">{formTitle}</h4>
          </div>
          <Badge bg="light" text="primary" className="fs-6">
            Total Seats: {totalSeats}
          </Badge>
        </Card.Header>
        
        <Card.Body>
          {errors.global && (
            <Alert variant="danger" className="mb-4">
              {errors.global}
            </Alert>
          )}
          <Tabs
            activeKey={activeTab}
            onSelect={(k) => setActiveTab(k)}
            className="mb-4"
            fill
          >
            <Tab eventKey="basic" title="Basic Information">
              <Form onSubmit={handleSubmit} className="mt-3">
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group controlId="manufacturer">
                      <Form.Label>Manufacturer <span className="text-danger">*</span></Form.Label>
                      <Form.Select
                        name="manufacturer"
                        value={formData.manufacturer}
                        onChange={handleBasicInfoChange}
                      >
                        <option value="Boeing">Boeing</option>
                        <option value="Airbus">Airbus</option>
                        <option value="Embraer">Embraer</option>
                        <option value="ATR">ATR</option>
                        <option value="Other">Other</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group controlId="model">
                      <Form.Label>Model <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="text"
                        name="model"
                        value={formData.model}
                        onChange={handleBasicInfoChange}
                        isInvalid={!!errors.model}
                        placeholder="E.g: 777, A350, ..."
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.model}
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>
                
                <div className="d-flex justify-content-between mt-4">
                  <Button variant="outline-secondary" onClick={() => setActiveTab('seats')}>
                    Next: Seats Detail
                  </Button>
                </div>
              </Form>
            </Tab>
            
            <Tab eventKey="seats" title="Seats Detail">
              <div className="mt-3">
                <h5 className="mb-3 d-flex align-items-center">
                  <FaChair className="me-2" /> Classes
                  <Button variant="outline-primary" size="sm" className="ms-auto" onClick={addSeatClass}>
                    <FaPlus /> Add Class
                  </Button>
                </h5>
                
                {formData.seatClasses.map((seatClass, index) => (
                  <Card key={index} className="mb-3 border-primary">
                    <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                      <strong className="text-primary">
                        {seatClass.class || 'New seat class'}
                        <Badge bg="info" className="ms-2">
                          {seatClass.seats.length} seats
                        </Badge>
                      </strong>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => removeSeatClass(index)}
                      >
                        <FaTrash />
                      </Button>
                    </Card.Header>
                    <Card.Body>
                      <Row className="g-3">
                        <Col md={4}>
                          <Form.Group controlId={`seatClass-${index}-class`}>
                            <Form.Label>Class <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                              type="text"
                              value={seatClass.class}
                              onChange={(e) => handleSeatClassChange(index, 'class', e.target.value)}
                              isInvalid={!!errors[`seatClass-${index}-class`]}
                              placeholder="E.g: first, business, economy"
                            />
                            <Form.Control.Feedback type="invalid">
                              {errors[`seatClass-${index}-class`]}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        
                        <Col md={2}>
                          <Form.Group controlId={`seatClass-${index}-fromRow`}>
                            <Form.Label>From row <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                              type="number"
                              min="1"
                              value={seatClass.fromRow}
                              onChange={(e) => handleSeatClassChange(index, 'fromRow', parseInt(e.target.value))}
                              isInvalid={!!errors[`seatClass-${index}-rows`]}
                            />
                          </Form.Group>
                        </Col>
                        
                        <Col md={2}>
                          <Form.Group controlId={`seatClass-${index}-toRow`}>
                            <Form.Label>To row <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                              type="number"
                              min={seatClass.fromRow}
                              value={seatClass.toRow}
                              onChange={(e) => handleSeatClassChange(index, 'toRow', parseInt(e.target.value))}
                              isInvalid={!!errors[`seatClass-${index}-rows`]}
                            />
                            <Form.Control.Feedback type="invalid">
                              {errors[`seatClass-${index}-rows`]}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        
                        <Col md={4}>
                          <Form.Group controlId={`seatClass-${index}-pattern`}>
                            <Form.Label>Pattern <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                              type="text"
                              value={seatClass.pattern}
                              onChange={(e) => handleSeatClassChange(index, 'pattern', e.target.value)}
                              isInvalid={!!errors[`seatClass-${index}-pattern`]}
                              placeholder="E.g: 2-2-2, 3-4-3"
                            />
                            <Form.Text className="text-muted">
                              The number of seats per row (use "-" to separate)
                            </Form.Text>
                            <Form.Control.Feedback type="invalid">
                              {errors[`seatClass-${index}-pattern`]}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                ))}
                
                <h5 className="mt-4 mb-3 d-flex align-items-center">
                  <FaChair className="me-2" /> Spaces
                  <Button variant="outline-secondary" size="sm" className="ms-auto" onClick={addSpace}>
                    <FaPlus /> Add space
                  </Button>
                </h5>
                
                {formData.spaces.map((space, index) => (
                  <Card key={index} className="mb-3 border-secondary">
                    <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                      <strong className="text-secondary">
                        {space.label || 'New Space'}
                      </strong>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => removeSpace(index)}
                      >
                        <FaTrash />
                      </Button>
                    </Card.Header>
                    <Card.Body>
                      <Row className="g-3">
                        <Col md={6}>
                          <Form.Group controlId={`space-${index}-label`}>
                            <Form.Label>Label <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                              type="text"
                              value={space.label}
                              onChange={(e) => handleSpaceChange(index, 'label', e.target.value)}
                              isInvalid={!!errors[`space-${index}-label`]}
                              placeholder="E.g: galley, toilet, ..."
                            />
                            <Form.Control.Feedback type="invalid">
                              {errors[`space-${index}-label`]}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        
                        <Col md={3}>
                          <Form.Group controlId={`space-${index}-fromRow`}>
                            <Form.Label>From row <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                              type="number"
                              min="1"
                              value={space.fromRow}
                              onChange={(e) => handleSpaceChange(index, 'fromRow', parseInt(e.target.value))}
                              isInvalid={!!errors[`space-${index}-rows`]}
                            />
                          </Form.Group>
                        </Col>
                        
                        <Col md={3}>
                          <Form.Group controlId={`space-${index}-toRow`}>
                            <Form.Label>To row <span className="text-danger">*</span></Form.Label>
                            <Form.Control
                              type="number"
                              min={space.fromRow}
                              value={space.toRow}
                              onChange={(e) => handleSpaceChange(index, 'toRow', parseInt(e.target.value))}
                              isInvalid={!!errors[`space-${index}-rows`]}
                            />
                            <Form.Control.Feedback type="invalid">
                              {errors[`space-${index}-rows`]}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                ))}
                
                <div className="d-flex justify-content-between mt-4">
                  <Button variant="outline-secondary" onClick={() => setActiveTab('basic')}>
                    Back to basic information
                  </Button>
                  <div>
                    <Button variant="outline-info" className="me-2" onClick={handleViewMap}>
                      View seat map
                    </Button>
                    <Button variant="primary" type="submit" onClick={handleSubmit}>
                      {submitButtonText}
                    </Button>
                  </div>
                </div>
              </div>
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      {showPreview && <AircraftDetail show={showPreview} onHide={() => setShowPreview(false)} selectedAircraft={generatePayload()} isAircraftType={true} />}

    </Container>
  );
};

export default AircraftTypeCreate
