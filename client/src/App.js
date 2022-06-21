// App.js
import React, { useEffect } from "react";
import List from "./List"
import "./App.css";


function App() {

  const initialList = [];
  const [list, setList] = React.useState(initialList);

  useEffect(() => {
    (async () => {
      fetch("/table")
        .then((res) => res.json())
        .then((json) => {
          setList(json);
          console.log("result ", json)
        })
        .catch(err => {
          console.log(err)
        })
    })();
  }, []);

  if (list.length === 0) {
    return (
      <div className="App">
        <h1>Block Pro </h1>
        <h2>My Saved Meter Data</h2>
        <p>Loading Table of Meter Data</p>
      </div>
    )
  } else {
    return (
      <div className="App">
        <h1>Block Pro </h1>
        <h2>Testbuchungen von EnergieDock</h2>
        <List>{list}</List>
      </div>
    )
  }
};

export default App;