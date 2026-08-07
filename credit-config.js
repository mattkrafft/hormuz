"use strict";

// Slow campaign progression by reducing all gameplay credit rewards to roughly one-third.
const originalAddCredits = addCredits;
addCredits = function(amount){
  const reduced = Math.max(1, Math.round(amount / 3));
  originalAddCredits(reduced);
};
