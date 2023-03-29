import React from "react";

function AutomationLog({ currentRunningStatus, currentProcess }) {
  return (
    <div className="automation-log__container">
      <h3 className="automation-log__header">Current Automation Process</h3>

      {!currentRunningStatus ? (
        <div>No current Running Process</div>
      ) : (
        <div>{currentProcess}</div>
      )}
    </div>
  );
}

export default AutomationLog;
