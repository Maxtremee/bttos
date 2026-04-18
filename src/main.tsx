import { render } from "solid-js/web";
import "./styles/global.css";
import { initSpatialNav } from "./navigation";
import App from "./App";

initSpatialNav();

render(() => <App />, document.getElementById("root")!);
