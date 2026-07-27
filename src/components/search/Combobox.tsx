import { useEffect, useRef, useState } from "react";

export interface ComboOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  label: string;
  options: ComboOption[];
  value: string;
  onChange: (value: string) => void;
}

/** A compact type-to-filter combobox: typing narrows the option list by
 * label, and picking an option (click or Enter) commits its `value` as the
 * active filter — the displayed text and the value sent to the caller can
 * differ (e.g. showing "Access Pokhara" while filtering by its numeric ID).
 * The label doubles as the placeholder to keep this a single-line control. */
export function Combobox({ label, options, value, onChange }: ComboboxProps) {
  const selectedOption = options.find((o) => o.value === value);
  const [inputValue, setInputValue] = useState(selectedOption?.label ?? "");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Set right before selectOption calls .blur() on itself, so handleBlur
  // (triggered synchronously by that .blur() call) knows not to stomp on the
  // selection with a revert-to-previous-value — that revert would otherwise
  // race against selectOption's own state updates using a stale `value`.
  const justSelectedRef = useRef(false);

  useEffect(() => {
    setInputValue(selectedOption?.label ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(inputValue.toLowerCase()),
  );

  function selectOption(option: ComboOption) {
    onChange(option.value);
    setInputValue(option.label);
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
    setInputValue(selectedOption?.label ?? "");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredOptions.length > 0) {
        selectOption(filteredOptions[0]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setInputValue(selectedOption?.label ?? "");
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
          className={`w-full rounded-lg border bg-surface px-2 py-1.5 pr-7 text-sm text-ink placeholder:text-muted focus:outline-none ${
            value ? "border-primary" : "border-border"
          }`}
        />
        {value && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClear}
            aria-label={`Clear ${label} filter`}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
          >
            ×
          </button>
        )}
      </div>
      {isOpen && filteredOptions.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-surface text-sm">
          {filteredOptions.map((option) => (
            <li
              key={option.value}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectOption(option)}
              className="cursor-pointer px-2 py-1.5 text-ink hover:bg-primary/10"
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
