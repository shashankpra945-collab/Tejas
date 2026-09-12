import React, { useState, useRef, useEffect } from 'react';
import {
  MapPin,
  Search,
  ChevronDown,
  AlertTriangle,
  Flame,
  Wind,
  Droplets,
  Thermometer,
  ShieldAlert,
  CheckCircle2,
  Sparkles,
  Compass,
  X,
  Building2,
  Navigation,
} from 'lucide-react';
import { GisEnvironment, PatientProfile } from '../types';
import {
  INDIAN_STATES_DATA,
  StateInfo,
  getCitiesForState,
  findStateByCity,
} from '../data/indianStatesCities';

interface StateCityLocationSelectorProps {
  gisContext: GisEnvironment;
  onGisChange: (gis: GisEnvironment) => void;
  patient?: PatientProfile;
  onPatientChange?: (patient: PatientProfile) => void;
}

export const StateCityLocationSelector: React.FC<StateCityLocationSelectorProps> = ({
  gisContext,
  onGisChange,
  patient,
  onPatientChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStateName, setSelectedStateName] = useState<string>(
    gisContext.state || 'Gujarat'
  );
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Keep selected state in sync with current gisContext
  useEffect(() => {
    if (gisContext.state && gisContext.state !== selectedStateName) {
      setSelectedStateName(gisContext.state);
    }
  }, [gisContext.state]);

  // Click outside to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter states based on zone and search query
  const filteredStates = INDIAN_STATES_DATA.filter((st) => {
    const matchesZone = selectedZone === 'ALL' || st.zone === selectedZone;
    const matchesSearch =
      st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.cities.some((c) => c.city.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesZone && matchesSearch;
  });

  // Direct city search results across all states if search query exists
  const directMatchingCities = searchQuery.trim().length > 1
    ? INDIAN_STATES_DATA.flatMap((s) => s.cities).filter((c) =>
        c.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.state.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 8)
    : [];

  // Get cities in currently selected state
  const availableCities = getCitiesForState(selectedStateName);

  // When state changes from the select dropdown
  const handleStateChange = (newStateName: string) => {
    setSelectedStateName(newStateName);
    const cities = getCitiesForState(newStateName);
    if (cities.length > 0) {
      const firstCity = cities[0];
      onGisChange(firstCity);
      if (patient && onPatientChange) {
        onPatientChange({
          ...patient,
          state: newStateName,
          district: firstCity.city.split(' ')[0],
        });
      }
    }
  };

  // When city is selected
  const handleCitySelect = (cityObj: GisEnvironment) => {
    onGisChange(cityObj);
    if (patient && onPatientChange) {
      onPatientChange({
        ...patient,
        state: cityObj.state,
        district: cityObj.city.split(' ')[0],
      });
    }
    setIsOpen(false);
  };

  const currentStateObj = INDIAN_STATES_DATA.find(
    (s) => s.name.toLowerCase() === selectedStateName.toLowerCase()
  ) || INDIAN_STATES_DATA[0];

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Navbar Trigger Button / Quick Selectors */}
      <div className="flex items-center gap-1.5 bg-slate-100/90 hover:bg-slate-200/80 p-1 pl-2.5 rounded-xl border border-slate-200 text-xs transition-all shadow-2xs">
        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />

        {/* State Quick Dropdown */}
        <select
          value={selectedStateName}
          onChange={(e) => handleStateChange(e.target.value)}
          className="bg-transparent font-bold text-slate-800 focus:outline-hidden cursor-pointer max-w-[100px] sm:max-w-[130px] truncate pr-1"
          title="Select State or Union Territory of India"
        >
          <optgroup label="States of India (28)">
            {INDIAN_STATES_DATA.filter((s) => s.type === 'State').map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Union Territories (8)">
            {INDIAN_STATES_DATA.filter((s) => s.type === 'Union Territory').map((s) => (
              <option key={s.name} value={s.name}>
                {s.name} (UT)
              </option>
            ))}
          </optgroup>
        </select>

        <span className="text-slate-300 font-light">/</span>

        {/* City Dropdown inside selected state */}
        <select
          value={gisContext.city}
          onChange={(e) => {
            const chosen = availableCities.find((c) => c.city === e.target.value);
            if (chosen) handleCitySelect(chosen);
          }}
          className="bg-transparent font-bold text-emerald-800 focus:outline-hidden cursor-pointer max-w-[90px] sm:max-w-[130px] truncate"
          title="Select City / District in this state"
        >
          {availableCities.map((c) => (
            <option key={c.city} value={c.city}>
              {c.city}
            </option>
          ))}
        </select>

        {/* Deep Outbreak Inspector Popover Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200 cursor-pointer transition-colors"
          title="Open All India States & Outbreaks GIS Explorer"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Outbreak & Comprehensive All-India States & Cities Drawer Popover */}
      {isOpen && (
        <div className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-[340px] sm:w-[500px] bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-fadeIn text-xs">
          {/* Popover Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3.5 flex items-center justify-between border-b border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <Navigation className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-white">All India GIS & IDSP Outbreak Directory</h4>
                <p className="text-[10px] text-slate-400">28 States • 8 Union Territories • Vector Surveillance</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3.5 space-y-3 max-h-[460px] overflow-y-auto">
            {/* Search & Zone Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search state (e.g. Kerala, Bihar, Assam) or city (e.g. Surat, Leh)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Zone Filter Chips */}
              <div className="flex flex-wrap gap-1 text-[10px]">
                {['ALL', 'North', 'South', 'East', 'West', 'Central', 'North-East', 'Islands'].map((zone) => (
                  <button
                    key={zone}
                    onClick={() => setSelectedZone(zone)}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                      selectedZone === zone
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {zone}
                  </button>
                ))}
              </div>

              {/* Direct Search City Matches across all of India */}
              {searchQuery.trim().length > 1 && directMatchingCities.length > 0 && (
                <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-2.5 space-y-1.5 animate-fadeIn">
                  <div className="text-[10px] font-bold text-indigo-900 flex items-center justify-between">
                    <span>Direct City Matches ({directMatchingCities.length})</span>
                    <span className="text-[9px] text-indigo-600 font-normal">Click to switch instantly</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {directMatchingCities.map((match) => (
                      <button
                        key={`${match.state}-${match.city}`}
                        onClick={() => {
                          setSelectedStateName(match.state);
                          handleCitySelect(match);
                          setSearchQuery('');
                        }}
                        className="text-left p-1.5 bg-white hover:bg-indigo-100/70 border border-indigo-100 rounded-lg text-slate-800 transition-colors flex items-center justify-between cursor-pointer"
                      >
                        <div className="truncate">
                          <span className="font-bold text-xs text-slate-900">{match.city}</span>
                          <span className="text-[10px] text-slate-500 block truncate">{match.state}</span>
                        </div>
                        <span className="text-[9px] font-mono text-indigo-700 shrink-0 ml-1 bg-indigo-50 px-1 py-0.5 rounded">
                          {match.tempC}°C • AQI {match.aqi}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Current Active Location Summary Card */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-700" />
                  <span className="font-bold text-slate-900">
                    {gisContext.city}, {gisContext.state}
                  </span>
                </div>
                <span className="bg-emerald-200 text-emerald-900 font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                  ACTIVE EPIDEMIOLOGY
                </span>
              </div>

              {/* Environmental Metrics Bar */}
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] bg-white/80 p-2 rounded-lg border border-emerald-100">
                <div className="flex items-center justify-center gap-1">
                  <Thermometer className="w-3 h-3 text-amber-500" />
                  <span>{gisContext.tempC}°C</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Droplets className="w-3 h-3 text-blue-500" />
                  <span>{gisContext.humidityPercent}% Hum</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Wind className="w-3 h-3 text-slate-500" />
                  <span
                    className={
                      gisContext.aqi > 250
                        ? 'text-rose-600 font-bold'
                        : gisContext.aqi > 150
                        ? 'text-amber-600 font-bold'
                        : 'text-emerald-600 font-bold'
                    }
                  >
                    AQI {gisContext.aqi}
                  </span>
                </div>
              </div>

              {/* Active Outbreak Advisory */}
              {gisContext.activeOutbreaks && gisContext.activeOutbreaks.length > 0 && (
                <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-[11px] space-y-1 text-rose-950">
                  <div className="flex items-center justify-between font-bold text-rose-800">
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      {gisContext.activeOutbreaks[0].disease}
                    </span>
                    <span className="text-[10px] bg-rose-200 px-1.5 py-0.2 rounded font-mono">
                      {gisContext.activeOutbreaks[0].casesThisWeek} cases/wk
                    </span>
                  </div>
                  <p className="text-[10px] text-rose-900 leading-snug">
                    {gisContext.activeOutbreaks[0].recommendedScreening}
                  </p>
                </div>
              )}
            </div>

            {/* State Selection Grid */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Step 1: Choose State or Union Territory ({filteredStates.length})
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto pr-1">
                {filteredStates.map((st) => (
                  <button
                    key={st.name}
                    onClick={() => handleStateChange(st.name)}
                    className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                      selectedStateName === st.name
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-950 font-bold shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="text-[11px] leading-tight truncate">{st.name}</div>
                    <div className="text-[9px] text-slate-400 flex items-center justify-between mt-1">
                      <span>{st.cities.length} cities</span>
                      <span className="font-mono text-[8px] bg-slate-200/80 px-1 rounded">{st.zone}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* City Selection Grid for Selected State */}
            <div className="space-y-1.5 pt-1 border-t border-slate-100">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Step 2: Choose City / District in {selectedStateName}</span>
                <span className="text-indigo-600">{availableCities.length} available</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableCities.map((cityItem) => {
                  const isCurrent = gisContext.city === cityItem.city;
                  const alert = cityItem.activeOutbreaks[0];

                  return (
                    <button
                      key={cityItem.city}
                      onClick={() => handleCitySelect(cityItem)}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between space-y-1.5 ${
                        isCurrent
                          ? 'bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500/20 text-emerald-950 shadow-2xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900">{cityItem.city}</span>
                        {isCurrent ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <span className="text-[10px] text-slate-400 font-mono">
                            {cityItem.tempC}°C • AQI {cityItem.aqi}
                          </span>
                        )}
                      </div>

                      {alert && (
                        <div className="text-[10px] bg-slate-100 text-slate-700 p-1.5 rounded-md flex items-center gap-1 line-clamp-1">
                          <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                          <span className="truncate">{alert.disease}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
