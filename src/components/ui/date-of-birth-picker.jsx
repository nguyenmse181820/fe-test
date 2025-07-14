import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function DateOfBirthPicker({ 
  date, 
  onSelect, 
  className,
  placeholder = "Select your date of birth",
  disabled = false,
  required = false,
  minYear = 1920,
  maxYear = new Date().getFullYear() - 13 // Default to 13+ years old
}) {
  const [isOpen, setIsOpen] = React.useState(false)
  
  // Calculate max date (13 years ago from today)
  const maxDate = new Date()
  maxDate.setFullYear(maxDate.getFullYear() - 13)
  
  // Calculate min date (100 years ago from today)
  const minDate = new Date()
  minDate.setFullYear(minDate.getFullYear() - 100)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => {
            onSelect(selectedDate)
            setIsOpen(false)
          }}
          disabled={(date) => {
            // Disable future dates beyond maxDate and dates before minDate
            return date > maxDate || date < minDate
          }}
          initialFocus
          captionLayout="dropdown"
          startYear={minYear}
          endYear={maxYear}
          required={required}
          defaultMonth={date || new Date(1990, 0)} // Default to January 1990 if no date selected
          className="rounded-md border"
        />
      </PopoverContent>
    </Popover>
  )
}