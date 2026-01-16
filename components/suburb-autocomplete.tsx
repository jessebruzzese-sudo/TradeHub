'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MapPin, Edit3, Check } from 'lucide-react';
import suburbsData from '@/lib/australian-suburbs.json';

interface Suburb {
  suburb: string;
  state: string;
  postcode: string;
}

interface SuburbAutocompleteProps {
  value: string;
  postcode: string;
  onSuburbChange: (suburb: string) => void;
  onPostcodeChange: (postcode: string) => void;
  required?: boolean;
  className?: string;
}

export function SuburbAutocomplete({
  value,
  postcode,
  onSuburbChange,
  onPostcodeChange,
  required = false,
  className = '',
}: SuburbAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isPostcodeEditable, setIsPostcodeEditable] = useState(false);
  const [selectedSuburb, setSelectedSuburb] = useState<Suburb | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [debouncedValue, setDebouncedValue] = useState(inputValue);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(inputValue);
    }, 150);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const filteredSuburbs = useMemo(() => {
    if (!debouncedValue || debouncedValue.length < 2) return [];
    const lowerSearch = debouncedValue.toLowerCase();
    return suburbsData
      .filter(
        (s) =>
          s.suburb.toLowerCase().includes(lowerSearch) ||
          s.postcode.includes(debouncedValue)
      )
      .slice(0, 50);
  }, [debouncedValue]);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onSuburbChange(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);
    setSelectedSuburb(null);
    setIsPostcodeEditable(false);
  };

  const selectSuburb = (suburb: Suburb) => {
    setInputValue(suburb.suburb);
    onSuburbChange(suburb.suburb);
    onPostcodeChange(suburb.postcode);
    setSelectedSuburb(suburb);
    setIsOpen(false);
    setHighlightedIndex(-1);
    setIsPostcodeEditable(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredSuburbs.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredSuburbs[highlightedIndex]) {
          selectSuburb(filteredSuburbs[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownRef.current) {
      const highlightedElement = dropdownRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [highlightedIndex]);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="relative">
        <Label htmlFor="suburb">
          Location (Suburb) {required && <span className="text-red-500">*</span>}
        </Label>
        <div className="relative mt-1">
          <Input
            ref={inputRef}
            id="suburb"
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => inputValue.length >= 2 && setIsOpen(true)}
            placeholder="Start typing suburb name..."
            required={required}
            className="pr-10"
            autoComplete="off"
          />
          <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {isOpen && filteredSuburbs.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-auto"
          >
            {filteredSuburbs.map((suburb, index) => (
              <button
                key={`${suburb.suburb}-${suburb.postcode}`}
                type="button"
                onClick={() => selectSuburb(suburb)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                  highlightedIndex === index ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {suburb.suburb}
                    </div>
                    <div className="text-xs text-gray-500">{suburb.state}</div>
                  </div>
                  <div className="text-sm font-medium text-gray-600 flex-shrink-0">
                    {suburb.postcode}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {isOpen && debouncedValue.length >= 2 && filteredSuburbs.length === 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4"
          >
            <p className="text-sm text-gray-600 text-center">
              No suburbs found. You can continue with manual entry.
            </p>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label htmlFor="postcode">
            Postcode {required && <span className="text-red-500">*</span>}
          </Label>
          {selectedSuburb && !isPostcodeEditable && (
            <button
              type="button"
              onClick={() => setIsPostcodeEditable(true)}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" />
              Edit
            </button>
          )}
          {isPostcodeEditable && (
            <button
              type="button"
              onClick={() => setIsPostcodeEditable(false)}
              className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              Done
            </button>
          )}
        </div>
        <Input
          id="postcode"
          type="text"
          value={postcode}
          onChange={(e) => onPostcodeChange(e.target.value)}
          placeholder="e.g. 3121"
          required={required}
          readOnly={selectedSuburb !== null && !isPostcodeEditable}
          className={
            selectedSuburb && !isPostcodeEditable
              ? 'bg-gray-50 cursor-default'
              : ''
          }
        />
        {selectedSuburb && !isPostcodeEditable && (
          <p className="text-xs text-gray-500 mt-1">
            Auto-filled from selected suburb
          </p>
        )}
      </div>
    </div>
  );
}
