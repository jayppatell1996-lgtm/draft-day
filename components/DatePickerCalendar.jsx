import React, { useRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';


export default function DatePickerCalendar({ selected, onChange, enabledDates }) {
  // enabledDates: array of ISO date strings
  const enabledSet = new Set(enabledDates.map(d => new Date(d).toDateString()));
  const inputRef = useRef(null);
  return (
    <div className="relative flex items-center">
      <DatePicker
        ref={inputRef}
        selected={selected ? new Date(selected) : null}
        onChange={date => onChange(date ? date.toISOString().slice(0, 10) : null)}
        includeDates={enabledDates.map(d => new Date(d))}
        dateFormat="yyyy-MM-dd"
        placeholderText="Select a date"
        className="bg-navy-400 text-white py-2 px-3 rounded-lg w-full pr-10"
        calendarClassName="bg-navy-200 text-white"
        popperClassName="z-50"
        showPopperArrow={false}
        isClearable={false}
      />
      <svg 
        className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white pointer-events-none" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  );
}
