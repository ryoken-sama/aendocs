import { useEffect, useRef, useState } from "react";

interface ComboboxProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

/** A compact type-to-filter combobox: typing narrows the option list, and
 * picking an option (click or Enter) applies that as the active filter. The
 * label doubles as the placeholder to keep this a single-line control. */
export function Combobox({ label, options, value, onChange }: ComboboxProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Set right before selectOption calls .blur() on itself, so handleBlur
  // (triggered synchronously by that .blur() call) knows not to stomp on the
  // selection with a revert-to-previous-value — that revert would otherwise
  // race against selectOption's own state updates using a stale `value`.
  const justSelectedRef = useRef(false);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(inputValue.toLowerCase()),
  );

  function selectOption(option: string) {
    onChange(option);
    setInputValue(option);
    setIsOpen(false);
    // The dropdown's onMouseDown prevents the default focus-shift (so the
    // click reaches onClick instead of blurring the input first), so the
    // input is otherwise left focused/"active"-looking — blur it explicitly
    // rather than making the user click elsewhere to deactivate it.
    justSelectedRef.current = true;
    inputRef.current?.blur();
  }

  function handleFocus() {
    // Clear the text so every option is shown immediately, not just ones
    // matching the currently selected value — lets staff switch straight
    // from one filter value to another without hitting the × button first.
    setInputValue("");
    setIsOpen(true);
  }

  function handleBlur() {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    // Nothing was selected — restore the previously committed value.
    // Option clicks use onMouseDown+preventDefault below so a selection
    // always registers before this fires.
    setIsOpen(false);
    setInputValue(value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        selectOption(filteredOptions[0]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setInputValue(value);
    }
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
    setInputValue("");
    setIsOpen(false);
  }

  return (
    <div className="relative min-w-0 flex-1">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          aria-label={label}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={label}
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 pr-7 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
        {value && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClear}
            aria-label={`Clear ${label} filter`}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ×
          </button>
        )}
      </div>
      {isOpen && filteredOptions.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-slate-200 bg-white text-sm shadow-lg dark:border-slate-700 dark:bg-slate-800">
          {filteredOptions.map((option) => (
            <li
              key={option}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectOption(option)}
              className="cursor-pointer px-2 py-1.5 hover:bg-blue-50 dark:hover:bg-slate-700"
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
