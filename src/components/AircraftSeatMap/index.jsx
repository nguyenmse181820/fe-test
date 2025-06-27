import { Badge, OverlayTrigger, Tooltip } from "react-bootstrap"

function AircraftSeatMap({ seatMap }) {
   function getSeatsByRow(section) {
    const seatsByRow = {}

    section.seats.forEach((seat) => {
      // Extract row number from seat code (now in "1A" format)
      const rowMatch = seat.seatCode.match(/^(\d+)/);
      const row = rowMatch ? parseInt(rowMatch[1]) : 1;
      if (!seatsByRow[row]) {
        seatsByRow[row] = []
      }
      seatsByRow[row].push(seat)
    })

    return seatsByRow
  }

  function getPatternArray(pattern) {
    return pattern.split("-").map((num) => Number.parseInt(num))
  }

  function getSectionInfo(key) {
    switch (key.toLowerCase()) {
      case "first":
        return {
          name: "First",
          color: "#8B5CF6",
          bgColor: "#F3E8FF",
          icon: "👑",
        }
      case "business":
        return {
          name: "Business",
          color: "#3B82F6",
          bgColor: "#DBEAFE",
          icon: "💼",
        }
      case "economy":
        return {
          name: "Economy",
          color: "#10B981",
          bgColor: "#D1FAE5",
          icon: "🎫",
        }
      default:
        return {
          name: key,
          color: "#6B7280",
          bgColor: "#F3F4F6",
          icon: "✈️",
        }
    }
  }

  function renderSeat(seat) {
    return (
      <OverlayTrigger key={seat.seatCode} placement="top" overlay={<Tooltip>Seats {seat.seatCode}</Tooltip>}>
        <div
          className="seat"
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: "bold",
            cursor: "pointer",
            border: "2px solid #dee2e6",
            backgroundColor: "#ffffff",
            color: "#495057",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#e3f2fd"
            e.currentTarget.style.borderColor = "#2196f3"
            e.currentTarget.style.transform = "scale(1.1)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#ffffff"
            e.currentTarget.style.borderColor = "#dee2e6"
            e.currentTarget.style.transform = "scale(1)"
          }}
        >
          {seat.seatCode.replace(/\d+/, '')}
        </div>
      </OverlayTrigger>
    )
  }

  function renderSeatsWithPattern(seats, pattern) {
    let seatIndex = 0
    const elements = []

    pattern.forEach((groupSize, groupIndex) => {
      const group = []
      for (let i = 0; i < groupSize && seatIndex < seats.length; i++) {
        const seat = seats[seatIndex]
        group.push(renderSeat(seat))
        seatIndex++
      }

      elements.push(
        <div key={`group-${groupIndex}`} style={{ display: "flex", gap: "4px" }}>
          {group}
        </div>,
      )

      if (groupIndex < pattern.length - 1) {
        elements.push(
          <div
            key={`aisle-${groupIndex}`}
            style={{
              width: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "2px",
                height: "24px",
                backgroundColor: "#dee2e6",
                borderRadius: "1px",
              }}
            ></div>
          </div>,
        )
      }
    })

    return elements
  }

  function renderSeatSection(sectionKey, section) {
    const seatsByRow = getSeatsByRow(section)
    const patternArray = getPatternArray(section.pattern)
    const rows = Object.keys(seatsByRow)
      .map(Number)
      .sort((a, b) => a - b)

    const sectionInfo = getSectionInfo(sectionKey)

    return (
      <div key={sectionKey} style={{ marginBottom: "20px" }}>
        <div
          style={{
            backgroundColor: sectionInfo.bgColor,
            border: `2px solid ${sectionInfo.color}`,
            borderRadius: "15px",
            padding: "15px",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "1.2em" }}>{sectionInfo.icon}</span>
              <strong style={{ color: sectionInfo.color }}>{sectionInfo.name}</strong>
              <Badge bg="light" text="dark">
                {section.seats.length} seats
              </Badge>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <Badge bg="light" text="dark">
                Row {section.fromRow}-{section.toRow}
              </Badge>
              <Badge style={{ backgroundColor: sectionInfo.color }}>{section.pattern}</Badge>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {rows.map((rowNumber) => {
              const rowSeats = seatsByRow[rowNumber].sort((a, b) => a.seatCode.localeCompare(b.seatCode))

              return (
                <div
                  key={rowNumber}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      width: "30px",
                      textAlign: "center",
                      fontSize: "12px",
                      fontWeight: "bold",
                      color: sectionInfo.color,
                    }}
                  >
                    {rowNumber}
                  </div>
                  <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                    {renderSeatsWithPattern(rowSeats, patternArray)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  function renderSpaceSection(sectionKey, section) {
    const getSpaceIcon = (label) => {
      switch (label.toLowerCase()) {
        case "galley":
          return "🍽️"
        case "toilet":
          return "🚻"
        case "lavatory":
          return "🚿"
        default:
          return "📦"
      }
    }

    const getSpaceLabel = (label) => {
      switch (label.toLowerCase()) {
        case "galley":
          return "Galley"
        case "toilet":
          return "Toilet"
        case "lavatory":
          return "Lavatory"
        default:
          return label
      }
    }

    return (
      <div key={sectionKey} style={{ marginBottom: "15px" }}>
        <div
          style={{
            backgroundColor: "#f8f9fa",
            border: "2px dashed #6c757d",
            borderRadius: "10px",
            padding: "15px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "1.5em", marginBottom: "5px" }}>{getSpaceIcon(section.label)}</div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: "bold",
              color: "#6c757d",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            {getSpaceLabel(section.label)}
          </div>
          <div style={{ fontSize: "12px", color: "#6c757d", marginTop: "5px" }}>Row {section.fromRow}</div>
        </div>
      </div>
    )
  }

  const sortedSections = Object.entries(seatMap.layout).sort(([, a], [, b]) => {
    return a.fromRow - b.fromRow
  })

  return (
    <div>
        <h5 className="mb-3">🗺️ Seat Map</h5>
        <div>
            <div
                style={{
                background: "#f8f9fa",
                border: "1px solid #dee2e6",
                borderRadius: "10px",
                padding: "15px",
                marginBottom: "20px",
                }}
            >
                <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "20px",
                    flexWrap: "wrap",
                }}
                >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div
                    style={{
                        width: "20px",
                        height: "20px",
                        backgroundColor: "#ffffff",
                        border: "2px solid #dee2e6",
                        borderRadius: "4px",
                    }}
                    ></div>
                    <span style={{ fontSize: "14px" }}>Seat</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div
                    style={{
                        width: "2px",
                        height: "20px",
                        backgroundColor: "#dee2e6",
                        borderRadius: "1px",
                    }}
                    ></div>
                    <span style={{ fontSize: "14px" }}>Way</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "16px" }}>🍽️</span>
                    <span style={{ fontSize: "14px" }}>Service</span>
                </div>
                </div>
            </div>

            <div className="airplane-container">
                <div className="airplane-body">
                <div className="airplane-nose"></div>

                <div className="airplane-wing-left"></div>
                <div className="airplane-wing-right"></div>

                <div className="airplane-tail"></div>

                <div
                    style={{
                    textAlign: "center",
                    marginBottom: "20px",
                    fontSize: "24px",
                    }}
                >
                    🧑‍✈️ Cockpit
                </div>

                <div>
                    {sortedSections.map(([sectionKey, section]) => {
                    if (section.type === "space") {
                        return renderSpaceSection(sectionKey, section)
                    } else {
                        return renderSeatSection(sectionKey, section)
                    }
                    })}
                </div>

                <div
                    style={{
                    textAlign: "center",
                    marginTop: "20px",
                    fontSize: "16px",
                    color: "#6c757d",
                    }}
                >
                    🔚 Tail Plane
                </div>
                </div>
            </div>
        </div>
    </div> 
  )
}

export default AircraftSeatMap