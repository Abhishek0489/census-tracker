import { useCallback, useEffect, useRef, useState } from 'react';
import { formatPlaceDistance, searchPlaces } from '../lib/geocode';

export function PlaceAutocomplete({
  value,
  onChange,
  userLocation,
  onPlaceSelect,
  placeholder = 'Area name or place',
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  const fetchSuggestions = useCallback(
    async (query) => {
      const trimmed = query.trim();
      if (trimmed.length < 2) {
        setSuggestions([]);
        setStatusMsg(trimmed.length === 0 ? '' : 'Type at least 2 characters');
        setOpen(trimmed.length > 0);
        setLoading(false);
        return;
      }

      const reqId = ++requestIdRef.current;
      setLoading(true);
      setStatusMsg('');

      try {
        const [lat, lng] = userLocation ?? [];
        const results = await searchPlaces(trimmed, {
          lat,
          lng,
          limit: 8,
        });

        if (reqId !== requestIdRef.current) return;

        setSuggestions(results);
        setOpen(true);
        setHighlightIndex(results.length > 0 ? 0 : -1);
        setStatusMsg(results.length === 0 ? 'No places found' : '');
      } catch {
        if (reqId !== requestIdRef.current) return;
        setSuggestions([]);
        setStatusMsg('Search failed — check connection');
        setOpen(true);
      } finally {
        if (reqId === requestIdRef.current) setLoading(false);
      }
    },
    [userLocation],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, fetchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectPlace = (place) => {
    onChange(place.shortName);
    onPlaceSelect(place);
    setSuggestions([]);
    setOpen(false);
    setStatusMsg('');
    setHighlightIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!open || suggestions.length === 0) {
      if (e.key === 'Escape') setOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      selectPlace(suggestions[highlightIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && (suggestions.length > 0 || statusMsg || loading);

  return (
    <div className="place-autocomplete" ref={wrapperRef}>
      <input
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
        aria-controls="place-suggestions"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          if (value.trim().length >= 2) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {loading && <p className="autocomplete-status">Searching...</p>}
      {!loading && statusMsg && open && (
        <p className="autocomplete-status">{statusMsg}</p>
      )}
      {showList && suggestions.length > 0 && (
        <ul id="place-suggestions" className="suggestions-list" role="listbox">
          {suggestions.map((place, index) => (
            <li key={place.id} role="option" aria-selected={index === highlightIndex}>
              <button
                type="button"
                className={`suggestion-item ${index === highlightIndex ? 'active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectPlace(place)}
              >
                <span className="suggestion-title">{place.shortName}</span>
                <span className="suggestion-address">{place.displayName}</span>
                {place.distanceM != null && (
                  <span className="suggestion-distance">
                    {formatPlaceDistance(place.distanceM)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
