# ⚽️ Tactics Board Pro

A full-stack, broadcast-grade tactical analysis and animation tool for football (soccer) coaches and analysts. Build complex tactical routines frame-by-frame, preview them with a smooth animation engine, and export them as high-fidelity video clips with TV-style broadcast graphics.

## ✨ Features

* **Interactive Tactics Board:** Drag and drop players, switch between standard formations (4-3-3, 3-5-2, etc.), and draw tactical runs or passes.
* **Curved Pass Engine:** Toggle between straight passes and dynamic Bezier-curved passes to simulate crosses and through-balls.
* **Timeline & Animation Engine:** Capture frame-by-frame snapshots of your plays. The custom interpolation engine smoothly animates player and ball movements between frames.
* **Scrubber Integration:** A YouTube-style timeline scrubber allows you to manually drag back and forth through your animation in micro-milliseconds.
* **Broadcast-Grade Scoreboard:** Dynamic TV-style overlay that supports custom team names, multi-line goalscorer inputs, and automatically adjusts text contrast based on the custom hex colors you pick for your teams.
* **High-Res Video Export:** Built-in screen recording captures your canvas at 60FPS and exports it directly to your device as a `.webm` video.
* **Cloud Database Sync:** Fully integrated with Google Firebase Firestore to save, load, and manage your tactical library from anywhere.

## 🚀 How to Use It

1. **Set the Stage:** Select formations and custom kit colors for the RED and BLU teams.
2. **Frame 1 (The Setup):** Position your players where the play begins. Click **"🎞️ Capture Frame"**.
3. **Frame 2 (The Action):** Move the ball and players to their next positions. Draw arrows to indicate runs or passes. Click **"🎞️ Capture Frame"** again.
4. **Animate:** Click **"▶️ PLAY ANIMATION"** to watch the engine magically transition your players from Frame 1 to Frame 2. Use the Scrubber slider to rewind and review the movement.
5. **Add Broadcast Graphics:** Open the Scoreboard Editor, toggle "Show Overlay," and type in the score and goalscorers to add a professional TV graphic to the bottom of the pitch.
6. **Save Your Work:** Export the animation as a video, or save the raw data to your Cloud Tactics Library so you can edit it later!

## 🛠️ Tech Stack

* **Frontend:** React, Vite
* **Canvas API:** React-Konva (for high-performance 2D rendering)
* **Backend/Database:** Google Firebase (Firestore)
* **Styling:** Custom CSS with dynamic UI accordions

## 💻 Local Setup Instructions

If you want to run this project on your local machine:

1. Clone the repository:
   ```bash
   git clone [https://github.com/YOUR_USERNAME/tactics-board-pro.git](https://github.com/YOUR_USERNAME/tactics-board-pro.git)
