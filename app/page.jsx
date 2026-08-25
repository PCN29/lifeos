"use client";
import React from "react";
import LifeOS from "../components/LifeOS";

/* No login. One fixed row, shared by every device that opens the URL. */
export default function Page() {
  return <LifeOS user={{ id: "solo" }} />;
}
