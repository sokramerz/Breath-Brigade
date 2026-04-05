import { useState, useRef } from "react";
import styles from "./LocationSearch.module.css";

export default function LocationSearch({ onSelectLocation }) {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState([]);
  const [isOpen,  setIsOpen]  = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef           = useRef(null);

  async function fetchSuggestions(value) {
    if (!value.trim()) { setResults([]); return; }

    setLoading(true);
    try {
      const token = import.meta.env.VITE_MAP_TOKEN;
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json` +
        `?access_token=${token}` +
        `&autocomplete=true` +
        `&limit=6` +
        `&types=place,region,country,district,locality,neighborhood,address`
      );
      const data = await res.json();

      setResults(
        (data.features ?? []).map((f) => ({
          name: f.place_name,
          lat:  f.center[1],
          lon:  f.center[0],
        }))
      );
    } catch (err) {
      console.error("Geocoding error:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(value), 300);
  }

  function handleSelect(result) {
    setQuery(result.name);
    setResults([]);
    setIsOpen(false);
    onSelectLocation?.(result);
  }

  function handleClear() {
    setQuery("");
    setResults([]);
    setIsOpen(false);
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.inputRow}>
        <span className={styles.searchIcon}>⌕</span>
        <input
          className={styles.input}
          type="text"
          placeholder="Search any city or address…"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        />
        {query && (
          <button className={styles.clearBtn} onMouseDown={handleClear}>✕</button>
        )}
        {loading && <span className={styles.spinner} />}
      </div>

      {isOpen && results.length > 0 && (
        <ul className={styles.dropdown}>
          {results.map((r) => (
            <li
              key={`${r.lat}-${r.lon}`}
              className={styles.option}
              onMouseDown={() => handleSelect(r)}
            >
              <span className={styles.optionIcon}>📍</span>
              <span className={styles.optionText}>{r.name}</span>
            </li>
          ))}
        </ul>
      )}

      {isOpen && !loading && query && results.length === 0 && (
        <div className={styles.empty}>No results found for "{query}"</div>
      )}
    </div>
  );
}