import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.jsx"
import "./styles/responsive.css"
import "./App.css" // separate CSS file for styling
import { Provider } from "react-redux"
import store from "@nrs/store.js"
import "./inline.js"
import { tfReady } from "@nrs/utils/tf-init" // runs immediately

// 2) after TF is ready, dynamically import App (so nothing pulls TFJS/CV before init)
tfReady
  .then(() => import("./App"))
  .then(({ default: App }) => {
    ReactDOM.createRoot(document.getElementById("root")).render(
      <Provider store={store}>
        <App />
      </Provider>
    )
  })
  .catch((e) => {
    console.error("[bootstrap] failed:", e)
    // Optional: render a minimal fatal screen
    const Div = () => (
      <div style={{ padding: 20, fontFamily: "system-ui" }}>
        Startup error: {String(e)}
      </div>
    )
    ReactDOM.createRoot(document.getElementById("root")).render(<Div />)
  })

// ReactDOM.createRoot(document.getElementById("root")).render(
//   <Provider store={store}>
//     <App />
//   </Provider>
// )
