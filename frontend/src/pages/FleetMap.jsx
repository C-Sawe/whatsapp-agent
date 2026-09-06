import React, { useState, useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Truck, 
  Radio, 
  Activity, 
  Compass, 
  MapPin, 
  RefreshCw, 
  Gauge, 
  Navigation,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  Star,
  Fuel,
  Maximize2,
  Minimize2,
  Box,
  TrendingUp,
  User,
  Sliders,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import api from '../api';

const ELDORET_CENTER = [0.5143, 35.2698];
const DEFAULT_ZOOM = 12;

// SVG Semi-Circular Radial Gauge Component
function RadialGauge({ value, max = 100, unit = '%', label, sublabel, color = '#10B981', size = 160 }) {
  const radius = 58;
  const strokeWidth = 10;
  const cx = 80;
  const cy = 80;
  
  // Semi-circle arc: from -180 deg (left) to 0 deg (right) -> 180 degree span
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const arcLength = Math.PI * radius; // 182.2
  const strokeDashoffset = arcLength - (arcLength * pct) / 100;
  
  // Needle rotation: from -90 deg to +90 deg
  const needleAngle = -90 + (pct / 100) * 180;

  return (
    <div className="flex flex-col items-center justify-center relative select-none">
      <svg width={size} height={size * 0.65} viewBox="0 0 160 105" className="overflow-visible">
        <defs>
          <linearGradient id={`gauge-grad-${label.replace(/\s+/g, '')}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="60%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          <filter id="needle-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.6)" />
          </filter>
        </defs>

        {/* Background Track Arc */}
        <path
          d="M 22 80 A 58 58 0 0 1 138 80"
          fill="none"
          stroke="#27272a"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Value Arc */}
        <path
          d="M 22 80 A 58 58 0 0 1 138 80"
          fill="none"
          stroke={color === 'gradient' ? `url(#gauge-grad-${label.replace(/\s+/g, '')})` : color}
          strokeWidth={strokeWidth}
          strokeDasharray={arcLength}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />

        {/* Center Pivot & Needle */}
        <g transform={`rotate(${needleAngle}, ${cx}, ${cy})`} className="transition-transform duration-700 ease-out">
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - radius + 8}
            stroke="#f4f4f5"
            strokeWidth="3"
            strokeLinecap="round"
            filter="url(#needle-glow)"
          />
          <polygon
            points={`${cx - 3},${cy - 20} ${cx + 3},${cy - 20} ${cx},${cy - radius + 6}`}
            fill="#f4f4f5"
          />
        </g>
        <circle cx={cx} cy={cy} r="6" fill="#18181b" stroke="#52525b" strokeWidth="2.5" />
        <circle cx={cx} cy={cy} r="2.5" fill="#f4f4f5" />
      </svg>

      {/* Numeric readout */}
      <div className="text-center -mt-2">
        <div className="text-lg font-black text-white tracking-tight flex items-baseline justify-center gap-0.5">
          <span>{value}</span>
          <span className="text-[10px] text-stone-400 font-bold">{unit}</span>
        </div>
        <div className="text-[9px] uppercase tracking-widest text-stone-400 font-extrabold mt-0.5">
          {label}
        </div>
        {sublabel && (
          <div className="text-[8px] text-stone-500 font-medium">{sublabel}</div>
        )}
      </div>
    </div>
  );
}

// Mini SVG Sparkline Component for Trend Data
function MiniSparkline({ data = [30, 45, 60, 52, 74, 65, 80], color = '#10B981', height = 36, width = 120 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data) || 1;
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data.map((val, idx) => {
    const x = idx * step;
    const y = height - ((val - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  }).join(' ');

  const fillPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-fill-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill={`url(#spark-fill-${color.replace('#', '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function FleetMap() {
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const markersRef = useRef(new Map());
  const routeLinesRef = useRef(new Map());

  const [features, setFeatures] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState('MFS-TRK-01');
  const [wsStatus, setWsStatus] = useState('connecting');
  const [lastHeartbeat, setLastHeartbeat] = useState(null);
  const [activeTab, setActiveTab] = useState('COMMAND'); // 'COMMAND' (Map first) | 'STUDIO' (Telemetry Grid)
  const [filterQuery, setFilterQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Currently Selected Vehicle Object
  const selectedVehicle = useMemo(() => {
    return features.find(f => f.properties.vehicle_id === selectedVehicleId) || features[0] || null;
  }, [features, selectedVehicleId]);

  // Next / Previous Vehicle Navigator
  const navigateVehicle = (direction) => {
    if (!features.length) return;
    const currentIdx = features.findIndex(f => f.properties.vehicle_id === selectedVehicleId);
    let nextIdx = direction === 'next' ? currentIdx + 1 : currentIdx - 1;
    if (nextIdx >= features.length) nextIdx = 0;
    if (nextIdx < 0) nextIdx = features.length - 1;
    const nextVeh = features[nextIdx];
    if (nextVeh) {
      focusVehicle(nextVeh);
    }
  };

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: ELDORET_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: false,
    });

    // High-Contrast Esri World Dark Gray Canvas (Crisp Dark Mode without watermarks)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 16,
    }).addTo(map);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 16,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Eldoret Central Hub Marker
    const hubIcon = L.divIcon({
      className: 'eldoret-hub-marker',
      html: `
        <div style="display:flex; flex-direction:column; align-items:center;">
          <div style="background:#16a34a; color:#fff; border:2px solid #ffffff; border-radius:9999px; padding:6px; box-shadow:0 0 20px rgba(22,163,74,0.7);">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          </div>
          <span style="font-size:9px; font-weight:900; color:#4ade80; background:#0c0a09; padding:2px 7px; border-radius:4px; margin-top:4px; letter-spacing:1px; white-space:nowrap; border:1px solid #27272a;">MOSOP HUB</span>
        </div>
      `,
      iconSize: [80, 50],
      iconAnchor: [40, 25],
    });

    L.marker(ELDORET_CENTER, { icon: hubIcon })
      .addTo(map)
      .bindPopup(`
        <div style="color:#09090b; font-family:sans-serif; padding:4px;">
          <h4 style="font-weight:900; margin:0 0 4px; font-size:13px;">Mosop Central Logistics Hub</h4>
          <p style="margin:0; font-size:11px; color:#52525b;">Eldoret Central Depot · Uasin Gishu County</p>
          <p style="margin:4px 0 0; font-size:10px; font-weight:bold; color:#16a34a;">Lat: 0.5143° N, Lng: 35.2698° E</p>
        </div>
      `);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Markers & Route Trajectory Polylines
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const currentMarkerIds = new Set();

    features.forEach((feat) => {
      const [lng, lat] = feat.geometry.coordinates;
      const { vehicle_id, speed, ignition, course, device_name, route } = feat.properties;
      currentMarkerIds.add(vehicle_id);

      const isIgnitionOn = Boolean(ignition);
      const isSelected = selectedVehicleId === vehicle_id;
      const strokeColor = isIgnitionOn ? '#10B981' : '#EF4444';
      const glowBg = isIgnitionOn ? 'rgba(16, 185, 129, 0.45)' : 'rgba(239, 68, 68, 0.35)';

      // 1. Draw Route Polyline from Eldoret Depot to current Truck Coordinates
      if (isIgnitionOn) {
        const polylineCoords = [ELDORET_CENTER, [lat, lng]];
        if (routeLinesRef.current.has(vehicle_id)) {
          routeLinesRef.current.get(vehicle_id).setLatLngs(polylineCoords);
        } else {
          const line = L.polyline(polylineCoords, {
            color: isSelected ? '#10B981' : '#059669',
            weight: isSelected ? 3.5 : 2,
            opacity: isSelected ? 0.85 : 0.45,
            dashArray: '4, 8',
          }).addTo(map);
          routeLinesRef.current.set(vehicle_id, line);
        }
      } else if (routeLinesRef.current.has(vehicle_id)) {
        routeLinesRef.current.get(vehicle_id).remove();
        routeLinesRef.current.delete(vehicle_id);
      }

      // 2. Custom Truck DivIcon with Directional Orientation
      const customIcon = L.divIcon({
        className: `truck-marker-${vehicle_id}`,
        html: `
          <div style="position:relative; width:48px; height:48px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
            ${isSelected ? `
              <div style="position:absolute; inset:-4px; border-radius:9999px; border:2px dashed #10B981; animation:spin 8s linear infinite;"></div>
            ` : ''}
            <div style="position:absolute; inset:2px; border-radius:9999px; background:${glowBg}; animation:pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div>
            <div style="position:relative; z-index:10; background:#09090b; border:2.5px solid ${strokeColor}; border-radius:9999px; width:36px; height:36px; display:flex; align-items:center; justify-content:center; box-shadow:0 6px 16px rgba(0,0,0,0.8);">
              <div style="transform: rotate(${course || 0}deg); display:flex; align-items:center; justify-content:center; transition:transform 0.6s ease;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
                  <path d="M15 18H9"/>
                  <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
                  <circle cx="17" cy="18" r="2"/>
                  <circle cx="7" cy="18" r="2"/>
                </svg>
              </div>
            </div>
            <div style="position:absolute; bottom:-16px; left:50%; transform:translateX(-50%); background:#09090b; border:1px solid #27272a; color:#f4f4f5; font-size:9px; font-weight:900; padding:1px 6px; border-radius:3px; white-space:nowrap; box-shadow:0 2px 6px rgba(0,0,0,0.8);">
              ${speed} km/h
            </div>
          </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });

      // Floating Callout Popup matching Reference Image 2
      const popupHtml = `
        <div style="font-family:system-ui, -apple-system, sans-serif; min-width:230px; color:#18181b; padding:4px;">
          <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #e4e4e7; padding-bottom:8px; margin-bottom:8px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="display:inline-block; width:8px; height:8px; border-radius:9999px; background:${isIgnitionOn ? '#10B981' : '#EF4444'};"></span>
              <strong style="font-size:13px; font-weight:900; color:#09090b;">${vehicle_id}</strong>
            </div>
            <span style="background:${isIgnitionOn ? '#dcfce7' : '#fee2e2'}; color:${isIgnitionOn ? '#166534' : '#991b1b'}; font-size:10px; font-weight:800; padding:2px 8px; border-radius:9999px;">
              ${isIgnitionOn ? 'In Transit' : 'Depot Standby'}
            </span>
          </div>
          <div style="font-size:11px; color:#52525b; line-height:1.6;">
            <div><strong>Route:</strong> ${route?.origin || 'Eldoret Hub'} &rarr; ${route?.destination || 'Sector Station'}</div>
            <div><strong>Speed:</strong> <span style="color:#09090b; font-weight:bold;">${speed} km/h</span> · <strong>Bearing:</strong> ${course}°</div>
            <div><strong>ETA:</strong> <span style="color:#16a34a; font-weight:bold;">${route?.eta || 'Active'}</span></div>
          </div>
        </div>
      `;

      if (markersRef.current.has(vehicle_id)) {
        const marker = markersRef.current.get(vehicle_id);
        marker.setLatLng([lat, lng]);
        marker.setIcon(customIcon);
        marker.setPopupContent(popupHtml);
      } else {
        const newMarker = L.marker([lat, lng], { icon: customIcon })
          .addTo(map)
          .bindPopup(popupHtml);

        newMarker.on('click', () => {
          setSelectedVehicleId(vehicle_id);
        });

        markersRef.current.set(vehicle_id, newMarker);
      }
    });

    // Cleanup decommissioned markers & routes
    markersRef.current.forEach((marker, vid) => {
      if (!currentMarkerIds.has(vid)) {
        marker.remove();
        markersRef.current.delete(vid);
      }
    });
    routeLinesRef.current.forEach((line, vid) => {
      if (!currentMarkerIds.has(vid)) {
        line.remove();
        routeLinesRef.current.delete(vid);
      }
    });
  }, [features, selectedVehicleId]);

  // WebSocket Live Client with Fallback Polling
  useEffect(() => {
    let ws = null;
    let fallbackInterval = null;
    let isSubscribed = true;

    const connectWebSocket = () => {
      const isHttps = window.location.protocol === 'https:';
      const wsProtocol = isHttps ? 'wss:' : 'ws:';
      const host = window.location.hostname === 'localhost' && window.location.port === '5180'
        ? 'localhost:8000'
        : window.location.host;
      const wsUrl = `${wsProtocol}//${host}/ws/fleet`;

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (!isSubscribed) return;
          setWsStatus('connected');
          setLastHeartbeat(new Date());
          if (fallbackInterval) {
            clearInterval(fallbackInterval);
            fallbackInterval = null;
          }
        };

        ws.onmessage = (event) => {
          if (!isSubscribed) return;
          try {
            const data = JSON.parse(event.data);
            if (data && data.features) {
              setFeatures(data.features);
              setMetadata(data.metadata || null);
              setLastHeartbeat(new Date());
            }
          } catch (err) {
            console.error('WebSocket parse error:', err);
          }
        };

        ws.onerror = () => {
          if (!isSubscribed) return;
          setWsStatus('reconnecting');
        };

        ws.onclose = () => {
          if (!isSubscribed) return;
          setWsStatus('fallback');
          if (!fallbackInterval) {
            fallbackInterval = setInterval(fetchTelemetryViaRest, 10000);
          }
          setTimeout(() => {
            if (isSubscribed) connectWebSocket();
          }, 5000);
        };
      } catch (err) {
        setWsStatus('fallback');
        if (!fallbackInterval) {
          fallbackInterval = setInterval(fetchTelemetryViaRest, 10000);
        }
      }
    };

    const fetchTelemetryViaRest = async () => {
      try {
        const res = await api.get('/api/fleet/live-geojson');
        if (res.data && res.data.features && isSubscribed) {
          setFeatures(res.data.features);
          setMetadata(res.data.metadata || null);
          setLastHeartbeat(new Date());
        }
      } catch (err) {
        console.error('REST fallback polling error:', err);
      }
    };

    fetchTelemetryViaRest();
    connectWebSocket();

    return () => {
      isSubscribed = false;
      if (ws) ws.close();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, []);

  const focusVehicle = (vehicle) => {
    const vid = vehicle.properties.vehicle_id;
    setSelectedVehicleId(vid);
    if (!mapRef.current) return;
    const [lng, lat] = vehicle.geometry.coordinates;
    mapRef.current.flyTo([lat, lng], 14.5, { duration: 1.2 });

    const marker = markersRef.current.get(vid);
    if (marker) {
      marker.openPopup();
    }
  };

  const resetToHub = () => {
    if (mapRef.current) {
      mapRef.current.flyTo(ELDORET_CENTER, DEFAULT_ZOOM, { duration: 1.2 });
    }
  };

  // Metric Aggregations
  const stats = useMemo(() => {
    const total = features.length;
    const active = features.filter(f => f.properties.ignition).length;
    const standby = total - active;
    const totalSpeed = features.reduce((acc, f) => acc + (f.properties.speed || 0), 0);
    const avgSpeed = total > 0 ? (totalSpeed / total).toFixed(1) : '0.0';
    return { total, active, standby, avgSpeed };
  }, [features]);

  // Filtered List
  const filteredFeatures = useMemo(() => {
    return features.filter((feat) => {
      const vid = (feat.properties.vehicle_id || '').toLowerCase();
      const dname = (feat.properties.device_name || '').toLowerCase();
      const q = filterQuery.toLowerCase();
      const matchesSearch = vid.includes(q) || dname.includes(q);

      if (!matchesSearch) return false;
      if (statusFilter === 'ACTIVE') return feat.properties.ignition === true;
      if (statusFilter === 'STANDBY') return feat.properties.ignition === false;
      return true;
    });
  }, [features, filterQuery, statusFilter]);

  return (
    <div className="space-y-4 font-sans text-stone-200">
      {/* Sleek Floating Master Command Header */}
      <div className="bg-[#121316] border border-stone-800/90 rounded-sm p-4 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-sm bg-stone-900 border border-stone-800 flex items-center justify-center text-green-400 shadow-inner">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-sm font-black tracking-widest uppercase text-white">
                Mosop Fleet Radar & Telematics
              </h1>
              <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-sm flex items-center gap-1.5 ${
                wsStatus === 'connected'
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/60'
                  : 'bg-amber-950/80 text-amber-400 border border-amber-700/60'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${wsStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                {wsStatus === 'connected' ? 'LIVE WS' : 'REST POLLING'}
              </span>
            </div>
            <p className="text-[11px] text-stone-400 mt-0.5">
              Agricultural Supply Logistics · North Rift & Eldoret Hub Sector
            </p>
          </div>
        </div>

        {/* View Mode Switcher (Inspired by reference aesthetics) */}
        <div className="flex items-center gap-2">
          <div className="flex bg-stone-950 p-1 rounded-sm border border-stone-800">
            <button
              onClick={() => setActiveTab('COMMAND')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-sm transition-all ${
                activeTab === 'COMMAND'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              Geospatial Map
            </button>
            <button
              onClick={() => setActiveTab('STUDIO')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-sm transition-all ${
                activeTab === 'STUDIO'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Telematics Studio
            </button>
          </div>

          <button
            onClick={resetToHub}
            className="flex items-center gap-1.5 px-3 py-2 bg-stone-900 hover:bg-stone-800 text-stone-200 text-[11px] font-bold uppercase tracking-wider rounded-sm border border-stone-800 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5 text-green-400" />
            Eldoret Depot
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE A: GEOSPATIAL MAP COMMAND WITH FLOATING TELEMETRY DOCK (IMAGE 2)      */}
      {/* ========================================================================= */}
      {activeTab === 'COMMAND' && (
        <div className="space-y-4">
          {/* Main Map Container */}
          <div className="h-[680px] w-full rounded-sm border border-stone-800 overflow-hidden relative shadow-2xl bg-stone-950">
            <div ref={mapContainerRef} className="w-full h-full z-10" />

            {/* Floating Top Filter & Status Strip */}
            <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
              <div className="pointer-events-auto bg-[#121316]/95 backdrop-blur-md border border-stone-800 p-2 rounded-sm shadow-xl flex items-center gap-3">
                <div className="relative w-48">
                  <Search className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder="Search truck or cargo..."
                    className="w-full bg-stone-950 border border-stone-800 pl-8 pr-2 py-1 text-xs text-stone-200 rounded-sm focus:outline-none focus:border-green-600 placeholder-stone-600"
                  />
                </div>

                <div className="flex gap-1 border-l border-stone-800 pl-2">
                  {['ALL', 'ACTIVE', 'STANDBY'].map(f => (
                    <button
                      key={f}
                      onClick={() => setStatusFilter(f)}
                      className={`px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded-sm transition-colors ${
                        statusFilter === f
                          ? 'bg-green-600 text-white'
                          : 'bg-stone-900 text-stone-400 hover:bg-stone-800'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fleet Metric Badges */}
              <div className="pointer-events-auto flex items-center gap-2 bg-[#121316]/95 backdrop-blur-md border border-stone-800 px-3 py-2 rounded-sm shadow-xl text-xs">
                <div className="flex items-center gap-2 pr-3 border-r border-stone-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-stone-400 text-[10px] font-bold uppercase">Transit:</span>
                  <strong className="text-white">{stats.active}</strong>
                </div>
                <div className="flex items-center gap-2 pr-3 border-r border-stone-800">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  <span className="text-stone-400 text-[10px] font-bold uppercase">Depot:</span>
                  <strong className="text-white">{stats.standby}</strong>
                </div>
                <div className="flex items-center gap-2">
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-stone-400 text-[10px] font-bold uppercase">Avg:</span>
                  <strong className="text-white">{stats.avgSpeed} km/h</strong>
                </div>
              </div>
            </div>

            {/* Bottom Floating Telemetry Dock (Inspired directly by Reference Image 2) */}
            {selectedVehicle && (
              <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-auto">
                <div className="bg-[#121316]/95 backdrop-blur-xl border border-stone-800 p-4 rounded-sm shadow-2xl grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  
                  {/* Column 1: Selected Truck Identification & Route */}
                  <div className="md:col-span-4 flex items-center justify-between pr-4 md:border-r border-stone-800/80">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white tracking-wide">
                          {selectedVehicle.properties.vehicle_id}
                        </span>
                        <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded-sm ${
                          selectedVehicle.properties.ignition
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'bg-red-500/20 text-red-400 border border-red-500/40'
                        }`}>
                          {selectedVehicle.properties.ignition ? 'In Transit' : 'Depot Standby'}
                        </span>
                      </div>
                      
                      <p className="text-[11px] text-stone-300 font-semibold truncate">
                        {selectedVehicle.properties.route?.origin || 'Eldoret Central'} &rarr; {selectedVehicle.properties.route?.destination || 'Branch Station'}
                      </p>

                      <div className="flex items-center gap-3 text-[10px] text-stone-400 pt-1">
                        <div>Weight: <strong className="text-stone-200">{selectedVehicle.properties.cargo?.weight_metric || '14.8t'}</strong></div>
                        <div>ETA: <strong className="text-emerald-400">{selectedVehicle.properties.route?.eta || '~18 min'}</strong></div>
                        <div>Driver: <strong className="text-stone-200">{selectedVehicle.properties.driver?.name?.split(' ')[0] || 'Assigned'}</strong></div>
                      </div>
                    </div>

                    {/* Previous / Next Vehicle Navigator Buttons */}
                    <div className="flex flex-col gap-1 pl-3">
                      <button
                        onClick={() => navigateVehicle('prev')}
                        className="p-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 rounded-sm border border-stone-800 transition-colors"
                        title="Previous Truck"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => navigateVehicle('next')}
                        className="p-1.5 bg-stone-900 hover:bg-stone-800 text-stone-300 rounded-sm border border-stone-800 transition-colors"
                        title="Next Truck"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Column 2: Dual Semi-Circular Gauges (Battery/Fuel & Cargo Load) */}
                  <div className="md:col-span-4 flex items-center justify-around px-2 md:border-r border-stone-800/80">
                    <RadialGauge
                      value={selectedVehicle.properties.fuel?.pct || 72}
                      label="Fuel Tank"
                      sublabel={`${selectedVehicle.properties.fuel?.gal || 3.6} gal · Range 320km`}
                      color="#F59E0B"
                      size={130}
                    />
                    <RadialGauge
                      value={selectedVehicle.properties.cargo?.weight_pct || 65}
                      label="Cargo Load"
                      sublabel={selectedVehicle.properties.cargo?.weight_metric || '14.8 / 20.0t'}
                      color="#10B981"
                      size={130}
                    />
                  </div>

                  {/* Column 3: Fleet Delivery Performance & Sparkline Metrics */}
                  <div className="md:col-span-4 flex flex-col justify-between h-full pl-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Current Speed</span>
                        <div className="text-xl font-black text-white">{selectedVehicle.properties.speed} <span className="text-xs text-stone-400 font-normal">km/h</span></div>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Trip Trajectory</span>
                        <MiniSparkline
                          data={selectedVehicle.properties.speed_history || [30, 45, 50, 65, 70, 64]}
                          color="#10B981"
                          width={110}
                          height={28}
                        />
                      </div>
                    </div>

                    {/* Status Performance Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-extrabold uppercase tracking-wider text-stone-400">
                        <span>Route Progress</span>
                        <span className="text-emerald-400">{selectedVehicle.properties.route?.progress_pct || 72}%</span>
                      </div>
                      <div className="w-full bg-stone-900 h-2 rounded-full overflow-hidden flex border border-stone-800">
                        <div style={{ width: `${selectedVehicle.properties.route?.progress_pct || 72}%` }} className="bg-gradient-to-r from-emerald-500 to-amber-500 transition-all duration-700"></div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE B: TECHNICAL TELEMATICS STUDIO & CARGO SHOWCASE (IMAGE 1)              */}
      {/* ========================================================================= */}
      {activeTab === 'STUDIO' && selectedVehicle && (
        <div className="space-y-4">
          {/* Quick Vehicle Selector Ribbon */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {features.map((f) => {
              const isSel = f.properties.vehicle_id === selectedVehicleId;
              const isMoving = f.properties.ignition;
              return (
                <button
                  key={f.properties.vehicle_id}
                  onClick={() => focusVehicle(f)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-sm border transition-all shrink-0 text-left ${
                    isSel
                      ? 'bg-stone-900 border-green-500 text-white shadow-lg'
                      : 'bg-[#121316] border-stone-800 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isMoving ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                  <div>
                    <div className="text-xs font-black">{f.properties.vehicle_id}</div>
                    <div className="text-[10px] text-stone-500">{f.properties.device_name}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Main Telematics Grid (Inspired by Reference Image 1) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Left Column: Delivery Performance & Instrument Cluster */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Card 1: On-Time Delivery Performance Area Chart */}
              <div className="bg-[#121316] border border-stone-800 rounded-sm p-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-stone-800">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-white">Speed & Trip Performance</h3>
                      <p className="text-[10px] text-stone-400">Live telemetry velocity profile across route sector</p>
                    </div>
                  </div>
                  <button onClick={resetToHub} className="p-1 text-stone-500 hover:text-stone-300">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="pt-4 flex items-center justify-center">
                  <MiniSparkline
                    data={selectedVehicle.properties.speed_history || [40, 52, 60, 55, 68, 64, 72, 65]}
                    color="#10B981"
                    width={380}
                    height={110}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-stone-500 pt-2 border-t border-stone-800/60 font-bold uppercase">
                  <span>Departure Point</span>
                  <span>En-Route Sector</span>
                  <span>Final Approach</span>
                </div>
              </div>

              {/* Card 2: Dial Instruments (Speedometer & Fuel Radial Gauge) */}
              <div className="bg-[#121316] border border-stone-800 rounded-sm p-4 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white tracking-wide">
                        {selectedVehicle.properties.vehicle_id}
                      </span>
                      <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-sm bg-emerald-950 text-emerald-400 border border-emerald-700/60">
                        {selectedVehicle.properties.ignition ? 'Active' : 'Standby'}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-400 mt-0.5">{selectedVehicle.properties.model}</p>
                  </div>
                  <Truck className="w-5 h-5 text-stone-600" />
                </div>

                {/* Origin -> Destination Route Banner */}
                <div className="bg-stone-950 p-2.5 rounded-sm border border-stone-800 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-stone-200">
                    <span>{selectedVehicle.properties.route?.origin} &rarr; {selectedVehicle.properties.route?.destination}</span>
                    <span className="text-emerald-400">{selectedVehicle.properties.route?.total_distance}</span>
                  </div>
                  <div className="w-full bg-stone-900 h-1.5 rounded-full overflow-hidden">
                    <div style={{ width: `${selectedVehicle.properties.route?.progress_pct || 72}%` }} className="bg-amber-500 h-full rounded-full"></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-stone-400">
                    <span>ETA: <strong className="text-white">{selectedVehicle.properties.route?.eta}</strong></span>
                    <span>Remaining: <strong className="text-white">{selectedVehicle.properties.route?.remaining_distance}</strong></span>
                  </div>
                </div>

                {/* Dual Instrument Dials */}
                <div className="grid grid-cols-2 gap-2 bg-stone-950/60 p-3 rounded-sm border border-stone-800/80">
                  <RadialGauge
                    value={selectedVehicle.properties.speed}
                    max={120}
                    unit="km/h"
                    label="Current Speed"
                    sublabel={selectedVehicle.properties.speed > 70 ? 'High Speed' : 'Optimal Cruise'}
                    color="gradient"
                    size={140}
                  />
                  <RadialGauge
                    value={selectedVehicle.properties.fuel?.pct || 72}
                    max={100}
                    unit="%"
                    label="Fuel Reserve"
                    sublabel={`${selectedVehicle.properties.fuel?.gal || 3.6} gal · 72°F`}
                    color="#F59E0B"
                    size={140}
                  />
                </div>

                {/* Safety Alert Banner */}
                <div className="flex items-center gap-2 p-2.5 bg-amber-950/30 border border-amber-800/50 rounded-sm text-amber-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Required Driver Rest Period: 30 min (after 8h operational window)</span>
                </div>
              </div>

            </div>

            {/* Right Column: Cargo Layout Compartments & Assigned Driver */}
            <div className="lg:col-span-7 space-y-4">
              
              {/* Card 3: Cargo Layout Showcase (Directly matching Reference Image 1) */}
              <div className="bg-[#121316] border border-stone-800 rounded-sm p-4 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Box className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-black uppercase tracking-wider text-white">Cargo Manifest & Compartments</h3>
                        <span className="px-2 py-0.5 text-[9px] font-bold rounded-sm bg-stone-800 text-stone-300 border border-stone-700">
                          {selectedVehicle.properties.cargo?.status || 'Loaded'}
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-400">{selectedVehicle.properties.cargo?.category}</p>
                    </div>
                  </div>

                  <span className="text-xs font-bold text-stone-400">
                    {selectedVehicle.properties.cargo?.parcels?.length || 0} Consignments
                  </span>
                </div>

                {/* Weight & Volume Capacity Meters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-stone-950 p-3 rounded-sm border border-stone-800 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-stone-400 text-[10px] uppercase font-bold tracking-wider">Weight Capacity</span>
                      <strong className="text-white">{selectedVehicle.properties.cargo?.weight_lbs}</strong>
                    </div>
                    <div className="w-full bg-stone-900 h-2 rounded-full overflow-hidden">
                      <div style={{ width: `${selectedVehicle.properties.cargo?.weight_pct || 65}%` }} className="bg-amber-500 h-full rounded-full"></div>
                    </div>
                  </div>

                  <div className="bg-stone-950 p-3 rounded-sm border border-stone-800 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-stone-400 text-[10px] uppercase font-bold tracking-wider">Volume Capacity</span>
                      <strong className="text-white">{selectedVehicle.properties.cargo?.volume_ft}</strong>
                    </div>
                    <div className="w-full bg-stone-900 h-2 rounded-full overflow-hidden">
                      <div style={{ width: `${selectedVehicle.properties.cargo?.volume_pct || 90}%` }} className="bg-red-500 h-full rounded-full"></div>
                    </div>
                  </div>
                </div>

                {/* Visual Trailer Graphic with Compartment Grid */}
                <div className="bg-stone-950 p-4 rounded-sm border border-stone-800 space-y-3">
                  <div className="text-[10px] font-black uppercase tracking-widest text-stone-400 flex items-center justify-between">
                    <span>Trailer Load Layout (High-Density Agricultural Staging)</span>
                    <span className="text-green-500">Active Cargo Lock</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {(selectedVehicle.properties.cargo?.parcels || []).map((p, idx) => (
                      <div
                        key={idx}
                        className="bg-stone-900/90 border border-stone-800 hover:border-amber-500/80 p-3 rounded-sm space-y-1.5 transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-stone-200 group-hover:text-amber-400">
                            {p.id}
                          </span>
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm ${
                            p.code === 'Critical' 
                              ? 'bg-red-950 text-red-400 border border-red-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}>
                            {p.code}
                          </span>
                        </div>
                        <div className="text-[11px] font-bold text-stone-300 leading-snug">
                          {p.title}
                        </div>
                        <div className="text-[9px] text-stone-500 font-semibold">
                          Bay: {p.slot}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 4: Assigned Driver Card (Inspired by Image 1 & 2) */}
              <div className="bg-[#121316] border border-stone-800 rounded-sm p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-sm bg-stone-900 border border-stone-800 flex items-center justify-center font-black text-green-400 text-base shadow-inner">
                    {selectedVehicle.properties.driver?.avatar_initials || 'MK'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-white">
                        {selectedVehicle.properties.driver?.name}
                      </h4>
                      <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-sm bg-blue-950 text-blue-400 border border-blue-800 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                        {selectedVehicle.properties.driver?.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-400 mt-0.5">
                      {selectedVehicle.properties.driver?.role} · License {selectedVehicle.properties.driver?.id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 border-t sm:border-t-0 sm:border-l border-stone-800 pt-3 sm:pt-0 sm:pl-6 text-center">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-stone-500">Hours Today</span>
                    <div className="text-sm font-black text-white mt-0.5">{selectedVehicle.properties.driver?.hours_today}h</div>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-stone-500">This Week</span>
                    <div className="text-sm font-black text-white mt-0.5">{selectedVehicle.properties.driver?.hours_week}h</div>
                  </div>
                  <div>
                    <span className="text-[9px] uppercase font-bold text-stone-500">Rating</span>
                    <div className="text-sm font-black text-amber-400 mt-0.5 flex items-center justify-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {selectedVehicle.properties.driver?.rating}
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
