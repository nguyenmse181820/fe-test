import { useState, useEffect } from "react"
import { Container, Form, Button, Row, Col, Card, Badge, Tab, Tabs } from "react-bootstrap"
import { FaPlane, FaTrash, FaPlus, FaChair } from "react-icons/fa"
import axiosInstance from '../../utils/axios'
import { useToast } from "@/hooks/use-toast";

import AircraftDetail from "../AircraftDetail"

function AircraftCreate({ onSuccess, initialData, isEditMode = false }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState(
    initialData || {
      code: "",
      manufacturer: "Boeing",
      model: "",
      seatClasses: [
        { class: "first", fromRow: 1, toRow: 2, pattern: "1-1-1", seats: generateSeats(1, 2, "1-1-1") },
        { class: "business", fromRow: 4, toRow: 6, pattern: "2-2-2", seats: generateSeats(4, 6, "2-2-2") },
        { class: "economy", fromRow: 8, toRow: 12, pattern: "3-4-3", seats: generateSeats(8, 12, "3-4-3") },
      ],
      spaces: [
        { type: "space", label: "galley", fromRow: 3, toRow: 3 },
        { type: "space", label: "toilet", fromRow: 7, toRow: 7 },
      ],
    },
  )

  const [showPreview, setShowPreview] = useState(false)
  const [errors, setErrors] = useState({})
  const [activeTab, setActiveTab] = useState("basic")

  const [aircraftTypes, setAircraftTypes] = useState([])
  const [selectedAircraftType, setSelectedAircraftType] = useState("")
  const [useExistingType, setUseExistingType] = useState(false)
  const [loadingTypes, setLoadingTypes] = useState(false)

  const formTitle = isEditMode ? "Update Aircraft" : "Create New Aircraft"
  const submitButtonText = isEditMode ? "Update" : "Create"

  // Fetch aircraft types when component mounts
  useEffect(() => {
    const fetchAircraftTypes = async () => {
      if (!isEditMode) {
        // Only fetch for create mode
        setLoadingTypes(true)
        try {
          const response = await axiosInstance.get("/air-craft/api/v1/aircraft-type/non-paging/active")

          console.log(response)

          if (response.data.status === "Success") {
            setAircraftTypes(response.data.data || [])

            console.log(aircraftTypes)

          }
        } catch (error) {
          console.error("Error fetching aircraft types:", error)
        } finally {
          setLoadingTypes(false)
        }
      }
    }

    fetchAircraftTypes()
  }, [isEditMode])

  // Hàm tạo ghế tự động
  function generateSeats(fromRow, toRow, pattern) {
    if (!fromRow || !toRow || !pattern) return []

    const seats = []
    const seatGroups = pattern.split("-")

    for (let row = fromRow; row <= toRow; row++) {
      let seatLetterCode = 65

      seatGroups.forEach((group) => {
        const seatCount = Number.parseInt(group)

        for (let i = 0; i < seatCount; i++) {
          const letter = String.fromCharCode(seatLetterCode + i)
          seats.push({ seatCode: `${row}${letter}` })
        }

        seatLetterCode += seatCount
      })
    }

    return seats
  }

  const handleBasicInfoChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleAircraftTypeSelection = (e) => {
    const typeId = e.target.value
    setSelectedAircraftType(typeId)

    if (typeId) {
      const selectedType = aircraftTypes.find((type) => type.id.toString() === typeId)
      if (selectedType) {
        // Update form data with selected aircraft type info
        setFormData((prev) => ({
          ...prev,
          manufacturer: selectedType.manufacturer,
          model: selectedType.model,
          seatClasses: [],
          spaces: [],
        }))

        // Parse the selected type's seat map to populate form
        if (selectedType.seatMap?.layout) {
          const seatClasses = []
          const spaces = []

          Object.entries(selectedType.seatMap.layout).forEach(([key, value]) => {
            if (value.type === "space") {
              spaces.push({
                type: value.type,
                label: value.label,
                fromRow: value.fromRow,
                toRow: value.toRow,
              })
            } else {
              seatClasses.push({
                class: key,
                fromRow: value.fromRow,
                toRow: value.toRow,
                pattern: value.pattern,
                seats: value.seats,
              })
            }
          })

          setFormData((prev) => ({
            ...prev,
            seatClasses,
            spaces,
          }))
        }
      }
    } else {
      // Reset to default values when no type is selected
      setFormData((prev) => ({
        ...prev,
        manufacturer: "Boeing",
        model: "",
        seatClasses: [
          { class: "first", fromRow: 1, toRow: 2, pattern: "1-1-1", seats: generateSeats(1, 2, "1-1-1") },
          { class: "business", fromRow: 4, toRow: 6, pattern: "2-2-2", seats: generateSeats(4, 6, "2-2-2") },
          { class: "economy", fromRow: 8, toRow: 12, pattern: "3-4-3", seats: generateSeats(8, 12, "3-4-3") },
        ],
        spaces: [
          { type: "space", label: "galley", fromRow: 3, toRow: 3 },
          { type: "space", label: "toilet", fromRow: 7, toRow: 7 },
        ],
      }))
    }
  }

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

  // Xử lý thay đổi hạng ghế
  const handleSeatClassChange = (index, field, value) => {
    const updatedSeatClasses = [...formData.seatClasses]
    updatedSeatClasses[index][field] = value

    if (["fromRow", "toRow", "pattern"].includes(field)) {
      updatedSeatClasses[index].seats = generateSeats(
        updatedSeatClasses[index].fromRow,
        updatedSeatClasses[index].toRow,
        updatedSeatClasses[index].pattern,
      )
    }

    setFormData((prev) => ({ ...prev, seatClasses: updatedSeatClasses }))
  }

  // Xử lý thay đổi khoảng trống
const handleSpaceChange = (index, field, value) => {
  const updatedSpaces = [...formData.spaces];
  
  // Nếu thay đổi fromRow thì tự động cập nhật toRow bằng cùng giá trị
  if (field === 'fromRow') {
    updatedSpaces[index].fromRow = value;
    updatedSpaces[index].toRow = value;
  } 
  // Nếu thay đổi toRow thì kiểm tra nó phải bằng fromRow
  else if (field === 'toRow') {
    if (value !== updatedSpaces[index].fromRow) {
      // Nếu khác nhau thì không cho thay đổi
      return;
    }
    updatedSpaces[index].toRow = value;
  } 
  else {
    updatedSpaces[index][field] = value;
  }

  setFormData((prev) => ({ ...prev, spaces: updatedSpaces }));
};

  // Thêm hạng ghế mới
  const addSeatClass = () => {
    setFormData((prev) => ({
      ...prev,
      seatClasses: [...prev.seatClasses, { class: "", fromRow: 1, toRow: 2, pattern: "", seats: [] }],
    }))
  }

  // Thêm khoảng trống mới
  const addSpace = () => {
    setFormData((prev) => ({
      ...prev,
      spaces: [...prev.spaces, { type: "space", label: "", fromRow: 1, toRow: 1 }],
    }))
  }

  // Xóa hạng ghế
  const removeSeatClass = (index) => {
    const updatedSeatClasses = [...formData.seatClasses]
    updatedSeatClasses.splice(index, 1)
    setFormData((prev) => ({ ...prev, seatClasses: updatedSeatClasses }))
  }

  // Xóa khoảng trống
  const removeSpace = (index) => {
    const updatedSpaces = [...formData.spaces]
    updatedSpaces.splice(index, 1)
    setFormData((prev) => ({ ...prev, spaces: updatedSpaces }))
  }

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;
    const usedRowRanges = [];
    const MAX_SEATS_PER_ROW = 12;
    const MAX_TOTAL_ROWS = 20;
    const MAX_ROW_NUMBER = 20;

    let totalRows = 0;
    let maxRowNumber = 0;

    // Reset errors
    setErrors({});

    // Validate basic info (giữ nguyên)
    if (!formData.code.trim()) {
      newErrors.code = "Code is required";
      isValid = false;
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Code is required",
        duration: 3000,
      });
    }

    if (useExistingType && !selectedAircraftType) {
      newErrors.aircraftType = "Please select an aircraft type";
      isValid = false;
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please select an aircraft type",
        duration: 3000,
      });
    }

    if (!useExistingType && !formData.model.trim()) {
      newErrors.model = "Model is required";
      isValid = false;
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Model is required",
        duration: 3000,
      });
    }

    // Validate seat classes (thêm validation mới)
    formData.seatClasses.forEach((seatClass, index) => {
      const keyPrefix = `seatClass-${index}`;
      
      // Giữ nguyên các validation cũ
      if (!seatClass.class.trim()) {
        newErrors[`${keyPrefix}-class`] = "Class is required";
        isValid = false;
      }

      const fromRow = Number(seatClass.fromRow);
      const toRow = Number(seatClass.toRow);
      
      if (isNaN(fromRow) || isNaN(toRow)) {
        newErrors[`${keyPrefix}-rows`] = "Row is not valid";
        isValid = false;
      } else {

        if (toRow > MAX_ROW_NUMBER) {
          newErrors[`${keyPrefix}-rows`] = `Row number cannot exceed ${MAX_ROW_NUMBER}`;
          isValid = false;
        }

        // Thêm validation cho MAX_TOTAL_ROWS (20 rows)
        const rowCount = toRow - fromRow + 1;
        if (rowCount > MAX_TOTAL_ROWS) {
          newErrors[`${keyPrefix}-rows`] = `Maximum ${MAX_TOTAL_ROWS} rows allowed (current: ${rowCount})`;
          isValid = false;
        }
        totalRows += rowCount;
        
        // Cập nhật max row number
        if (toRow > maxRowNumber) {
          maxRowNumber = toRow;
        }
      }

      if (!seatClass.pattern.trim()) {
        newErrors[`${keyPrefix}-pattern`] = "Pattern is required";
        isValid = false;
      } else if (!/^\d+(?:-\d+)*$/.test(seatClass.pattern)) {
        newErrors[`${keyPrefix}-pattern`] = "Pattern is not valid (EX: 2-2-2, 3-4-3)";
        isValid = false;
      } else {
        // Thêm validation cho MAX_SEATS_PER_ROW (12 seats)
        const seatsPerRow = seatClass.pattern.split('-').reduce((sum, num) => sum + Number(num), 0);
        if (seatsPerRow > MAX_SEATS_PER_ROW) {
          newErrors[`${keyPrefix}-pattern`] = `Maximum ${MAX_SEATS_PER_ROW} seats per row (current: ${seatsPerRow})`;
          isValid = false;
        }
      }

      // Giữ nguyên validation check trùng row
      if (!newErrors[`${keyPrefix}-rows`]) {
        const newRange = { from: fromRow, to: toRow, type: "seatClass", index };
        
        for (const existingRange of usedRowRanges) {
          if (isRangeOverlap(newRange, existingRange)) {
            newErrors[`${keyPrefix}-rows`] = 
              `Rows ${fromRow}-${toRow} conflict with existing rows ${existingRange.from}-${existingRange.to}`;
            isValid = false;
            break;
          }
        }
        
        if (!newErrors[`${keyPrefix}-rows`]) {
          usedRowRanges.push(newRange);
        }
      }
    });

    formData.spaces.forEach((space, index) => {
    const keyPrefix = `space-${index}`;
    
    if (!space.label.trim()) {
      newErrors[`${keyPrefix}-label`] = "Label is required";
      isValid = false;
    }

    const fromRow = Number(space.fromRow);
    const toRow = Number(space.toRow);
    
    if (isNaN(fromRow) || isNaN(toRow)) {
      newErrors[`${keyPrefix}-rows`] = "Row is not valid";
      isValid = false;
    } else {
      // Kiểm tra max row number
      if (toRow > MAX_ROW_NUMBER) {
        newErrors[`${keyPrefix}-rows`] = `Row number cannot exceed ${MAX_ROW_NUMBER}`;
        isValid = false;
      }
      
      // Tính toán tổng rows (space luôn tính là 1 row)
      totalRows += 1;
      
      // Cập nhật max row number
      if (toRow > maxRowNumber) {
        maxRowNumber = toRow;
      }
    }

    const newRange = { from: fromRow, to: toRow, type: "space", index };
        
        for (const existingRange of usedRowRanges) {
          if (isRangeOverlap(newRange, existingRange)) {
            newErrors[`space-${index}-rows`] =
              `Rows ${fromRow}-${toRow} conflict with existing rows ${existingRange.from}-${existingRange.to} in ${existingRange.type}`;
            isValid = false;
            break;
          }
        }
        
        if (!newErrors[`space-${index}-rows`]) {
          usedRowRanges.push(newRange);
        }
  });

     if (totalRows > MAX_TOTAL_ROWS) {
        newErrors.global = `Total rows cannot exceed ${MAX_TOTAL_ROWS} (current: ${totalRows})`;
        isValid = false;
      }

      if (maxRowNumber > MAX_ROW_NUMBER) {
    newErrors.global = newErrors.global 
      ? `${newErrors.global} and max row cannot exceed ${MAX_ROW_NUMBER}`
      : `Max row cannot exceed ${MAX_ROW_NUMBER}`;
    isValid = false;
  }

    setErrors(newErrors);
    return isValid;
  };

  // Helper function để check overlap (giữ nguyên)
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
      code: formData.code,
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
    e.preventDefault()

    if (validateForm()) {
      const payload = generatePayload()
      console.log("Payload to send:", payload)

      try {
        if (isEditMode) {
          const response = await axiosInstance.put(`/air-craft/api/v1/aircraft/${initialData.id}`, payload)

          if (response.data && response.data.status === "Success") {
            setTimeout(() => {
              onSuccess()
            }, 1500)
          }
        } else {
          const response = await axiosInstance.post("/air-craft/api/v1/aircraft", payload)

          if (response.data && response.data.status == "Success") {
            // Gọi callback onSuccess sau 1.5 giây để người dùng kịp thấy thông báo
            setTimeout(() => {
              onSuccess() // Gọi hàm này để thông báo cho component cha
            }, 1500)
          }
        }
      } catch (error) {
        console.error("Error creating aircraft:", error)
        // Xử lý hiển thị lỗi nếu cần
      }
    }
  }

  // Tính tổng số ghế
  const totalSeats = formData.seatClasses.reduce((total, seatClass) => total + seatClass.seats.length, 0)

  console.log(generatePayload())

  return (
    <Container className="py-4">
      <Card className="shadow-lg border-0">
        <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <FaPlane className="me-2" size={24} />
            <h4 className="mb-0">{formTitle}</h4>
          </div>
          <Badge bg="light" text="primary" className="fs-6">
            Total Seats: {totalSeats}
          </Badge>
        </Card.Header>

        <Card.Body>
          <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4" fill>
            <Tab eventKey="basic" title="Basic Information">
              <Form onSubmit={handleSubmit} className="mt-3">
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group controlId="code">
                      <Form.Label>
                        Code <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="code"
                        value={formData.code}
                        onChange={handleBasicInfoChange}
                        isInvalid={!!errors.code}
                        placeholder="VD: VN-A777"
                      />
                      <Form.Control.Feedback type="invalid">{errors.code}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  {!isEditMode && (
                    <Col md={12}>
                      <Form.Group controlId="aircraftTypeSelection">
                        <Form.Label>Aircraft Type Selection</Form.Label>
                        <div className="d-flex align-items-center mb-2">
                          <Form.Check
                            type="radio"
                            id="use-existing-type"
                            name="typeSelection"
                            label="Use existing aircraft type"
                            checked={useExistingType}
                            onChange={() => {
                              setUseExistingType(true)
                              setSelectedAircraftType("")
                            }}
                            className="me-3"
                          />
                          <Form.Check
                            type="radio"
                            id="create-new-type"
                            name="typeSelection"
                            label="Create new aircraft type"
                            checked={!useExistingType}
                            onChange={() => {
                              setUseExistingType(false)
                              setSelectedAircraftType("")
                            }}
                          />
                        </div>

                        {useExistingType && (
                          <Form.Select
                            value={selectedAircraftType}
                            onChange={handleAircraftTypeSelection}
                            disabled={loadingTypes}
                          >
                            <option value="">
                              {loadingTypes ? "Loading aircraft types..." : "Select an aircraft type"}
                            </option>
                            {aircraftTypes.map((type) => (
                              <option key={type.id} value={type.id}>
                                {type.manufacturer} {type.model} ({type.totalSeats} seats)
                              </option>
                            ))}
                          </Form.Select>
                        )}
                      </Form.Group>
                    </Col>
                  )}

                  {(!useExistingType || isEditMode) && (
                    <>
                      <Col md={6}>
                        <Form.Group controlId="manufacturer">
                          <Form.Label>
                            Manufacturer <span className="text-danger">*</span>
                          </Form.Label>
                          <Form.Select
                            name="manufacturer"
                            value={formData.manufacturer}
                            onChange={handleBasicInfoChange}
                            disabled={useExistingType && selectedAircraftType}
                          >
                            <option value="Boeing">Boeing</option>
                            <option value="Airbus">Airbus</option>
                            <option value="Embraer">Embraer</option>
                            <option value="ATR">ATR</option>
                            <option value="Other">Khác</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group controlId="model">
                          <Form.Label>
                            Model <span className="text-danger">*</span>
                          </Form.Label>
                          <Form.Control
                            type="text"
                            name="model"
                            value={formData.model}
                            onChange={handleBasicInfoChange}
                            isInvalid={!!errors.model}
                            placeholder="VD: 777, A350, ..."
                            disabled={useExistingType && selectedAircraftType}
                          />
                          <Form.Control.Feedback type="invalid">{errors.model}</Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                    </>
                  )}
                </Row>

                <div className="d-flex justify-content-between mt-4">
                  <Button variant="outline-secondary" onClick={() => setActiveTab("seats")}>
                    Next: Seats Detail
                  </Button>
                </div>
              </Form>
            </Tab>

            <Tab eventKey="seats" title="Seats Detail">
              <div className="mt-3">
                <h5 className="mb-3 d-flex align-items-center">
                  <FaChair className="me-2" /> Classes
                  {useExistingType ? <></> : <Button variant="outline-primary" size="sm" className="ms-auto" onClick={addSeatClass}>
                    <FaPlus /> Add Class
                  </Button>} 
                </h5>

                {formData.seatClasses.map((seatClass, index) => (
                  <Card key={index} className="mb-3 border-primary">
                    <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                      <strong className="text-primary">
                        {seatClass.class || "Hạng ghế mới"}
                        <Badge bg="info" className="ms-2">
                          {seatClass.seats.length} seats
                        </Badge>
                      </strong>
                      {useExistingType ? <></> : <Button variant="outline-danger" size="sm" onClick={() => removeSeatClass(index)}>
                        <FaTrash />
                      </Button>}
                      
                    </Card.Header>
                    <Card.Body>
                      <Row className="g-3">
                        <Col md={4}>
                          <Form.Group controlId={`seatClass-${index}-class`}>
                            <Form.Label>
                              Class <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                              type="text"
                              value={seatClass.class}
                              onChange={(e) => handleSeatClassChange(index, "class", e.target.value)}
                              isInvalid={!!errors[`seatClass-${index}-class`]}
                              placeholder="VD: first, business, economy"
                              disabled={useExistingType}
                            />
                            <Form.Control.Feedback type="invalid">
                              {errors[`seatClass-${index}-class`]}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>

                        <Col md={2}>
                          <Form.Group controlId={`seatClass-${index}-fromRow`}>
                            <Form.Label>
                              From row <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                              type="number"
                              min="1"
                              value={seatClass.fromRow}
                              onChange={(e) => handleSeatClassChange(index, "fromRow", Number.parseInt(e.target.value))}
                              isInvalid={!!errors[`seatClass-${index}-rows`]}
                              disabled={useExistingType}
                            />
                          </Form.Group>
                        </Col>

                        <Col md={2}>
                          <Form.Group controlId={`seatClass-${index}-toRow`}>
                            <Form.Label>
                              To row <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                              type="number"
                              min={seatClass.fromRow}
                              value={seatClass.toRow}
                              onChange={(e) => handleSeatClassChange(index, "toRow", Number.parseInt(e.target.value))}
                              isInvalid={!!errors[`seatClass-${index}-rows`]}
                              disabled={useExistingType}
                            />
                            <Form.Control.Feedback type="invalid">
                              {errors[`seatClass-${index}-rows`]}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>

                        <Col md={4}>
                          <Form.Group controlId={`seatClass-${index}-pattern`}>
                            <Form.Label>
                              Pattern <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                              type="text"
                              value={seatClass.pattern}
                              onChange={(e) => handleSeatClassChange(index, "pattern", e.target.value)}
                              isInvalid={!!errors[`seatClass-${index}-pattern`]}
                              placeholder="VD: 2-2-2, 3-4-3"
                              disabled={useExistingType}
                            />
                            <Form.Text className="text-muted">
                              The number of seats per row (use "-" to valid form)
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
                  <FaChair className="me-2" /> Space
                  {useExistingType ? <></> : <Button variant="outline-secondary" size="sm" className="ms-auto" onClick={addSpace}>
                    <FaPlus /> Add space
                  </Button>} 
                </h5>

                {formData.spaces.map((space, index) => (
                  <Card key={index} className="mb-3 border-secondary">
                    <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                      <strong className="text-secondary">{space.label || "New Space"}</strong>
                      {useExistingType ? <></> : <Button variant="outline-danger" size="sm" onClick={() => removeSpace(index)}>
                        <FaTrash />
                      </Button>}
                    </Card.Header>
                    <Card.Body>
                      <Row className="g-3">
                        <Col md={6}>
                          <Form.Group controlId={`space-${index}-label`}>
                            <Form.Label>
                              Lable <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                              type="text"
                              value={space.label}
                              onChange={(e) => handleSpaceChange(index, "label", e.target.value)}
                              isInvalid={!!errors[`space-${index}-label`]}
                              placeholder="EX: galley, toilet, ..."
                              disabled={useExistingType}
                            />
                            <Form.Control.Feedback type="invalid">
                              {errors[`space-${index}-label`]}
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>

                        <Col md={3}>
                          <Form.Group controlId={`space-${index}-fromRow`}>
                            <Form.Label>
                              From row <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                              type="number"
                              min="1"
                              value={space.fromRow}
                              onChange={(e) => handleSpaceChange(index, "fromRow", Number.parseInt(e.target.value))}
                              isInvalid={!!errors[`space-${index}-rows`]}
                              disabled={useExistingType}
                            />
                          </Form.Group>
                        </Col>

                        <Col md={3}>
                          <Form.Group controlId={`space-${index}-toRow`}>
                            <Form.Label>
                              To row <span className="text-danger">*</span>
                            </Form.Label>
                            <Form.Control
                              type="number"
                              min={space.fromRow}
                              value={space.toRow}
                              onChange={(e) => handleSpaceChange(index, "toRow", Number.parseInt(e.target.value))}
                              isInvalid={!!errors[`space-${index}-rows`]}
                              disabled={useExistingType}
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
                  <Button variant="outline-secondary" onClick={() => setActiveTab("basic")}>
                    Back basic information
                  </Button>
                  <div>
                    <Button variant="outline-info" className="me-2" onClick={handleViewMap}>
                      View map
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

      {showPreview && (
        <AircraftDetail show={showPreview} onHide={() => setShowPreview(false)} selectedAircraft={generatePayload()} />
      )}
    </Container>
  )
}

export default AircraftCreate