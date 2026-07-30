import { useState } from "react";
import "./PixelBackground.css";

const ICON_PATTERNS = {
  heart: [
    "01100110",
    "11111111",
    "11111111",
    "01111110",
    "00111100",
    "00011000",
  ],
  star: [
    "0001000",
    "0001000",
    "1111111",
    "0111110",
    "0011100",
    "0101010",
    "1000001",
  ],
  smile: [
    "00111100",
    "01000010",
    "10100101",
    "10000001",
    "10100101",
    "10011001",
    "01000010",
    "00111100",
  ],
  bone: [
    "110000011",
    "110000110",
    "011111100",
    "001111100",
    "001111110",
    "011000011",
    "110000011",
  ],
  cat: [
    "110000011",
    "111000111",
    "101111101",
    "100000001",
    "101010101",
    "100010001",
    "101101101",
    "010000010",
    "001111100",
  ],
  snowflake: [
    "1001001",
    "0101010",
    "0011100",
    "1111111",
    "0011100",
    "0101010",
    "1001001",
  ],
  sun: [
    "1001001001",
    "0101001010",
    "0011111100",
    "0110000110",
    "1110000111",
    "0110000110",
    "0011111100",
    "0101001010",
    "1001001001",
  ],
};

const ICON_NAMES = Object.keys(ICON_PATTERNS);
const PIXEL_SIZE = 3;
const ICON_COUNT = 18;

const getRandomItem = (items) =>
  items[Math.floor(Math.random() * items.length)];

const createIcons = () =>
  Array.from({ length: ICON_COUNT }, (_, id) => ({
    id,
    name: getRandomItem(ICON_NAMES),
    left: Math.random() * 100,
    top: Math.random() * 100,
    delay: Math.random() * 3,
  }));

const getPixels = (pattern) => {
  const patternWidth = Math.max(...pattern.map((row) => row.length));
  const offsetX = (50 - patternWidth * PIXEL_SIZE) / 2;
  const offsetY = (50 - pattern.length * PIXEL_SIZE) / 2;

  return pattern.flatMap((row, rowIndex) =>
    [...row].flatMap((pixel, columnIndex) =>
      pixel === "1"
        ? [{
            x: offsetX + columnIndex * PIXEL_SIZE,
            y: offsetY + rowIndex * PIXEL_SIZE,
          }]
        : [],
    ),
  );
};

export const PixelBackground = () => {
  const [icons] = useState(createIcons);

  return (
    <div className="pixel-background" aria-hidden="true">
      {icons.map((icon) => {
        const pixels = getPixels(ICON_PATTERNS[icon.name]);

        return (
          <div
            className="pixel-background__icon"
            key={icon.id}
            style={{
              left: `clamp(0px, calc(${icon.left}% - 25px), calc(100% - 50px))`,
              top: `clamp(0px, calc(${icon.top}% - 25px), calc(100% - 50px))`,
              "--icon-delay": `${icon.delay}s`,
            }}
          >
            {pixels.map((pixel, pixelIndex) => (
              <span
                className="pixel-background__pixel"
                key={`${pixel.x}-${pixel.y}`}
                style={{
                  left: `${pixel.x}px`,
                  top: `${pixel.y}px`,
                  "--pixel-order": pixelIndex,
                }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
};
