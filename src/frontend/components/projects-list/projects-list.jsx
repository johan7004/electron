import React, { useState, useEffect } from "react";
import AutomationLog from "../autmation-log/automationLog.jsx";

function ProjectsList() {
  const [projectData, setProjectData] = useState();
  const [downloaderInfo, setDownloaderInfo] = useState("");

  const setActiveProject = async (e, key) => {
    e.preventDefault();

    const updatedData = [...projectData];
    //updatedData[key].projectState = true;

    updatedData.forEach((data, index) => {
      if (index !== key) {
        data.projectState = false;
      } else {
        data.projectState = true;
      }
    });

    setProjectData(updatedData);
    updateData();
  };

  const updateData = async () => {
    console.log(projectData);
    console.log(`projectData`);
    try {
      const response = await window.nodeFunctions.storeProjectData(projectData);
      if (response) {
        console.log(response);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const removeProject = async (e, key) => {
    const updatedData = [...projectData];
    const newData = updatedData.filter((element, index) => {
      if (index !== key) {
        return element;
      }
    });

    console.log(newData);
    setProjectData(newData);
  };

  const getData = async (updateMode) => {
    if (updateMode === "before-download") {
      const dbData = await window.nodeFunctions.getStoredProjects();
      console.log(dbData);
      setProjectData(dbData);
      const downloaderTest = await window.nodeFunctions.dateUpdater([
        {
          updateType: "before-download",
          updatePath: "no-path",
          completeProjectData: dbData,
        },
      ]);
      setDownloaderInfo(downloaderTest);
    }
    if(updateMode === "manual-download"){
      const dbData = await window.nodeFunctions.getStoredProjects();
      console.log(dbData);
      setProjectData(dbData);
      const downloaderTest = await window.nodeFunctions.dateUpdater([
        {
          updateType: "manual-download",
          updatePath: "no-path",
          completeProjectData: dbData,
        },
      ]);
      setDownloaderInfo(downloaderTest);
    }
  };

  useEffect(() => {
    getData('before-download');
  }, []);

  const manualUpdateRunner = async () => {
    getData('manual-download')
  };

  useEffect(() => {
    updateData();
  }, [projectData]);

  return (
    <div className="project__main-container">
      <div className="project-list__container">
        <h3>List Of Projects</h3>

        {projectData && projectData.length ? (
          projectData.map((data, i) => {
            const projectName = data.projectName;
            const projectPath = data.projectPath;
            const projectState = data.projectState;
            const updateDate = data.updateDate;

            return (
              <div key={i} className="project__container">
                <div className="project__header">
                  <h4>{projectName}</h4>

                  {!projectState.length && !projectState ? (
                    <div>
                      <button
                        type="button"
                        onClick={(e) => setActiveProject(e, i)}
                        className="project__toggle"
                      >
                        Set As Active
                      </button>
                    </div>
                  ) : (
                    <div>
                      <button className="project__toggle project__toggle--disabled">
                        Set As Active
                      </button>
                      <button
                        className="project__toggle"
                        onClick={manualUpdateRunner}
                      >
                        Run Manually
                      </button>
                    </div>
                  )}
                </div>
                <div className="project__status">
                  {!projectState ? (
                    <span className="project__status--not-active">
                      Not Active
                    </span>
                  ) : (
                    <span className="project__status--active">Active</span>
                  )}

                  <span className="project__update">
                    Updated On: {updateDate}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => removeProject(e, i)}
                    className="project__remove-button"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <span>Add New Projects</span>
        )}
      </div>
      <div className="automation-log__container">
        <AutomationLog />
      </div>
    </div>
  );
}

export default ProjectsList;
