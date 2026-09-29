import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  Factory,
  Flame,
  History,
  Leaf,
  Map as MapIcon,
  MapPinned,
  Radar,
  Search,
  ShieldAlert,
} from 'lucide-react'
import './App.css'

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  


const incidents = [
  {
    id: 'NTR-26162-041',
    title: 'Accidental Industrial Fire / Explosion',
    category: 'High-Risk Emergencies',
    type: 'red',
    lat: 22.7416,
    lng: 72.6395,
    classification: 'High-priority accidental thermal event',
    infrastructure: '1.2 km from industrial cluster',
    coordinates: '22.7416°N, 72.6395°E',
    confidence: '96.4%',
    riskScore: 'Critical',
    sensor: 'NASA VIIRS / MODIS 375m',
    windVector: 'ENE 16.3 kt',
    aiSummary:
      'Thermal anomaly indicates a sudden ignition event adjacent to a dense industrial corridor. The plume geometry and spatial proximity to processing units suggest an unintended combustion event rather than a controlled flare. Immediate dispatch is recommended for perimeter inspection and gas monitoring.',
    radar: '4.8 km plume trajectory',
    lastSeen: '6 min ago',
  },
  {
    id: 'NTR-26162-128',
    title: 'Persistent Industrial Source',
    category: 'Industrial Flares',
    type: 'purple',
    lat: 21.5705,
    lng: 73.0058,
    classification: 'Normal gas flare / blast furnace source',
    infrastructure: '0.9 km from refinery perimeter',
    coordinates: '21.5705°N, 73.0058°E',
    confidence: '92.1%',
    riskScore: 'Moderate',
    sensor: 'NASA VIIRS / MODIS 375m',
    windVector: 'W 7.4 kt',
    aiSummary:
      'Persistent thermal signature remains stable across multiple passes with low dispersion, consistent with combustion infrastructure rather than wildfire behavior. The heat footprint is anchored to a continuous industrial stack and not moving with surface winds.',
    radar: '3.1 km flare corridor',
    lastSeen: '11 min ago',
  },
  {
    id: 'NTR-26162-203',
    title: 'Persistent Industrial Source',
    category: 'Industrial Flares',
    type: 'purple',
    lat: 23.1128,
    lng: 72.6093,
    classification: 'Fuel venting / thermal stack anomaly',
    infrastructure: '1.7 km from petrochemical storage',
    coordinates: '23.1128°N, 72.6093°E',
    confidence: '89.8%',
    riskScore: 'Moderate',
    sensor: 'NASA VIIRS / MODIS 375m',
    windVector: 'NNE 9.1 kt',
    aiSummary:
      'The anomaly fixes to a single industrial asset and persists over successive thermal scans. Signature morphology aligns with process exhaust, suggesting a stable operational source rather than an uncontrolled combustion event.',
    radar: '2.7 km operational footprint',
    lastSeen: '15 min ago',
  },
  {
    id: 'NTR-26162-311',
    title: 'Natural Wildfire / Forest Fire',
    category: 'Natural Wildfires',
    type: 'orange',
    lat: 22.4367,
    lng: 71.5993,
    classification: 'Active wildfire front in reserve forest',
    infrastructure: '6.1 km from forest edge access road',
    coordinates: '22.4367°N, 71.5993°E',
    confidence: '94.6%',
    riskScore: 'High',
    sensor: 'NASA VIIRS / MODIS 375m',
    windVector: 'SW 18.2 kt',
    aiSummary:
      'The thermal pattern expands along a linear wildfire front with irregular edge intensity and smoke-coupled radiance, typical of a natural surface fire spreading through dry vegetation. Wind-driven spread remains likely, especially under low humidity conditions.',
    radar: '6.4 km active burn spread',
    lastSeen: '8 min ago',
  },
  {
    id: 'NTR-26162-418',
    title: 'Agricultural Crop Burning',
    category: 'Agricultural Burns',
    type: 'yellow',
    lat: 21.2424,
    lng: 72.8398,
    classification: 'Farm residue ignition event',
    infrastructure: '2.5 km from rural settlement',
    coordinates: '21.2424°N, 72.8398°E',
    confidence: '90.5%',
    riskScore: 'Elevated',
    sensor: 'NASA VIIRS / MODIS 375m',
    windVector: 'ESE 11.7 kt',
    aiSummary:
      'The hotspot is compact and distributed in a patchwork pattern consistent with controlled agricultural burning. Fire signature is short-lived and dispersed around field boundaries, indicating crop-residue ignition rather than infrastructure-related combustion.',
    radar: '1.8 km field perimeter',
    lastSeen: '20 min ago',
  },
  {
    id: 'NTR-26162-504',
    title: 'Agricultural Crop Burning',
    category: 'Agricultural Burns',
    type: 'yellow',
    lat: 23.6218,
    lng: 72.4358,
    classification: 'Seasonal crop residue burn',
    infrastructure: '3.3 km from farming belt',
    coordinates: '23.6218°N, 72.4358°E',
    confidence: '88.9%',
    riskScore: 'Elevated',
    sensor: 'NASA VIIRS / MODIS 375m',
    windVector: 'SE 13.4 kt',
    aiSummary:
      'Thermal cluster pattern matches field-level biomass combustion in a narrow agricultural zone. Emission spread is localized and away from industrial targets, which supports a recurring seasonal crop-burning signature rather than emergency-level fire risk.',
    radar: '2.4 km burn cluster',
    lastSeen: '14 min ago',
  },
]


const archiveRecords = [
  {
    id: 'NTR-26162-041',
    location: 'Junagadh Industrial Belt',
    district: 'Junagadh',
    classification: 'Emergency',
    type: 'Emergency',
    timestamp: '2026-09-25 02:14 UTC',
    status: 'Resolved',
    latitude: 22.7416,
    longitude: 72.6395,
    coordinates: '22.7416°N, 72.6395°E',
    infrastructure: '1.2 km from industrial cluster',
    sensor: 'NASA VIIRS / MODIS 375m',
    confidence: '96.4%',
    windVector: 'ENE 16.3 kt',
    aiSummary:
      'Thermal anomaly was assessed as an accidental industrial ignition with strong plume dispersion and direct proximity to manufacturing infrastructure. Dispatch recommendation remains active for emergency containment and closure operations.',
  },
  {
    id: 'NTR-26162-128',
    location: 'Dahej Refinery Zone',
    district: 'Bharuch',
    classification: 'Industrial Flare',
    type: 'Industrial Flare',
    timestamp: '2026-09-24 18:42 UTC',
    status: 'Archived - False Positive',
    latitude: 21.5705,
    longitude: 73.0058,
    coordinates: '21.5705°N, 73.0058°E',
    infrastructure: '0.9 km from refinery perimeter',
    sensor: 'NASA VIIRS / MODIS 375m',
    confidence: '92.1%',
    windVector: 'W 7.4 kt',
    aiSummary:
      'Persistent thermal signature was classified as a false positive after comparison with operational flare profiles. The stable source remained anchored to an industrial stack without evidence of uncontrolled combustion or spread.',
  },
  {
    id: 'NTR-26162-311',
    location: 'Dang Forest Fringe',
    district: 'Dang',
    classification: 'Emergency',
    type: 'Wildfire',
    timestamp: '2026-09-24 11:09 UTC',
    status: 'Monitoring',
    latitude: 22.4367,
    longitude: 71.5993,
    coordinates: '22.4367°N, 71.5993°E',
    infrastructure: '6.1 km from forest edge access road',
    sensor: 'NASA VIIRS / MODIS 375m',
    confidence: '94.6%',
    windVector: 'SW 18.2 kt',
    aiSummary:
      'Surface thermal pattern matched a natural wildfire progression along a dry vegetation fringe. Spread risk remains elevated under current wind conditions and is being monitored by field teams.',
  },
  {
    id: 'NTR-26162-418',
    location: 'Kheda Agriculture Belt',
    district: 'Kheda',
    classification: 'Agriculture',
    type: 'Agricultural Burn',
    timestamp: '2026-09-23 16:38 UTC',
    status: 'Resolved',
    latitude: 21.2424,
    longitude: 72.8398,
    coordinates: '21.2424°N, 72.8398°E',
    infrastructure: '2.5 km from rural settlement',
    sensor: 'NASA VIIRS / MODIS 375m',
    confidence: '90.5%',
    windVector: 'ESE 11.7 kt',
    aiSummary:
      'Compact hotspot geometry and field-edge distribution strongly indicates controlled agricultural burning. No sustained spread beyond crop boundary was observed and the incident was closed after verification.',
  },
  {
    id: 'NTR-26162-504',
    location: 'Mehsana Crop Corridor',
    district: 'Mehsana',
    classification: 'Agriculture',
    type: 'Agricultural Burn',
    timestamp: '2026-09-23 09:11 UTC',
    status: 'Archived - False Positive',
    latitude: 23.6218,
    longitude: 72.4358,
    coordinates: '23.6218°N, 72.4358°E',
    infrastructure: '3.3 km from farming belt',
    sensor: 'NASA VIIRS / MODIS 375m',
    confidence: '88.9%',
    windVector: 'SE 13.4 kt',
    aiSummary:
      'The thermal cluster was reclassified as a seasonal crop residue signature after comparison with historical agricultural stubble patterns. The event was archived as non-emergent and not linked to structural fire activity.',
  },
  {
    id: 'NTR-26162-203',
    location: 'Surat Petrochemical Cluster',
    district: 'Surat',
    classification: 'Industrial Flare',
    type: 'Industrial Flare',
    timestamp: '2026-09-22 21:30 UTC',
    status: 'Resolved',
    latitude: 23.1128,
    longitude: 72.6093,
    coordinates: '23.1128°N, 72.6093°E',
    infrastructure: '1.7 km from petrochemical storage',
    sensor: 'NASA VIIRS / MODIS 375m',
    confidence: '89.8%',
    windVector: 'NNE 9.1 kt',
    aiSummary:
      'The anomaly displayed a fixed industrial thermal source with consistent plume stability. Operational assessment confirmed regular process venting, and the incident was closed after review.',
  },
  {
    id: 'NTR-26162-441',
    location: 'Patan Agricultural Ring',
    district: 'Patan',
    classification: 'Agriculture',
    type: 'Agricultural Burn',
    timestamp: '2026-09-22 07:54 UTC',
    status: 'Archived - False Positive',
    latitude: 23.8042,
    longitude: 72.0486,
    coordinates: '23.8042°N, 72.0486°E',
    infrastructure: '2.1 km from crop storage lot',
    sensor: 'NASA VIIRS / MODIS 375m',
    confidence: '87.2%',
    windVector: 'WNW 8.7 kt',
    aiSummary:
      'Field-level thermal pattern was determined to be a recurring harvest burn without threat to protected assets. The event was retained in archive documentation as confirmed false positive activity.',
  },
  {
    id: 'NTR-26162-662',
    location: 'Rajkot Fire Buffer',
    district: 'Rajkot',
    classification: 'Emergency',
    type: 'Wildfire',
    timestamp: '2026-09-21 19:16 UTC',
    status: 'Monitoring',
    latitude: 22.3046,
    longitude: 70.8022,
    coordinates: '22.3046°N, 70.8022°E',
    infrastructure: '4.8 km from service corridor',
    sensor: 'NASA VIIRS / MODIS 375m',
    confidence: '91.7%',
    windVector: 'SSE 15.9 kt',
    aiSummary:
      'An active heat front adjacent to open scrubland suggests ongoing wildfire behavior. Thermal intensity is moderate but sustained, and observation remains active until perimeter conditions stabilize.',
  },
]

const routineSources = [
  {
    id: 'NTR-26162-128',
    location: 'Dahej Refinery Zone',
    district: 'Bharuch',
    plant: 'Registered refinery complex',
    baselineThreshold: '32°C above ambient baseline',
    proximity: '0.9 km from refinery perimeter',
    verificationStatus: 'Verified Routine',
    lastScan: '02:15 UTC',
    stableSignature: 'Stable 11 min • low dispersion',
  },
  {
    id: 'NTR-26162-203',
    location: 'Surat Petrochemical Cluster',
    district: 'Surat',
    plant: 'Petrochemical process stack',
    baselineThreshold: '29°C above ambient baseline',
    proximity: '1.7 km from storage manifold',
    verificationStatus: 'Verified Routine',
    lastScan: '02:18 UTC',
    stableSignature: 'Stable 15 min • consistent stack venting',
  },
  {
    id: 'NTR-26162-871',
    location: 'Hazira Industrial Corridor',
    district: 'Surat',
    plant: 'Blast furnace cluster',
    baselineThreshold: '26°C above ambient baseline',
    proximity: '1.1 km from furnace line',
    verificationStatus: 'Verified Routine',
    lastScan: '02:20 UTC',
    stableSignature: 'Stable 9 min • recurring thermal cycle',
  },
]

const filterOptions = [
  {
    label: 'All',
    icon: ShieldAlert,
    accent: 'neutral',
  },

  {
    label: 'High Risk',
    icon: AlertTriangle,
    accent: 'red',
  },

  {
    label: 'Industrial / Persistent',
    icon: Factory,
    accent: 'purple',
  },

  {
    label: 'Other Thermal',
    icon: Flame,
    accent: 'orange',
  },
]
const archiveFilters = ['All', 'Emergency', 'Industrial Flare', 'Agriculture']

const typePalette = {
  red: '#ef4444',
  purple: '#8b5cf6',
  orange: '#f97316',
  yellow: '#facc15',
}

// ============================================================
// CONVERT BACKEND DETECTIONS → UI INCIDENT FORMAT
// ============================================================

const convertDetectionToIncident = (detection, index) => {

  const risk = detection.risk_level || "Low";

  let type = "yellow";

  if (risk === "High") {
    type = "red";
  } else if (risk === "Moderate") {
    type = "orange";
  } else {
    type = "yellow";
  }

  const probability =
    Number(detection.probability_industrial || 0);

  const classification =
    detection.prediction === 1
      ? "Industrial / Persistent Thermal Source"
      : "Other Thermal Detection";

  return {
    id: `FIRMS-${String(index + 1).padStart(4, "0")}`,

    title: classification,

    category:
      detection.prediction === 1
        ? "Industrial Flares"
        : "Other Thermal Sources",

    type,

    lat: Number(detection.latitude),
    lng: Number(detection.longitude),

    classification,

    infrastructure:
      detection.nearest_industrial_km != null
        ? `${Number(detection.nearest_industrial_km).toFixed(2)} km from nearest industrial feature`
        : "No nearby industrial feature detected",

    coordinates:
      `${Number(detection.latitude).toFixed(5)}°N, ` +
      `${Number(detection.longitude).toFixed(5)}°E`,

    confidence:
      `${(probability * 100).toFixed(1)}%`,

    riskScore: risk,

    sensor: "NASA FIRMS / VIIRS",

    windVector: "Not available",

    aiSummary:
      `Thermal detection recorded with ${Number(
        detection.current_frp || 0
      ).toFixed(2)} MW FRP. ` +
      `${detection.active_days_30d || 0} active days were observed within the 30-day temporal window. ` +
      `The industrial-context model assigned a ${(probability * 100).toFixed(1)}% probability of an industrial/persistent source.`,

    radar:
      `${detection.active_days_30d || 0} active days / 30 days`,

    lastSeen:
      detection.acq_date || "Unknown",

    currentFrp:
      Number(detection.current_frp || 0),

    activeDays:
      Number(detection.active_days_30d || 0),

    recentActiveDays:
      Number(detection.recent_active_days_7d || 0),

    probabilityIndustrial:
      probability,

    rawData: detection,
  };
};



const createMarkerIcon = (type, isSelected = false) => {
  const color = typePalette[type] || '#475569'
  const pulse = type === 'red'

  
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div
        class="map-pin ${pulse ? 'pulse' : ''} ${isSelected ? 'selected' : ''}"
        style="--pin-color:${color}; background:${color}; border-color:${color}; color:${color}; box-shadow: ${isSelected ? `0 0 0 6px rgba(15, 23, 42, 0.12), 0 0 0 12px ${color}22` : `0 0 0 4px rgba(255,255,255,0.9)`};"
      >
        <span></span>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  })
}

const telemetryFeed = [
  'MODIS 6.2°C anomaly • Junagadh corridor • 02:14 UTC',
  'VIIRS thermal signature • Surat industrial belt • 02:15 UTC',
  'Wildfire spread estimate • Dang forest fringe • 02:17 UTC',
  'Agricultural burn cluster • Kheda field perimeter • 02:19 UTC',
  'Industrial flare stability • Dahej refinery • 02:21 UTC',
  'Sensor packet synced • Gujarat state grid • 02:23 UTC',
]

function MapFocus({ selectedIncident }) {
  const map = useMap()

  useEffect(() => {
    if (!selectedIncident) return
    map.flyTo([selectedIncident.lat, selectedIncident.lng], 8, {
      duration: 1.1,
    })
  }, [map, selectedIncident])

  return null
}

function App() {


  const [detections, setDetections] = useState([]);
const [loading, setLoading] = useState(true);
const [backendError, setBackendError] = useState(null);

useEffect(() => {
    fetch(`${API_URL}/api/detections`)
        .then((response) => {
            if (!response.ok) {
                throw new Error(
                    `Backend returned ${response.status}`
                );
            }

            return response.json();
        })
        .then((data) => {
            console.log("🔥 Backend detections:", data);

            setDetections(data);
            setLoading(false);
        })
        .catch((error) => {
            console.error(
                "Backend connection failed:",
                error
            );

            setBackendError(error.message);
            setLoading(false);
        });
}, []);

  // ============================================================
  // REAL BACKEND DATA
  // ============================================================

  const liveIncidents = useMemo(() => {

    return detections.map(
      (detection, index) =>
        convertDetectionToIncident(
          detection,
          index
        )
    );

  }, [detections]);

  const [activeFilter, setActiveFilter] = useState('All')
const [selectedIncidentId, setSelectedIncidentId] = useState(null)
  const [activeView, setActiveView] = useState('live')
  const [archiveQuery, setArchiveQuery] = useState('')
  const [archiveFilter, setArchiveFilter] = useState('All')
  const [selectedArchiveRecord, setSelectedArchiveRecord] = useState(null)

  const filteredIncidents = useMemo(() => {

  if (activeFilter === 'All') {
    return liveIncidents
  }

  if (activeFilter === 'High Risk') {
    return liveIncidents.filter(
      (incident) => incident.riskScore === 'High'
    )
  }

  if (activeFilter === 'Industrial / Persistent') {
    return liveIncidents.filter(
      (incident) =>
        incident.category === 'Industrial Flares'
    )
  }

  if (activeFilter === 'Other Thermal') {
    return liveIncidents.filter(
      (incident) =>
        incident.category === 'Other Thermal Sources'
    )
  }

  return liveIncidents

}, [activeFilter, liveIncidents])

  useEffect(() => {

  if (filteredIncidents.length === 0) {
    setSelectedIncidentId(null)
    return
  }

  const exists = filteredIncidents.some(
    (incident) => incident.id === selectedIncidentId
  )

  if (!exists) {
    setSelectedIncidentId(filteredIncidents[0].id)
  }

}, [filteredIncidents, selectedIncidentId])

const selectedIncident =
  liveIncidents.find(
    (incident) => incident.id === selectedIncidentId
  ) ?? liveIncidents[0] ?? incidents[0]

  const filteredArchiveRecords = useMemo(() => {
    const normalizedQuery = archiveQuery.trim().toLowerCase()

    return archiveRecords.filter((record) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        record.location.toLowerCase().includes(normalizedQuery) ||
        record.district.toLowerCase().includes(normalizedQuery) ||
        record.id.toLowerCase().includes(normalizedQuery)

      const matchesFilter =
        archiveFilter === 'All' || record.classification === archiveFilter

      return matchesQuery && matchesFilter
    })
  }, [archiveQuery, archiveFilter])

  const statusClassName = (status) =>
    status
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  useEffect(() => {
    if (!selectedArchiveRecord) return

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setSelectedArchiveRecord(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedArchiveRecord])

  return (


  
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-wrap">
          <div className="brand-mark">
            <Radar size={16} />
          </div>
          <div className="brand-copy">
            <div className="eyebrow">NTRO • SIH 2026</div>
            <h1>Thermal Anomaly Command Console - Gujarat</h1>
          </div>
        </div>
  {loading && (
    <div>Connecting to detection backend...</div>
)}

{backendError && (
    <div>
        Backend error: {backendError}
    </div>
)}

{!loading && !backendError && (
    <div>
        Backend connected — {detections.length} detections loaded.
    </div>
)}
        <div className="header-right">
          <div className="view-toggle" role="tablist" aria-label="Dashboard views">
            <button
              type="button"
              className={`view-tab ${activeView === 'live' ? 'active' : ''}`}
              onClick={() => setActiveView('live')}
            >
              <MapIcon size={14} />
              Live Operational Map
            </button>
            <button
              type="button"
              className={`view-tab ${activeView === 'archive' ? 'active' : ''}`}
              onClick={() => setActiveView('archive')}
            >
              <History size={14} />
              Historical Archive & Logs
            </button>
            <button
              type="button"
              className={`view-tab ${activeView === 'routine' ? 'active' : ''}`}
              onClick={() => setActiveView('routine')}
            >
              <Factory size={14} />
              Routine Industrial Sources
            </button>
          </div>

          <div className="status-cluster">
            <div className="status-pill backend-pill">
              <span className="live-dot" />
              API Gateway: Connected [WebSocket Active]
            </div>
            <div className="status-pill live-pill">
              <span className="live-dot" />
              Live feed
            </div>
            <div className="status-pill muted-pill">
              <Activity size={14} />
              Synced 06s ago • 42ms latency
            </div>
          </div>
        </div>
      </header>

      {activeView === 'live' ? (
        <>
          <div className="telemetry-banner" aria-live="polite">
            <div className="telemetry-track">
              {[...telemetryFeed, ...telemetryFeed].map((packet, index) => (
                <span key={`${packet}-${index}`} className="telemetry-packet">
                  <span className="packet-dot" />
                  {packet}
                </span>
              ))}
            </div>
          </div>

          <main className="dashboard-layout">
            <section className="map-card">
              <div className="toolbar">
                {filterOptions.map((option) => {
                  const isActive = activeFilter === option.label
                  const Icon = option.icon

                  return (
                    <button
                      key={option.label}
                      type="button"
                      className={`filter-btn ${isActive ? 'active' : ''}`}
                      data-accent={option.accent}
                      onClick={() => setActiveFilter(option.label)}
                    >
                      <span className={`filter-dot ${option.accent}`} aria-hidden="true" />
                      {Icon && <Icon size={15} />}
                      {option.label}
                    </button>
                  )
                })}
              </div>

              <div className="map-wrap">
                <MapContainer
                  center={[22.3073, 73.1812]}
                  zoom={8}
                  zoomControl={false}
                  scrollWheelZoom
                  className="map-instance"
                >
                  <TileLayer
                      attribution='&copy; OpenStreetMap contributors'
                       url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                  <MapFocus selectedIncident={selectedIncident} />

                  {filteredIncidents.map((incident) => {
                    const isSelected = incident.id === selectedIncidentId

                    return (
                      <Marker
                        key={incident.id}
                        position={[incident.lat, incident.lng]}
                        icon={createMarkerIcon(incident.type, isSelected)}
                        eventHandlers={{
                          click: () => setSelectedIncidentId(incident.id),
                        }}
                        zIndexOffset={isSelected ? 1000 : 0}
                      />
                    )
                  })}
                </MapContainer>
              </div>
            </section>

            <aside className="inspector-panel">
              <div className="panel-header">
                <div>
                  <p className="panel-kicker">Incident Inspector</p>
                  <h2>AI Analysis</h2>
                </div>
                <button type="button" className="panel-button">
                  <MapPinned size={14} />
                  Map focus
                </button>
              </div>

              <div className="selected-card">
                <div className="selected-meta-row">
                  <span className="status-chip">{selectedIncident.riskScore}</span>
                  <span className="time-badge">{selectedIncident.lastSeen}</span>
                </div>

                <h3>{selectedIncident.title}</h3>

                <div className="details-grid">
                  <div className="detail-item">
                    <span className="label">Detection ID</span>
                    <strong>{selectedIncident.id}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="label">Coordinates</span>
                    <strong>{selectedIncident.coordinates}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="label">Infrastructure</span>
                    <strong>{selectedIncident.infrastructure}</strong>
                  </div>
                  <div className="detail-item">
                    <span className="label">Classification</span>
                    <strong>{selectedIncident.classification}</strong>
                  </div>
                </div>
              </div>

              <div className="ai-card">
                <div className="ai-header">
                  <BrainCircuit size={18} />
                  <span>Random Forest Risk Analysis</span>
                </div>
                <p>{selectedIncident.aiSummary}</p>
              </div>

              <div className="tech-badges">
                <span className="tech-badge">
                  <span className="tech-label">Sensor</span>
                  {selectedIncident.sensor}
                </span>
                <span className="tech-badge">
                  <span className="tech-label">Confidence</span>
                  {selectedIncident.confidence}
                </span>
                <span className="tech-badge">
                  <span className="tech-label">Wind</span>
                  {selectedIncident.windVector}
                </span>
              </div>

              <div className="signal-grid">
                <div className="signal-box">
                  <span className="signal-label">Confidence</span>
                  <strong>{selectedIncident.confidence}</strong>
                </div>
                <div className="signal-box">
                  <span className="signal-label">Radar</span>
                  <strong>{selectedIncident.radar}</strong>
                </div>
              </div>
            </aside>
          </main>
        </>
      ) : activeView === 'archive' ? (
        <section className="archive-shell">
          <div className="archive-header">
            <div>
              <p className="panel-kicker">Historical Archive</p>
              <h2>Thermal Anomaly Logs</h2>
            </div>
            <div className="archive-controls">
              <label className="search-field">
                <Search size={14} />
                <input
                  type="text"
                  value={archiveQuery}
                  onChange={(event) => setArchiveQuery(event.target.value)}
                  placeholder="Search district or detection ID"
                />
              </label>

              <label className="filter-select-wrap">
                <span>Type</span>
                <select
                  value={archiveFilter}
                  onChange={(event) => setArchiveFilter(event.target.value)}
                >
                  {archiveFilters.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="archive-table-wrap">
            <table className="archive-table">
              <thead>
                <tr>
                  <th>Detection ID</th>
                  <th>Location Name</th>
                  <th>Classification Type</th>
                  <th>Timestamp</th>
                  <th>Resolution Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredArchiveRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="archive-row"
                    onClick={() => setSelectedArchiveRecord(record)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelectedArchiveRecord(record)
                      }
                    }}
                    tabIndex={0}
                    role="button"
                  >
                    <td>{record.id}</td>
                    <td>
                      <div className="location-cell">
                        <div className="location-dot" />
                        <span>{record.location}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`type-badge type-${record.classification.toLowerCase().replace(/\s+/g, '-')}`}>
                        {record.classification}
                      </span>
                    </td>
                    <td>{record.timestamp}</td>
                    <td>
                      <span className={`status-badge status-${statusClassName(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedArchiveRecord && (
            <div className="archive-modal-backdrop" onClick={() => setSelectedArchiveRecord(null)}>
              <div className="archive-modal" onClick={(event) => event.stopPropagation()}>
                <div className="archive-modal-header">
                  <div>
                    <p className="panel-kicker">Historical Detail</p>
                    <h3>{selectedArchiveRecord.location}</h3>
                  </div>
                  <button
                    type="button"
                    className="archive-modal-close"
                    onClick={() => setSelectedArchiveRecord(null)}
                    aria-label="Close incident details"
                  >
                    ×
                  </button>
                </div>

                <div className="archive-modal-body">
                  <div className="modal-summary-row">
                    <span className={`type-badge type-${selectedArchiveRecord.classification.toLowerCase().replace(/\s+/g, '-')}`}>
                      {selectedArchiveRecord.classification}
                    </span>
                    <span className={`status-badge status-${statusClassName(selectedArchiveRecord.status)}`}>
                      {selectedArchiveRecord.status}
                    </span>
                  </div>

                  <div className="tech-badges compact-tech-badges">
                    <span className="tech-badge">
                      <span className="tech-label">Sensor</span>
                      {selectedArchiveRecord.sensor}
                    </span>
                    <span className="tech-badge">
                      <span className="tech-label">Confidence</span>
                      {selectedArchiveRecord.confidence}
                    </span>
                    <span className="tech-badge">
                      <span className="tech-label">Wind</span>
                      {selectedArchiveRecord.windVector}
                    </span>
                  </div>

                  <div className="modal-grid">
                    <div className="modal-field">
                      <span className="label">Detection ID</span>
                      <strong>{selectedArchiveRecord.id}</strong>
                    </div>
                    <div className="modal-field">
                      <span className="label">Location Name</span>
                      <strong>{selectedArchiveRecord.location}</strong>
                    </div>
                    <div className="modal-field">
                      <span className="label">District</span>
                      <strong>{selectedArchiveRecord.district}</strong>
                    </div>
                    <div className="modal-field">
                      <span className="label">Coordinates</span>
                      <strong>{selectedArchiveRecord.coordinates}</strong>
                    </div>
                    <div className="modal-field">
                      <span className="label">Latitude</span>
                      <strong>{selectedArchiveRecord.latitude}°N</strong>
                    </div>
                    <div className="modal-field">
                      <span className="label">Longitude</span>
                      <strong>{selectedArchiveRecord.longitude}°E</strong>
                    </div>
                    <div className="modal-field full-width">
                      <span className="label">Classification Type</span>
                      <strong>{selectedArchiveRecord.type}</strong>
                    </div>
                    <div className="modal-field full-width">
                      <span className="label">Occurrence Timestamp</span>
                      <strong>{selectedArchiveRecord.timestamp}</strong>
                    </div>
                    <div className="modal-field full-width">
                      <span className="label">Infrastructure Proximity</span>
                      <strong>{selectedArchiveRecord.infrastructure}</strong>
                    </div>
                  </div>

                  <div className="modal-ai-box">
                    <div className="ai-header">
                      <BrainCircuit size={18} />
                      <span>AI Verification Summary</span>
                    </div>
                    <p>{selectedArchiveRecord.aiSummary}</p>
                  </div>

                  <div className="technical-telemetry">
                    <div className="telemetry-badge">
                      <span className="badge-label">Sensor</span>
                      <strong>{selectedArchiveRecord.sensor}</strong>
                    </div>
                    <div className="telemetry-badge">
                      <span className="badge-label">Wind Vector</span>
                      <strong>{selectedArchiveRecord.windVector}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      ) : (
        <section className="routine-shell">
          <div className="routine-header">
            <div>
              <p className="panel-kicker">Routine Source Classification</p>
              <h2>Routine Industrial Sources</h2>
            </div>
            <div className="routine-summary">
              <div className="metric-pill">
                <span className="metric-label">Routine Flares Monitored</span>
                <strong>{routineSources.length} Active</strong>
              </div>
            </div>
          </div>

          <div className="routine-stats">
            <div className="stat-block">
              <span className="stat-label">Verified Non-Emergency</span>
              <strong>3 / 3</strong>
            </div>
            <div className="stat-block">
              <span className="stat-label">Average Proximity</span>
              <strong>1.3 km</strong>
            </div>
            <div className="stat-block">
              <span className="stat-label">Threshold Stability</span>
              <strong>Within baseline</strong>
            </div>
          </div>

          <div className="routine-grid">
            {routineSources.map((source) => (
              <article key={source.id} className="routine-card">
                <div className="routine-card-header">
                  <span className="routine-type-pill">{source.verificationStatus}</span>
                  <span className="routine-status-dot" />
                </div>

                <h3>{source.location}</h3>
                <p className="routine-subtext">
                  {source.district} • {source.plant}
                </p>

                <dl className="routine-metrics">
                  <div>
                    <dt>Baseline Threshold</dt>
                    <dd>{source.baselineThreshold}</dd>
                  </div>
                  <div>
                    <dt>Industrial Proximity</dt>
                    <dd>{source.proximity}</dd>
                  </div>
                  <div>
                    <dt>Last Scan</dt>
                    <dd>{source.lastScan}</dd>
                  </div>
                  <div>
                    <dt>Signature Stability</dt>
                    <dd>{source.stableSignature}</dd>
                  </div>
                </dl>

                <div className="routine-footer">
                  <span>AI Verification</span>
                  <strong>{source.verificationStatus}</strong>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default App
