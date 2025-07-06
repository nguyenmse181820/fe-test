import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { format } from "date-fns"

export function CompactDateTimePicker({ 
  date, 
  onSelect, 
  className,
  placeholder = "Pick a date and time",
  disabled = false,
  required = false
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState(date)
  const [timeValue, setTimeValue] = React.useState(() => {
    if (date) {
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${hours}:${minutes}`
    }
    return '09:00'
  })

  // Update internal state when date prop changes
  React.useEffect(() => {
    if (date) {
      setSelectedDate(date)
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      setTimeValue(`${hours}:${minutes}`)
    }
  }, [date])

  const handleDateSelect = (newDate) => {
    if (newDate) {
      const [hours, minutes] = timeValue.split(':')
      newDate.setHours(parseInt(hours, 10) || 0, parseInt(minutes, 10) || 0, 0, 0)
      setSelectedDate(newDate)
    }
  }

  const handleTimeChange = (e) => {
    setTimeValue(e.target.value)
  }

  const handleApplyDateTime = () => {
    if (selectedDate && timeValue) {
      const [hours, minutes] = timeValue.split(':')
      const newDateTime = new Date(selectedDate)
      newDateTime.setHours(parseInt(hours, 10) || 0, parseInt(minutes, 10) || 0, 0, 0)
      onSelect(newDateTime)
      setIsOpen(false)
    }
  }

  const formatDisplayDateTime = () => {
    if (!date) return placeholder
    try {
      return format(date, "MMM dd, yyyy") + " at " + date.toLocaleTimeString('en-US', { 
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
        className="w-auto p-0" 
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <div className="p-3 space-y-3">
          {/* Compact Calendar */}
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
            required={required}
            className="rounded-md border-0 p-1 [--cell-size:1.5rem]"
            disabled={(date) => {
              // Disable dates before today
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              return date < today
            }}
          />
          
          {/* Compact Time Input */}
          <div className="border-t pt-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground">Time:</label>
                <Input
                  type="time"
                  value={timeValue}
                  onChange={handleTimeChange}
                  className="w-20 h-7 text-sm"
                />
              </div>
              
              {/* Quick time buttons */}
              <div className="flex gap-1">
                {[
                  { label: '9AM', time: '09:00' },
                  { label: '12PM', time: '12:00' },
                  { label: '6PM', time: '18:00' },
                ].map((timeOption) => (
                  <Button
                    key={timeOption.label}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setTimeValue(timeOption.time)}
                    className="text-xs h-6 px-2"
                  >
                    {timeOption.label}
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Action buttons */}
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
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
