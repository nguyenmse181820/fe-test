import * as React from "react"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"

export function TimePicker({ 
  time, 
  onTimeChange, 
  className,
  placeholder = "Select time",
  disabled = false,
  required = false
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [hours, setHours] = React.useState(time ? String(time.getHours()).padStart(2, '0') : '09')
  const [minutes, setMinutes] = React.useState(time ? String(time.getMinutes()).padStart(2, '0') : '00')

  // Update internal state when time prop changes
  React.useEffect(() => {
    if (time) {
      setHours(String(time.getHours()).padStart(2, '0'))
      setMinutes(String(time.getMinutes()).padStart(2, '0'))
    }
  }, [time])

  const handleTimeChange = () => {
    const newDate = time ? new Date(time) : new Date()
    newDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0)
    onTimeChange(newDate)
    setIsOpen(false)
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

  const formatDisplayTime = () => {
    if (!time) return placeholder
    return time.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !time && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <Clock className="mr-2 h-4 w-4" />
          {formatDisplayTime()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-4">
          <div className="text-sm font-medium">Select Time</div>
          <div className="flex items-center space-x-2">
            <div className="space-y-2">
              <Label htmlFor="hours" className="text-xs">Hours</Label>
              <Input
                id="hours"
                type="number"
                min="0"
                max="23"
                value={hours}
                onChange={handleHoursChange}
                onBlur={(e) => {
                  const value = parseInt(e.target.value)
                  if (isNaN(value) || value < 0) {
                    setHours('00')
                  } else if (value > 23) {
                    setHours('23')
                  } else {
                    setHours(String(value).padStart(2, '0'))
                  }
                }}
                className="w-16 text-center"
                placeholder="HH"
              />
            </div>
            <div className="pt-6 text-xl font-bold">:</div>
            <div className="space-y-2">
              <Label htmlFor="minutes" className="text-xs">Minutes</Label>
              <Input
                id="minutes"
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={handleMinutesChange}
                onBlur={(e) => {
                  const value = parseInt(e.target.value)
                  if (isNaN(value) || value < 0) {
                    setMinutes('00')
                  } else if (value > 59) {
                    setMinutes('59')
                  } else {
                    setMinutes(String(value).padStart(2, '0'))
                  }
                }}
                className="w-16 text-center"
                placeholder="MM"
              />
            </div>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleTimeChange}
              className="flex-1"
            >
              Set Time
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
