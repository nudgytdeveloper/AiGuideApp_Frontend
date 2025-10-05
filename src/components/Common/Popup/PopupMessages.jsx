import { Error, Success } from "@nrs/constants/PopupType"
import { closePopup } from "@nrs/slices/commonSlice"
import { ArrayEqual } from "@nrs/utils/common"
import React, { useCallback } from "react"
import { useDispatch } from "react-redux"
import { useSelector } from "react-redux"

const PopupMessages = () => {
  const [message, errorCode] = useSelector((state) => {
      return [state.common.get("message"), state.common.get("errorCode")]
    }, ArrayEqual),
    dispatch = useDispatch()

  const onClose = useCallback(() => {
    dispatch(closePopup({ popupType: errorCode ? Error : Success }))
    // TODO: log out session and redirect back to home page
  }, [])

  return (
    <div className="popup-overlay">
      <div className="popup-box">
        <p className="popup-message">{message}</p>
        <button className="popup-button" onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  )
}

export default PopupMessages
