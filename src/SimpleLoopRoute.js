// SimpleLoopRoute.js
import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import polyline from '@mapbox/polyline';

const API_KEY = "5b3ce3597851110001cf6248878b1c33a5db44088d4dcce7c05f2920";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Compute  destination point given:
 * - start lat/lng
 * - distance in km
 * - bearing in degrees
 * Returns {lat, lng}.
 */
function destinationPoint(lat, lng, distance, bearing) {
  const R = 6371; // Earth radius in km
  const lat1 = toRad(lat);
  const lng1 = toRad(lng);
  const brng = toRad(bearing);
  const dR = distance / R;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(dR) +
      Math.cos(lat1) * Math.sin(dR) * Math.cos(brng)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(dR) * Math.cos(lat1),
      Math.cos(dR) - Math.sin(lat1) * Math.sin(lat2)
    );

  return { lat: lat2 / Math.PI * 180, lng: lng2 / Math.PI * 180 };
}


function ClickHandler({ onClick }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng);
    }
  });
  return null;
}

//main
export default function MultiRoutePicker() {
  const [routeType, setRouteType] = useState("out-and-back"); 
  const [start, setStart] = useState(null);
  const [desiredDistance, setDesiredDistance] = useState(5); // km
  const [candidateRoutes, setCandidateRoutes] = useState([]); // array of {bearing, coords, color}
  const [status, setStatus] = useState("Select a route type, click the map, enter distance, and compute routes.");

  const bearings = [0, 45, 90];
  const colors = ["red", "blue", "green"];

  function handleMapClick(latlng) {
    setStart({ lat: latlng.lat, lng: latlng.lng });
    setCandidateRoutes([]);
    setStatus("Start location set. Now enter a distance and click 'Compute Routes'.");
  }

  async function computeRoutes() {
    if (!start) {
      setStatus("Please click on the map to set a start location first.");
      return;
    }
    if (isNaN(desiredDistance) || desiredDistance <= 0) {
      setStatus("Please enter a positive numeric distance.");
      return;
    }

    setStatus(`Computing ${routeType} routes...`);
    setCandidateRoutes([]);

    try {
      //array of promises, one for each candidate route
      const promises = bearings.map(async (bearing, idx) => {
        if (routeType === "out-and-back") {
          return await fetchOutAndBackRoute(bearing, colors[idx] || "black");
        } else {
          return await fetchLoopRoute(bearing, colors[idx] || "black");
        }
      });

      const results = await Promise.all(promises);
      setCandidateRoutes(results);
      setStatus(`Computed 3 ${routeType} routes successfully.`);
    } catch (err) {
      console.error(err);
      setStatus("Error computing routes: " + err.message);
      setCandidateRoutes([]);
    }
  }

  async function fetchOutAndBackRoute(bearing, color) {
    const halfDistance = desiredDistance / 2;
    const dest = destinationPoint(start.lat, start.lng, halfDistance, bearing);

    // ORS expects [lng, lat]
    const coords = [
      [start.lng, start.lat],
      [dest.lng, dest.lat],
      [start.lng, start.lat]
    ];

    const routeCoords = await fetchORSRoute(coords);
    return { bearing, coords: routeCoords, color };
  }

  //loops: equilateral triangle, with each side = desiredDistance/3
  //can1 = bearing, can2 = bearing+120, pass to ORS
  async function fetchLoopRoute(bearing, color) {
    const side = desiredDistance / 3;
    const candidate1 = destinationPoint(start.lat, start.lng, side, bearing);
    const candidate2 = destinationPoint(start.lat, start.lng, side, bearing + 120);

    const coords = [
      [start.lng, start.lat],
      [candidate1.lng, candidate1.lat],
      [candidate2.lng, candidate2.lat],
      [start.lng, start.lat]
    ];

    const routeCoords = await fetchORSRoute(coords);
    return { bearing, coords: routeCoords, color };
  }

  //uses 'foot-walking' profile. 
  //geometry comes as compressed polyline. returns array of [lat,lng]
  async function fetchORSRoute(coords) {
    const response = await fetch("https://api.openrouteservice.org/v2/directions/foot-walking", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": API_KEY
      },
      body: JSON.stringify({ coordinates: coords })
    });

    if (!response.ok) {
      throw new Error(`ORS request failed: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.routes || !data.routes.length || !data.routes[0].geometry) {
      throw new Error("No route geometry found in ORS response.");
    }

    //compressed
    const encoded = data.routes[0].geometry; 
    const decoded = polyline.decode(encoded); 
    return decoded;
  }

  return (
    <div>
      <h2>Running Route Generator</h2>
      <p>{status}</p>

      {/* route type selector */}
      <label style={{ marginRight: "1rem" }}>
        Route Type:
        <select
          value={routeType}
          onChange={(e) => setRouteType(e.target.value)}
          style={{ marginLeft: "0.5rem" }}
        >
          <option value="out-and-back">Out-and-Back</option>
          <option value="loop">Loop</option>
        </select>
      </label>

      {/* distance input */}
      <label>
        Desired Distance (km):
        <input
          type="number"
          value={isNaN(desiredDistance) ? "" : desiredDistance}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            setDesiredDistance(isNaN(val) ? 0 : val);
          }}
          style={{ marginLeft: "0.5rem", width: "4rem" }}
        />
      </label>

      <button onClick={computeRoutes} style={{ marginLeft: "1rem" }}>
        Compute Routes
      </button>

      {/* the map */}
      <MapContainer
        center={start ? [start.lat, start.lng] : [40.7128, -74.0060]} // default NYC
        zoom={14}
        style={{ height: 500, width: "100%", marginTop: "1rem" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <ClickHandler onClick={handleMapClick} />

        {start && <Marker position={[start.lat, start.lng]} />}

        {/* render each route */}
        {candidateRoutes.map((r, idx) => (
          <Polyline key={idx} positions={r.coords} color={r.color} />
        ))}
      </MapContainer>

      {candidateRoutes.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <h3>Candidate Routes:</h3>
          <ul>
            {candidateRoutes.map((r, idx) => (
              <li key={idx}>
                Bearing: {r.bearing}°, Color: {r.color}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
