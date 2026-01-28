import { Marker } from "@mappedin/react-sdk"

const ZoneGifMarker = ({ space, src, alt = "" }) => {
  if (!space) return null

  return (
    <Marker target={space}>
      {/* We position “top-right of zone” by shifting from the space anchor */}
      <div className="zone-gif-wrap" aria-hidden="true">
        <img className="zone-gif" src={src} alt={alt} draggable={false} />
      </div>
    </Marker>
  )
}
export default ZoneGifMarker
