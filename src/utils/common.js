import { fromJS, is } from "immutable"

export function ArrayEqual(left, right) {
  return is(fromJS(left), fromJS(right))
}
// turn a clicked Space or POI into a routable { latitude, longitude, floorId }
const getNavCoordFromFeature = (feature) => {
  if (!feature) return null

  // POI-style (point-of-interest)
  // usually has .coordinate { latitude, longitude, floorId } AND .floor
  if (feature.coordinate?.latitude && feature.coordinate?.longitude) {
    return {
      latitude: feature.coordinate.latitude,
      longitude: feature.coordinate.longitude,
      floorId:
        feature.coordinate.floorId ||
        feature.floor?.id || // backup
        feature.floorId,
    }
  }

  // forr spaces..
  // usually has .center { latitude, longitude, floorId }
  if (feature.center?.latitude && feature.center?.longitude) {
    return {
      latitude: feature.center.latitude,
      longitude: feature.center.longitude,
      floorId: feature.center.floorId || feature.floor?.id || feature.floorId,
    }
  }

  console.warn("No usable nav coord for feature:", feature)
  return null
}
