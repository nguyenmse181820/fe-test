import * as React from "react"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { format } from "date-fns"

export function DateTimePicker({ 
  date, 
  onSelect, 
  className,
  placeholder = "Pick a date and time",
  disabled = false,
  required = false
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState(date)
  const [hours, setHours] = React.useState(() => {
    if (date) return String(date.getHours()).padStart(2, '0')
    return '09'
  })
  const [minutes, setMinutes] = React.useState(() => {
    if (date) return String(date.getMinutes()).padStart(2, '0')
    return '00'
  })

  // Update internal state when date prop changes
  React.useEffect(() => {
    if (date) {
      setSelectedDate(date)
      setHours(String(date.getHours()).padStart(2, '0'))
      setMinutes(String(date.getMinutes()).padStart(2, '0'))
    }
  }, [date])

  const handleDateSelect = (newDate) => {
    if (newDate) {
      // Preserve the time when date changes
      const currentHours = parseInt(hours, 10) || 0
      const currentMinutes = parseInt(minutes, 10) || 0
      
      // Create new date with preserved time
      const dateWithTime = new Date(newDate)
      dateWithTime.setHours(currentHours, currentMinutes, 0, 0)
      setSelectedDate(dateWithTime)
    }
  }

  const handleApplyDateTime = () => {
    if (selectedDate) {
      const newDateTime = new Date(selectedDate)
      const hoursInt = parseInt(hours, 10) || 0
      const minutesInt = parseInt(minutes, 10) || 0
      
      newDateTime.setHours(hoursInt, minutesInt, 0, 0)
      onSelect(newDateTime)
      setIsOpen(false)
    }
  }

  const handleHoursChange = (e) => {
    const value = e.target.value
    if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 23)) {
      setHours(value)
    }
  }

  const handleMinutesChange = (e) => {
    const value = e.target.value
    if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 59)) {
      setMinutes(value)
    }
  }

  const handleHoursBlur = (e) => {
    const value = parseInt(e.target.value)
    if (isNaN(value) || value < 0) {
      setHours('00')
    } else if (value > 23) {
      setHours('23')
    } else {
      setHours(String(value).padStart(2, '0'))
    }
  }

  const handleMinutesBlur = (e) => {
    const value = parseInt(e.target.value)
    if (isNaN(value) || value < 0) {
      setMinutes('00')
    } else if (value > 59) {
      setMinutes('59')
    } else {
      setMinutes(String(value).padStart(2, '0'))
    }
  }

  const formatDisplayDateTime = () => {
    if (!date) return placeholder
    try {
      return format(date, "PPP") + " at " + date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'Invalid date selected'
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDisplayDateTime()}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 max-h-[85vh] overflow-auto" 
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <div className="p-3">
          {/* Calendar */}
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
            required={required}
            className="rounded-md border-0 p-1 [--cell-size:1.75rem]"
            disabled={(date) => {
              // Disable dates before today
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              return date < today
            }}
          />
          
          {/* Time Picker - Compact Layout */}
          <div className="border-t pt-3 mt-3">
            <div className="mb-2 text-xs font-medium text-muted-foreground">Time</div>
            <div className="flex items-center justify-between space-x-3">
              <div className="flex items-center space-x-1">
                <Input
                  id="hours"
                  type="number"
                  min="0"
                  max="23"
                  value={hours}
                  onChange={handleHoursChange}
                  onBlur={handleHoursBlur}
                  className="w-12 h-8 text-center text-sm p-1"
                  placeholder="HH"
                />
                <span className="text-sm font-bold">:</span>
                <Input
                  id="minutes"
                  type="number"
                  min="0"
                  max="59"
                  step="5"
                  value={minutes}
                  onChange={handleMinutesChange}
                  onBlur={handleMinutesBlur}
                  className="w-12 h-8 text-center text-sm p-1"
                  placeholder="MM"
                />
              </div>
              
              {/* Quick time buttons - smaller and fewer */}
              <div className="flex gap-1">
                {[
                  { label: '9AM', hours: '09', minutes: '00' },
                  { label: '12PM', hours: '12', minutes: '00' },
                  { label: '6PM', hours: '18', minutes: '00' },
                ].map((time) => (
                  <Button
                    key={time.label}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setHours(time.hours)
                      setMinutes(time.minutes)
                    }}
                    className="text-xs h-6 px-2"
                  >
                    {time.label}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="mt-3 flex space-x-2">
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                onClick={() => setIsOpen(false)}
                className="flex-1 h-7 text-xs"
              >
                Cancel
              </Button>
              <Button 
                type="button"
                size="sm" 
                onClick={handleApplyDateTime}
                className="flex-1 h-7 text-xs"
                disabled={!selectedDate}
              >
                Set Date & Time
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
