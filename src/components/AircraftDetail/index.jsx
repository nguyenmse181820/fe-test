import { Modal, Row, Col, Card } from "react-bootstrap"

import AircraftSeatMap from "../AircraftSeatMap"

function AircraftDetail({ show, onHide, selectedAircraft }) {

    console.log('thay aircraft ne', selectedAircraft)
  
    const getManufacturerIcon = (manufacturer) => {
        switch (manufacturer?.toLowerCase()) {
        case "boeing":
            return "🇺🇸"
        case "airbus":
            return "🇪🇺"
        default:
            return "✈️"
        }
    }

    const getSeatClasses = (seatMap) => {
        const classes = []
        Object.entries(seatMap.layout).forEach(([key, section]) => {
        if (section.seats) {
            classes.push(key)
        }
        })
        return classes
    }

    return (
      <Modal show={show} onHide={onHide} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <span className="plane-icon me-2">✈️</span>
            {selectedAircraft?.code} {selectedAircraft?.code ? '-' : ""} {selectedAircraft?.code ? getManufacturerIcon(selectedAircraft?.aircraftType.manufacturer) : ""}{" "}
            {selectedAircraft?.aircraftType.manufacturer} - {selectedAircraft?.aircraftType.model}
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {selectedAircraft && (
            <>
              <Row className="mb-4">
                <Col md={6}>
                  <Card className="stats-card border-primary">
                    <div className="stats-number text-primary">{selectedAircraft.aircraftType.totalSeats}</div>
                    <div className="stats-label">Total Seats</div>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="stats-card border-info">
                    <div className="stats-number text-info">
                      {getSeatClasses(selectedAircraft.aircraftType.seatMap).length}
                    </div>
                    <div className="stats-label">Total Classes</div>
                  </Card>
                </Col>
              </Row>

              <Row className="mb-4">
                <Col>
                  <Card className="bg-light">
                    <Card.Body>
                      <Row>
                        <Col md={6}>
                          <h6 className="mb-2">
                            {selectedAircraft?.code ? <><strong>Aircraft Detail</strong></> : <><strong>Aircraft Type Detail</strong></>}
                            
                          </h6>
                          <p className="mb-1">
                            {selectedAircraft?.code ? <><strong>Code:</strong> {selectedAircraft?.code}</> : <></>}
                          </p>
                          <p className="mb-1">
                            <strong>Manufacturer:</strong>{" "}
                            {getManufacturerIcon(selectedAircraft.aircraftType.manufacturer)}{" "}
                            {selectedAircraft.aircraftType.manufacturer}
                          </p>
                          <p className="mb-0">
                            <strong>Model:</strong> {selectedAircraft.aircraftType.model}
                          </p>
                        </Col>
                        <Col md={6}>
                          <h6 className="mb-2">
                            <strong>Seats Detail</strong>
                          </h6>
                          {Object.entries(selectedAircraft.aircraftType.seatMap.layout).map(([key, section]) => {
                            if (section.seats) {
                              return (
                                <p key={key} className="mb-1">
                                  <strong>
                                    {key === "first"
                                      ? "First"
                                      : key === "business"
                                        ? "Business"
                                        : key === "economy"
                                          ? "Economy"
                                          : key}
                                    :
                                  </strong>{" "}
                                  {section.seats.length} seats ({section.pattern})
                                </p>
                              )
                            }
                            return null
                          })}
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <AircraftSeatMap seatMap={selectedAircraft.aircraftType.seatMap} />
            </>
          )}
        </Modal.Body>
      </Modal>
  )
}

export default AircraftDetail