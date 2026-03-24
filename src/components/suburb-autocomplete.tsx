'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Edit3, Check, Loader2 } from 'lucide-react';

type Prediction = {
  description: string;
  place_id: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

interface SuburbAutocompleteProps {
  value: string;
  postcode: string;
  onSuburbChange: (suburb: string) => void;
  onPostcodeChange: (postcode: string) => void;

  // NEW (optional but recommended so jobs/search can store coords)
  onLatLngChange?: (lat: number | null, lng: number | null) => void;
  onPlaceIdChange?: (placeId: string | null) => void;

  required?: boolean;
  disabled?: boolean;
  className?: string;
  /** Override default "Location (Suburb)" label (e.g. "Location (optional)") */
  locationLabel?: string;
}

export function SuburbAutocomplete({
  value,
  postcode,
  onSuburbChange,
  onPostcodeChange,
  onLatLngChange,
  onPlaceIdChange,
  required = false,
  disabled = false,
  className = '',
  locationLabel = 'Location (Suburb)',
}: SuburbAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isPostcodeEditable, setIsPostcodeEditable] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [debouncedValue, setDebouncedValue] = useState(inputValue);
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(inputValue), 180);
    return () => clearTimeout(timer);
  }, [inputValue]);

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

  // Fetch predictions
  useEffect(() => {
    const q = debouncedValue.trim();
    if (q.length < 2) {
      setPredictions([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(q)}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok || data?.ok === false) {
          setPredictions([]);
          setError(data?.error || 'Autocomplete failed');
          return;
        }

        setPredictions(Array.isArray(data?.predictions) ? data.predictions : []);
      } catch (e: unknown) {
        if (cancelled) return;
        setPredictions([]);
        setError(e instanceof Error ? e.message : 'Autocomplete failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedValue]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const newValue = e.target.value;
    setInputValue(newValue);
    onSuburbChange(newValue);

    // reset selection when user types
    setSelectedPlaceId(null);
    onPlaceIdChange?.(null);
    onLatLngChange?.(null, null);

    setIsOpen(true);
    setHighlightedIndex(-1);
    setIsPostcodeEditable(false);
  };

  const selectPrediction = async (p: Prediction) => {
    if (disabled) return;
    const fullLabel = p.description;
    const mainLabel = p.structured_formatting?.main_text || p.description;

    // Show the short label in the input, but store the full description for better accuracy
    setInputValue(mainLabel);
    onSuburbChange(fullLabel);

    setSelectedPlaceId(p.place_id);
    onPlaceIdChange?.(p.place_id);

    setIsOpen(false);
    setHighlightedIndex(-1);

    // Ensure postcode stays locked unless user explicitly edits it
    setIsPostcodeEditable(false);

    // fetch details to get postcode + lat/lng
    try {
      const res = await fetch(`/api/places/details?place_id=${encodeURIComponent(p.place_id)}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        let postcode = data?.postcode ? String(data.postcode).trim() : '';
        if (!postcode && fullLabel) {
          const match = fullLabel.match(/\b(\d{4})\b/);
          if (match) postcode = match[1];
        }
        if (postcode) onPostcodeChange(postcode);
        onLatLngChange?.(typeof data?.lat === 'number' ? data.lat : null, typeof data?.lng === 'number' ? data.lng : null);
      }
    } catch {
      // silent – user can still manually enter postcode
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
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
        setHighlightedIndex((prev) => (prev < predictions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && predictions[highlightedIndex]) {
          selectPrediction(predictions[highlightedIndex]);
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
      const el = dropdownRef.current.children[highlightedIndex] as HTMLElement;
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [highlightedIndex]);

  useEffect(() => {
    // If the user leaves the field with manual text that doesn't match a selected place,
    // we should not keep any coords/place_id around.
    if (!selectedPlaceId) return;
    // If value diverged from the displayed input, clear selection defensively
    // (prevents stale coords if parent changes value unexpectedly)
    if (value !== inputValue) {
      setSelectedPlaceId(null);
      onPlaceIdChange?.(null);
      onLatLngChange?.(null, null);
    }
  }, [value, inputValue, selectedPlaceId, onLatLngChange, onPlaceIdChange]);

  const showNoResults = isOpen && debouncedValue.trim().length >= 2 && !loading && predictions.length === 0;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="relative">
        <Label htmlFor="suburb">
          {locationLabel} {required && <span className="text-red-500">*</span>}
        </Label>

        <div className="relative mt-1">
          <Input
            ref={inputRef}
            id="suburb"
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => !disabled && inputValue.length >= 2 && setIsOpen(true)}
            placeholder="Start typing suburb name..."
            required={required}
            disabled={disabled}
            className="pr-10"
            autoComplete="off"
          />
          {loading ? (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
          ) : (
            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          )}
        </div>

        {!disabled && isOpen && predictions.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-auto"
          >
            {predictions.map((p, index) => (
              <button
                key={p.place_id}
                type="button"
                onClick={() => selectPrediction(p)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                  highlightedIndex === index ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {p.structured_formatting?.main_text || p.description}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {p.structured_formatting?.secondary_text || p.description}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {!disabled && showNoResults && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
            <p className="text-sm text-gray-600 text-center">
              No locations found. You can continue with manual entry.
            </p>
            {error && <p className="mt-2 text-xs text-red-600 text-center">{error}</p>}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label htmlFor="postcode">
            Postcode {required && <span className="text-red-500">*</span>}
          </Label>

          {!disabled && selectedPlaceId && !isPostcodeEditable && (
            <button
              type="button"
              onClick={() => setIsPostcodeEditable(true)}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" />
              Edit
            </button>
          )}

          {!disabled && isPostcodeEditable && (
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
          placeholder="e.g. 3105"
          required={required}
          disabled={disabled}
          readOnly={disabled || (selectedPlaceId !== null && !isPostcodeEditable)}
          className={
            disabled
              ? 'bg-slate-100 text-slate-700'
              : selectedPlaceId && !isPostcodeEditable
                ? 'bg-gray-50 cursor-default'
                : ''
          }
        />

        {!disabled && selectedPlaceId && !isPostcodeEditable && (
          <p className="text-xs text-gray-500 mt-1">Auto-filled from Google Places</p>
        )}
      </div>
    </div>
  );
}
