export const PAGE_WIDTH = 840;
export const PAGE_HEIGHT = 1188;
export const BASE_FONT_SIZE = 24;
export const LINE_HEIGHT = 1.15;
export const PANEL_X = PAGE_WIDTH * 0.065;
export const PANEL_PADDING = 24;
export const PANEL_MAX_HEIGHT = PAGE_HEIGHT * 0.35;
export const PANEL_WIDTH = PAGE_WIDTH - PANEL_X * 2;
export const TEXT_WIDTH = PANEL_WIDTH - PANEL_PADDING * 2;
export const TEXT_MAX_HEIGHT = PANEL_MAX_HEIGHT - PANEL_PADDING * 2;
export const PAGE_STYLE = {
  "--book-page-width": `${PAGE_WIDTH}px`,
  "--book-page-height": `${PAGE_HEIGHT}px`,
  "--book-panel-x": `${PANEL_X}px`,
  "--book-panel-bottom": `${PAGE_HEIGHT * 0.055}px`,
  "--book-panel-width": `${PANEL_WIDTH}px`,
  "--book-panel-padding": `${PANEL_PADDING}px`,
  "--book-text-width": `${TEXT_WIDTH}px`,
};

