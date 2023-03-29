import React from "react";

function Footer() {
  return (
    <div className="footer__container">
      <span className="footer__notes">
        ** You can only have one Project at a time for automation as Docker can
        only one Project in free version**
      </span>
      <span className="footer__notes">
        ** if you have any issues please report at
        <a href="mailto:johan.stephenraj@globaldata.com">
          <span> &nbsp; johan.stephenraj@globaldata.com</span>
        </a>
        **
      </span>
    </div>
  );
}

export default Footer;
