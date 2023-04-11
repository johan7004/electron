import React, { useState } from "react";

function AutomationLog() {
  const [currentProcess, setCurrentProcess] = useState();
  function recievedData() {
    window.nodeFunctions.sendDataToReact((event, arg) => {
      setCurrentProcess( arg);
    });
  }
  recievedData();

  return (
    <div className="automation-log__container-inner">
      <h3 className="automation-log__header">Current Automation Process</h3>

      {currentProcess && !currentProcess.length ? (
        <div>No current Running Process</div>
      ) : (
        <div>
          {currentProcess}
        </div>
      )}
    </div>
  );
}

export default AutomationLog;
