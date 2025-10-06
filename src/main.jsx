import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App.jsx"
import "./styles/responsive.css"
import "./App.css" // separate CSS file for styling
import { Provider } from "react-redux"
import store from "@nrs/store.js"
import "./inline.js"

ReactDOM.createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <App />
  </Provider>
)
