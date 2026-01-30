'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Edit3, Check, AlertCircle } from 'lucide-react';

interface GooglePlacesAutocompleteProps {
  value: string;
  postcode: string;
  onSuburbChange: (suburb: string) => void;
  onPostcodeChange: (postcode: string) => void;
  required?: boolean;
  className?: string;
}

export function GooglePlacesAutocomplete({
  value,
  postcode,
  onSuburbChange,
  onPostcodeChange,
  required = false,
  className = '',
}: GooglePlacesAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isPostcodeEditable, setIsPostcodeEditable] = useState(false);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [googleError, setGoogleError] = useState(false);
  const [hasSelectedPlace, setHasSelectedPlace] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const extractSuburb = (addressComponents: google.maps.GeocoderAddressComponent[]): string => {
    const suburbTypes = ['locality', 'postal_town', 'sublocality', 'administrative_area_level_2'];

    for (const type of suburbTypes) {
      const component = addressComponents.find(c => c.types.includes(type));
      if (component) {
        return component.long_name;
      }
    }

    return '';
  };

  const extractPostcode = (addressComponents: google.maps.GeocoderAddressComponent[]): string => {
    const postcodeComponent = addressComponents.find(c => c.types.includes('postal_code'));
    return postcodeComponent?.long_name || '';
  };

  const handlePlaceSelect = useCallback(() => {
    if (!autocompleteRef.current) return;

    const place = autocompleteRef.current.getPlace();

    if (!place.address_components) return;

    const suburb = extractSuburb(place.address_components);
    const extractedPostcode = extractPostcode(place.address_components);

    if (suburb) {
      setInputValue(suburb);
      onSuburbChange(suburb);
      setHasSelectedPlace(true);
    }

    if (extractedPostcode) {
      onPostcodeChange(extractedPostcode);
      setIsPostcodeEditable(false);
    }
  }, [onSuburbChange, onPostcodeChange]);

  const initializeAutocomplete = useCallback(() => {
    if (!inputRef.current || !window.google?.maps?.places) return;

    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'au' },
      types: ['(regions)'],
      fields: ['address_components', 'name'],
    });

    autocompleteRef.current.addListener('place_changed', handlePlaceSelect);
  }, [handlePlaceSelect]);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    console.log("GOOGLE KEY present:", Boolean(apiKey));

    if (!apiKey) {
      setGoogleError(true);
      return;
    }

    if (window.google?.maps?.places) {
      setIsGoogleLoaded(true);
      initializeAutocomplete();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initMap`;
    script.async = true;
    script.defer = true;

    window.initMap = () => {
      setIsGoogleLoaded(true);
    };

    script.onerror = () => {
      setGoogleError(true);
    };

    document.head.appendChild(script);

    return () => {
      delete window.initMap;
    };
  }, [initializeAutocomplete]);

  useEffect(() => {
    if (isGoogleLoaded && inputRef.current && !autocompleteRef.current) {
      initializeAutocomplete();
    }
  }, [isGoogleLoaded, initializeAutocomplete]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onSuburbChange(newValue);
    setHasSelectedPlace(false);
  };

  if (googleError) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-800">
              Google Places unavailable
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Using manual entry mode
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor="suburb-fallback">
            Location (Suburb) {required && <span className="text-red-500">*</span>}
          </Label>
          <Input
            id="suburb-fallback"
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Enter suburb name..."
            required={required}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="postcode-fallback">
            Postcode {required && <span className="text-red-500">*</span>}
          </Label>
          <Input
            id="postcode-fallback"
            type="text"
            value={postcode}
            onChange={(e) => onPostcodeChange(e.target.value)}
            placeholder="e.g. 3121"
            required={required}
            className="mt-1"
          />
        </div>
      </div>
    );
  }

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
            placeholder="Start typing suburb name..."
            required={required}
            className="pr-10"
            autoComplete="off"
          />
          <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        {!isGoogleLoaded && (
          <p className="text-xs text-gray-500 mt-1">
            Loading location services...
          </p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label htmlFor="postcode">
            Postcode {required && <span className="text-red-500">*</span>}
          </Label>
          {hasSelectedPlace && !isPostcodeEditable && (
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
          readOnly={hasSelectedPlace && !isPostcodeEditable}
          className={
            hasSelectedPlace && !isPostcodeEditable
              ? 'bg-gray-50 cursor-default'
              : ''
          }
        />
        {hasSelectedPlace && !isPostcodeEditable && (
          <p className="text-xs text-gray-500 mt-1">
            Auto-filled from selected suburb
          </p>
        )}
      </div>
    </div>
  );
}

declare global {
  interface Window {
    google?: typeof google;
    initMap?: () => void;
  }
}
