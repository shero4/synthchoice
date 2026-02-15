/**
 * Shared sprite generation prompt for LLM image models.
 * Used by API routes and server actions for consistent output.
 */
export const SPRITE_PROMPT = `
You are a skilled pixel artist creating game collectible sprites (like Mario coins or Pokemon items).

**GOAL:** Create a single 256x256px sprite sheet containing 4 animation frames in a 2x2 grid.

**SUBJECT:**
- Use the attached logo/image as reference
- Create a recognizable pixel-art icon version
- Style it like a 3D game collectible (e.g., Mario coin)

**SPRITE SHEET STRUCTURE (CRITICAL):**
- **Total canvas size:** 256x256 pixels (this is your entire working area)
- **Grid layout:** 2 columns x 2 rows = 4 frames
- **Each frame size:** 128x128 pixels (256÷2 = 128)
- **NO borders, NO gaps, NO padding** - frames are edge-to-edge
- **WHITE (#ffffff) background** outside the circular icon

**EXACT FRAME POSITIONS:**
Frame 1: X=0,   Y=0   (top-left)     | Frame 2: X=128, Y=0   (top-right)
Frame 3: X=0,   Y=128 (bottom-left)  | Frame 4: X=128, Y=128 (bottom-right)

**ICON SHAPE & POSITIONING (CRITICAL):**
- **The icon MUST be circular** (perfect circle or coin-like disc)
- **The icon MUST be horizontally centered** in each 128x128 frame (X = 64px from left edge)
- **Vertical centering varies by animation** (see below), but the icon's horizontal position is ALWAYS X=64px
- The circular icon should be approximately 80-100px in diameter to fit well within the 128x128 frame

**ANIMATION SEQUENCE (bobbing/floating loop):**

- **Frame 1 (top-left):** 
  - Circular icon centered at X=64px, Y=64px (perfect center)
  
- **Frame 2 (top-right):** 
  - Circular icon centered at X=64px, Y=58-60px (moved UP 4-6 pixels)
  - Slight vertical squash (compressed by ~5%)
  - Add 2-3 small golden sparkle stars near top-right of the icon
  
- **Frame 3 (bottom-left):** 
  - Circular icon centered at X=64px, Y=64px (identical to Frame 1)
  
- **Frame 4 (bottom-right):** 
  - Circular icon centered at X=64px, Y=68-70px (moved DOWN 4-6 pixels)
  - Slight vertical stretch (elongated by ~5%)

**EACH FRAME MUST CONTAIN:**
- A **circular coin-like icon** with the logo/design inside
- **Bold dark outline** around the circular edge
- **Complementary background color** inside the circle
- **Small elliptical shadow** directly below the icon:
  - Shadow shrinks when icon moves up (Frame 2)
  - Shadow grows when icon moves down (Frame 4)
  - Shadow always centered at X=64px
- **NO extra borders, backgrounds, padding, or decorative elements** beyond the circular icon itself

**CENTERING RULE:**
- Think of each 128x128 frame as having a center point at (64, 64)
- The circular icon's center point MUST align with X=64 in ALL frames
- Only the Y-coordinate changes for the bobbing animation

**STYLE REQUIREMENTS:**
- Clean pixel art with sharp edges
- Limited palette: 16-32 colors maximum
- #ffffff (white) background outside the circular icon
- Visible and readable at 1x scale
- The icon should look like a collectible game coin

**OUTPUT REQUIREMENTS:**
- Return ONLY a single 256x256px PNG sprite sheet
- NO text, NO labels, NO frame dividers, NO mockups
- NO extra spacing or margins beyond the 256x256 canvas
- The 4 frames should tile perfectly when divided into 128x128 quadrants
- Each circular icon must be precisely centered horizontally in its frame

**CRITICAL:** 
- Do not add decorative borders, frame numbers, or guides
- The circular icon must be centered in each frame (X=64px always)
- Only vertical position (Y) changes for animation
- Output must be game-ready and directly usable by slicing into 128x128 tiles
`;
