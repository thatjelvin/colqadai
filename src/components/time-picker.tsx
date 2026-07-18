import { useState } from "react";
import { Input } from "@/components/ui/input";

interface TimePickerProps {
  value: string; // HH:MM format
  onChange: (time: string) => void;
}

export function TimePicker({ value, onChange }: TimePickerProps) {
  const [time, setTime] = useState(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Validate time format HH:MM
    if (/^\d{2}:\d{2}$/.test(val)) {
      setTime(val);
      onChange(val);
    }
    // Allow partial input for usability
    else if (val.length === 2 && /^\d{2}$/.test(val)) {
      setTime(val);
    } else if (val.length > 2 && val.length <= 5 && /^\d{2}:\d{0,2}$/.test(val)) {
      setTime(val);
    }
  };

  return (
    <div className="relative w-[100px]">
      <Input
        type="text"
        placeholder="HH:MM"
        value={time}
        onChange={handleChange}
        className="text-center"
        inputMode="numeric"
      />
    </div>
  );
}