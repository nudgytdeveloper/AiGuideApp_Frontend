import React from "react"
import { useSelector } from "react-redux"
import { ArrayEqual } from "@nrs/utils/common"
import { Error, Success } from "@nrs/constants/PopupType"
import PopupMessages from "@nrs/components/Common/Popup/PopupMessages"

const PopupDialog = () => {
  // pageType is used for switch between Ai chat, exihibit detection & navigation page
  const [popUpList, pageType] = useSelector((state) => {
    const commonState = state.common
    return [commonState.get("popUp"), commonState.get("selectedPageType")]
  }, ArrayEqual)

  console.debug("pop up list: ", popUpList)

  // Add more popup type here, for setting page / notification which supposed to be pop up as well instead of a page
  return (
    <>
      {popUpList.some((p) => [Error, Success].includes(p)) ? (
        <PopupMessages />
      ) : null}
    </>
  )
}

export default PopupDialog
