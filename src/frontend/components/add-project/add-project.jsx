import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

function AddProject() {
  const navigateTo = useNavigate();
  let nav;

  const [projectPath, setProjectPath] = useState();
  const [projectName, setProjectName] = useState();
  const [projectData, setProjectData] = useState([]);

  const openFileExplorer = async () => {
    const response = await window.nodeFunctions.getFilePath();
    console.log(response);
    setProjectPath(response);
  };

  const getData = async () => {
    const dbData = await window.nodeFunctions.getStoredProjects();
    console.log(dbData);
    setProjectData(dbData);
  };

  useEffect(() => {
    getData();
  }, []);

  useEffect(() => {
    storeData((nav = false));
  }, [projectData]);

  const formSubmitHandler = async (e) => {
    e.preventDefault();
    if (projectPath) {
      console.log(`project path is not empty`);
      console.log(projectName, projectPath);

      setProjectData((projectData) => [
        ...projectData,
        {
          projectName: projectName,
          projectPath,
          projectState: false,
          updateDate: new Date().toISOString().substring(0, 10),
          projectUpdatedToday: false,
        },
      ]);

      storeData((nav = true));
    } else {
      console.log(`project path is empty`);
    }

    //navigateTo("/");
  };

  const storeData = async (navigation) => {
    const response = await window.nodeFunctions.storeProjectData(projectData);
    if (response && navigation) {
      navigateTo("/");
      console.log(navigation, response);
    }
  };

  return (
    <div className="add-project__container">
      <h3 className="add-project__header">Enter Project Details</h3>
      <form
        className="add-project__form"
        onSubmit={(event) => formSubmitHandler(event)}
      >
        <input
          className="add-project__form-project-name"
          type="text"
          placeholder="Enter Project Name"
          onChange={(e) => setProjectName(e.target.value)}
          required
        />

        {projectPath ? (
          <span>{projectPath}</span>
        ) : (
          <span>Project Directory Not Selected</span>
        )}
        <button
          type="button"
          className="add-project__form-file-path"
          onClick={() => openFileExplorer()}
        >
          Select File Path
        </button>

        <Link to="/">
          <button>Cancel</button>
        </Link>
        <button type="submit">Submit</button>
      </form>
    </div>
  );
}

export default AddProject;
