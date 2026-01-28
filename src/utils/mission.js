export function norm(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
}

/**
 * Extract polygons from GeoJSON (Polygon | MultiPolygon | Feature | FeatureCollection)
 * Returns: Array of polygons, each polygon = Array of rings, ring = Array<[lng,lat]>
 */
function extractPolygons(geojson) {
  if (!geojson) return []
  const feats =
    geojson.type === "FeatureCollection"
      ? geojson.features || []
      : geojson.type === "Feature"
        ? [geojson]
        : geojson.type && geojson.coordinates
          ? [{ type: "Feature", properties: {}, geometry: geojson }]
          : []

  const polys = []
  for (const f of feats) {
    const g = f?.geometry
    if (!g) continue

    if (g.type === "Polygon") {
      polys.push(g.coordinates) // [ring1, ring2...]
    } else if (g.type === "MultiPolygon") {
      for (const poly of g.coordinates) polys.push(poly)
    }
  }
  return polys
}

/** Ray-casting point-in-ring. ring is Array<[lng,lat]> */
function pointInRing(lng, lat, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0],
      yi = ring[i][1]
    const xj = ring[j][0],
      yj = ring[j][1]

    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 0.0) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/**
 * Point in polygon with holes:
 * - inside outer ring
 * - NOT inside any hole rings
 */
function pointInPolygon(lng, lat, polygonRings) {
  if (!polygonRings?.length) return false
  const outer = polygonRings[0]
  if (!pointInRing(lng, lat, outer)) return false
  for (let h = 1; h < polygonRings.length; h++) {
    if (pointInRing(lng, lat, polygonRings[h])) return false
  }
  return true
}

export function pointInAnyGeoJSON(lng, lat, geojson) {
  const polys = extractPolygons(geojson)
  for (const polyRings of polys) {
    if (pointInPolygon(lng, lat, polyRings)) return true
  }
  return false
}

// haptics helpers
const canVibrate =
  typeof navigator !== "undefined" && typeof navigator.vibrate === "function"
export function vibrate(pattern) {
  try {
    if (canVibrate) navigator.vibrate(pattern)
  } catch {}
}
