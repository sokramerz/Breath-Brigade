import { useState, useRef } from "react";
import styles from "./LocationSearch.module.css";

export default function LocationSearch({ onSelectLocation }) {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState([]);
  const [isOpen,  setIsOpen]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [riskData, setRiskData] = useState(null);
  const debounceRef           = useRef(null);

  //suggest popular locations
  const popularLocations = [
    { name: "Detroit, MI", lat: 42.3314, lon: -83.0458 },
    { name: "New York, NY", lat: 40.7128, lon: -74.0060 },
    { name: "Los Angeles, CA", lat: 34.0522, lon: -118.2437},
    { name: "Chicago, IL", lat: 41.8781, lon: -87.6298 },
    { name: "Miami, FL", lat: 25.7617, lon: -80.1918},
    { name: "Dallas, Tx", lat: 32.7767, lon: -96.7970},
    { name: "Seattle, WA", lat: 47.6062, lon: -122.3321},
    { name: "New Delhi, India", lat: 28.6139, lon: 77.2090}
  ];

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

  async function handleSelect(result) {
    setQuery(result.name);
    setResults([]);
    setIsOpen(false);

    try{
      const res = await fetch("http://127.0.0.1:8000/risk",{
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lat:result.lat,
          lon:result.lon,
          user_id:1,
        }),
      });
      const data = await res.json();
      console.log("backend response", data);
      setRiskData(data);
    } catch (err) {
      console.error("error:", err);
    }
    onSelectLocation?.(result);
  }

  function handleClear() {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    
  }
  const formatRisk = (level) => {
    if(level == "low") return "Good";
    if(level == "moderate") return "Moderate";
    if(level == "elevated") return "High";
    if(level == "critical") return "Critical";
    return level;
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
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        />
        {query && (
          <button className={styles.clearBtn} onMouseDown={handleClear}>✕</button>
        )}
        {loading && <span className={styles.spinner} />}
      </div>
    
      {isOpen && !query && ( //suggest popular locations drop down
        <ul className = {styles.dropdown}>
          {popularLocations.map((loc) => (
            <li
            key = {loc.name}
            className= {styles.option}
            onMouseDown={() => handleSelect(loc)}
            >
              <span className={styles.optionIcon}>📍</span>
              <span className={styles.optionText}>{loc.name}</span>
            </li>
          ))}
        </ul>
      )}

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
      {riskData && (
        <div style= {{
          marginTop: "10px",
          padding: "10px" ,
          background: "#111",
          borderRadius: "8px"
        }}>
          <p style={{color: "white"}}>
            Risk Level: {formatRisk(riskData.risk_level)}
          </p>
          </div>
      )}
    </div>
  );
}