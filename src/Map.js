// Map.js
import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});

// ClickHandler to capture map clicks
function ClickHandler({ onClick }) {
    useMapEvents({
        click(e) {
            onClick(e.latlng);
        }
    });
    return null;
}

const Map = () => {
    const [startLocation, setStartLocation] = useState([40.7128, -74.0060]); // NYC as default
    const [distance, setDistance] = useState('');
    const [routeType, setRouteType] = useState('out-and-back');
    const [elevation, setElevation] = useState('any');

    const handleClick = (location) => {
        setStartLocation([location.lat, location.lng]);
        console.log('Selected Starting Location:', location);
    };

    const handleProceed = () => {
        console.log('Proceeding with options:');
        console.log('Start Location:', startLocation);
        console.log('Distance:', distance);
        console.log('Route Type:', routeType);
        console.log('Elevation:', elevation);
    };

    return (
        <div>
            <h2>Select Your Starting Location</h2>
            <p>Click on the map to choose your starting location.</p>
            <MapContainer
                center={startLocation}
                zoom={13}
                style={{ height: "600px", width: "100%" }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                />
                <ClickHandler onClick={handleClick} />
                <Marker position={startLocation}>
                    <Popup>
                        Selected Starting Point<br />
                        Lat: {startLocation[0].toFixed(4)}<br />
                        Lng: {startLocation[1].toFixed(4)}
                    </Popup>
                </Marker>
            </MapContainer>

            <div style={{ marginTop: '1rem' }}>
                <h3>Route Options</h3>
                <label>Distance (miles):</label>
                <input
                    type="number"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    placeholder="e.g., 5"
                    style={{ margin: '0.5rem', padding: '0.3rem', width: '80px' }}
                />

                <label>Route Type:</label>
                <select
                    value={routeType}
                    onChange={(e) => setRouteType(e.target.value)}
                    style={{ margin: '0.5rem', padding: '0.3rem' }}
                >
                    <option value="out-and-back">Out and Back</option>
                    <option value="loop">Loop</option>
                </select>

                <label>Elevation Preference:</label>
                <select
                    value={elevation}
                    onChange={(e) => setElevation(e.target.value)}
                    style={{ margin: '0.5rem', padding: '0.3rem' }}
                >
                    <option value="any">Any</option>
                    <option value="flat">Flat</option>
                    <option value="hilly">Hilly</option>
                </select>

                <button onClick={handleProceed} style={{ margin: '0.5rem', padding: '0.5rem' }}>
                    Proceed
                </button>
            </div>
        </div>
    );
};

export default Map;
