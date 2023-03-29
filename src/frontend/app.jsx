import React from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import AddProject from "./components/add-project/add-project.jsx";
import Home from "./components/home/home.jsx";
import ProjectsList from "./components/projects-list/projects-list.jsx";

function App() {
  return (
    <Router>
      <Routes>
        <Route exact path="/" element={<Home />}>
          <Route index element={<ProjectsList />}></Route>

          <Route path="add-project" element={<AddProject />}></Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
