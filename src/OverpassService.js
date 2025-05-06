// OverpassService.js
import { dijkstra } from './dijkstra';

/**
 * Fetch OSM data from Overpass API within a bounding box.
 * @param {Object} bbox - { minLat, minLon, maxLat, maxLon }
 * @returns {Object} - JSON from Overpass
 */
export async function fetchOSMData(bbox) {
  const query = `
    [out:json];
    way
      ["highway"~"footway|cycleway|path|pedestrian"]
      (${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon});
    (._;>;);
    out;
  `;
  const url = 'https://overpass-api.de/api/interpreter';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: query
  });
  if (!response.ok) {
    throw new Error(`Overpass request failed: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Builds graph from OSM JSON data.
 * Returns an object with:
 *  - nodes: {nodeId: {lat, lon}}
 *  - graph: {nodeId: [{node, weight}, ...]}
 */
export function buildGraphFromOSM(osmData) {
  const nodes = {};
  const graph = {};

  // get nodes
  osmData.elements.forEach(el => {
    if (el.type === 'node') {
      nodes[el.id] = { lat: el.lat, lon: el.lon };
      graph[el.id] = [];
    }
  });

  // build edges
  osmData.elements.forEach(el => {
    if (el.type === 'way' && el.nodes) {
      const wayNodes = el.nodes;
      for (let i = 0; i < wayNodes.length - 1; i++) {
        const n1 = wayNodes[i];
        const n2 = wayNodes[i + 1];
        if (nodes[n1] && nodes[n2]) {
          const dist = haversineDistance(nodes[n1], nodes[n2]);
          graph[n1].push({ node: n2, weight: dist });
          graph[n2].push({ node: n1, weight: dist });
        }
      }
    }
  });
  return { nodes, graph };
}

//haversine distance in km
function haversineDistance(a, b) {
  const R = 6371; // Earth radius in km
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const c = 2 * Math.atan2(
    Math.sqrt(sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon),
    Math.sqrt(1 - sinDLat * sinDLat - Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon)
  );
  return R * c;
}
function toRad(deg) {
  return deg * (Math.PI / 180);
}

//find nearest node
export function findNearestNode(lat, lon, nodes) {
  let nearestId = null;
  let minDist = Infinity;
  for (const [id, node] of Object.entries(nodes)) {
    const dist = haversineDistance({ lat, lon }, node);
    if (dist < minDist) {
      minDist = dist;
      nearestId = id;
    }
  }
  return nearestId;
}
