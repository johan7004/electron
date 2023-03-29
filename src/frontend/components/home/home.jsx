import React, { useState } from "react";

import { Link, Outlet } from "react-router-dom";
import Footer from "../footer/footer.jsx";

function Home() {
  return (
    <>
      <div className="header__container">
        <h1>Welcome To DB-Grabber</h1>
        <span>powered by passion to build something</span>
      </div>
      <div className="add-projects__container">
        <Link to="add-project">
          <button className="add-projects__button">Add New Project +</button>
        </Link>
      </div>

      <Outlet />
      <Footer />
    </>
  );
}

export default Home;
