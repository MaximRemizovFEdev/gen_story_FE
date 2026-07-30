import React from 'react';
import Wizard from '../components/Wizard';
import { PixelBackground } from '../components/PixelBackground/PixelBackground';

function HomePage() {
  return (
    <div className="home-page">
      <PixelBackground />
      <div className="home-page__content container">
        <Wizard />
      </div>
    </div>
  );
}

export default HomePage;
