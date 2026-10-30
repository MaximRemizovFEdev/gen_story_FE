import React from "react";

export const Chevron = ({ expanded }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d={expanded ? "m6 9 6 6 6-6" : "m6 15 6-6 6 6"} /></svg>
);

