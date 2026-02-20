import { useState, useRef, useEffect } from 'react'; 
import { Stage, Layer, Rect, Circle, Line, Group, Text, Arrow, Path } from 'react-konva';
// --- NEW: Firebase Database Imports ---
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase'; 
import './index.css';

// --- MATH HELPERS FOR CURVED BALL PATHS ---
const getControlPoint = (p0, p1, offset = 60) => {
  if (!p0 || !p1) return { x: 400, y: 250 }; 
  const midX = (p0.x + p1.x) / 2;
  const midY = (p0.y + p1.y) / 2;
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return p0;
  const nx = -dy / dist;
  const ny = dx / dist;
  return { x: midX + nx * offset, y: midY + ny * offset };
};

const getBezierPoint = (p0, p1, cp, t) => {
  if (!p0 || !p1 || !cp) return { x: 400, y: 250 }; 
  const x = Math.pow(1 - t, 2) * p0.x + 2 * (1 - t) * t * cp.x + Math.pow(t, 2) * p1.x;
  const y = Math.pow(1 - t, 2) * p0.y + 2 * (1 - t) * t * cp.y + Math.pow(t, 2) * p1.y;
  return { x, y };
};

const getContrastColor = (hexColor) => {
  if (!hexColor) return '#ffffff';
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#000000' : '#ffffff';
};

// --- THE DICTIONARIES ---
const RED_FORMATIONS = {
  '4-3-3': [ { id: 'r1', number: 1, x: 50, y: 250 }, { id: 'r2', number: 2, x: 150, y: 100 }, { id: 'r3', number: 3, x: 130, y: 200 }, { id: 'r4', number: 4, x: 130, y: 300 }, { id: 'r5', number: 5, x: 150, y: 400 }, { id: 'r6', number: 6, x: 250, y: 200 }, { id: 'r7', number: 8, x: 250, y: 300 }, { id: 'r8', number: 10, x: 280, y: 250 }, { id: 'r9', number: 11, x: 350, y: 150 }, { id: 'r10', number: 7, x: 350, y: 350 }, { id: 'r11', number: 9, x: 400, y: 250 } ],
  '4-4-2': [ { id: 'r1', number: 1, x: 50, y: 250 }, { id: 'r2', number: 2, x: 150, y: 100 }, { id: 'r3', number: 3, x: 130, y: 200 }, { id: 'r4', number: 4, x: 130, y: 300 }, { id: 'r5', number: 5, x: 150, y: 400 }, { id: 'r6', number: 11, x: 250, y: 100 }, { id: 'r7', number: 8, x: 230, y: 200 }, { id: 'r8', number: 6, x: 230, y: 300 }, { id: 'r9', number: 7, x: 250, y: 400 }, { id: 'r10', number: 9, x: 350, y: 200 }, { id: 'r11', number: 10, x: 350, y: 300 } ],
  '4-2-3-1': [ { id: 'r1', number: 1, x: 50, y: 250 }, { id: 'r2', number: 2, x: 150, y: 100 }, { id: 'r3', number: 3, x: 130, y: 200 }, { id: 'r4', number: 4, x: 130, y: 300 }, { id: 'r5', number: 5, x: 150, y: 400 }, { id: 'r6', number: 6, x: 200, y: 180 }, { id: 'r7', number: 8, x: 200, y: 320 }, { id: 'r8', number: 11, x: 280, y: 120 }, { id: 'r9', number: 10, x: 260, y: 250 }, { id: 'r10', number: 7, x: 280, y: 380 }, { id: 'r11', number: 9, x: 350, y: 250 } ],
  '4-1-4-1': [ { id: 'r1', number: 1, x: 50, y: 250 }, { id: 'r2', number: 2, x: 150, y: 100 }, { id: 'r3', number: 3, x: 130, y: 200 }, { id: 'r4', number: 4, x: 130, y: 300 }, { id: 'r5', number: 5, x: 150, y: 400 }, { id: 'r6', number: 6, x: 200, y: 250 }, { id: 'r7', number: 11, x: 270, y: 100 }, { id: 'r8', number: 8, x: 250, y: 200 }, { id: 'r9', number: 10, x: 250, y: 300 }, { id: 'r10', number: 7, x: 270, y: 400 }, { id: 'r11', number: 9, x: 350, y: 250 } ],
  '3-5-2': [ { id: 'r1', number: 1, x: 50, y: 250 }, { id: 'r2', number: 5, x: 130, y: 150 }, { id: 'r3', number: 4, x: 110, y: 250 }, { id: 'r4', number: 3, x: 130, y: 350 }, { id: 'r5', number: 11, x: 250, y: 80 }, { id: 'r6', number: 8, x: 230, y: 180 }, { id: 'r7', number: 6, x: 210, y: 250 }, { id: 'r8', number: 10, x: 230, y: 320 }, { id: 'r9', number: 7, x: 250, y: 420 }, { id: 'r10', number: 9, x: 350, y: 200 }, { id: 'r11', number: 12, x: 350, y: 300 } ],
  '3-4-3': [ { id: 'r1', number: 1, x: 50, y: 250 }, { id: 'r2', number: 5, x: 130, y: 120 }, { id: 'r3', number: 4, x: 110, y: 250 }, { id: 'r4', number: 3, x: 130, y: 380 }, { id: 'r5', number: 11, x: 230, y: 100 }, { id: 'r6', number: 8, x: 210, y: 200 }, { id: 'r7', number: 6, x: 210, y: 300 }, { id: 'r8', number: 7, x: 230, y: 400 }, { id: 'r9', number: 10, x: 330, y: 120 }, { id: 'r10', number: 9, x: 360, y: 250 }, { id: 'r11', number: 12, x: 330, y: 380 } ],
  '5-3-2': [ { id: 'r1', number: 1, x: 50, y: 250 }, { id: 'r2', number: 2, x: 150, y: 80 }, { id: 'r3', number: 5, x: 130, y: 165 }, { id: 'r4', number: 4, x: 120, y: 250 }, { id: 'r5', number: 3, x: 130, y: 335 }, { id: 'r6', number: 11, x: 150, y: 420 }, { id: 'r7', number: 8, x: 240, y: 120 }, { id: 'r8', number: 6, x: 220, y: 250 }, { id: 'r9', number: 10, x: 240, y: 380 }, { id: 'r10', number: 9, x: 340, y: 180 }, { id: 'r11', number: 12, x: 340, y: 320 } ],
};

const BLUE_FORMATIONS = {
  '4-3-3': [ { id: 'b1', number: 1, x: 750, y: 250 }, { id: 'b2', number: 2, x: 650, y: 100 }, { id: 'b3', number: 3, x: 670, y: 200 }, { id: 'b4', number: 4, x: 670, y: 300 }, { id: 'b5', number: 5, x: 650, y: 400 }, { id: 'b6', number: 6, x: 550, y: 200 }, { id: 'b7', number: 8, x: 550, y: 300 }, { id: 'b8', number: 10, x: 520, y: 250 }, { id: 'b9', number: 11, x: 450, y: 150 }, { id: 'b10', number: 7, x: 450, y: 350 }, { id: 'b11', number: 9, x: 420, y: 250 } ],
  '4-4-2': [ { id: 'b1', number: 1, x: 750, y: 250 }, { id: 'b2', number: 2, x: 650, y: 100 }, { id: 'b3', number: 3, x: 670, y: 200 }, { id: 'b4', number: 4, x: 670, y: 300 }, { id: 'b5', number: 5, x: 650, y: 400 }, { id: 'b6', number: 11, x: 550, y: 100 }, { id: 'b7', number: 8, x: 570, y: 200 }, { id: 'b8', number: 6, x: 570, y: 300 }, { id: 'b9', number: 7, x: 550, y: 400 }, { id: 'b10', number: 9, x: 450, y: 200 }, { id: 'b11', number: 10, x: 450, y: 300 } ],
  '4-2-3-1': [ { id: 'b1', number: 1, x: 750, y: 250 }, { id: 'b2', number: 2, x: 650, y: 100 }, { id: 'b3', number: 3, x: 670, y: 200 }, { id: 'b4', number: 4, x: 670, y: 300 }, { id: 'b5', number: 5, x: 650, y: 400 }, { id: 'b6', number: 6, x: 600, y: 180 }, { id: 'b7', number: 8, x: 600, y: 320 }, { id: 'b8', number: 11, x: 520, y: 120 }, { id: 'b9', number: 10, x: 540, y: 250 }, { id: 'b10', number: 7, x: 520, y: 380 }, { id: 'b11', number: 9, x: 450, y: 250 } ],
  '4-1-4-1': [ { id: 'b1', number: 1, x: 750, y: 250 }, { id: 'b2', number: 2, x: 650, y: 100 }, { id: 'b3', number: 3, x: 670, y: 200 }, { id: 'b4', number: 4, x: 670, y: 300 }, { id: 'b5', number: 5, x: 650, y: 400 }, { id: 'b6', number: 6, x: 600, y: 250 }, { id: 'b7', number: 11, x: 530, y: 100 }, { id: 'b8', number: 8, x: 550, y: 200 }, { id: 'b9', number: 10, x: 550, y: 300 }, { id: 'b10', number: 7, x: 530, y: 400 }, { id: 'b11', number: 9, x: 450, y: 250 } ],
  '3-5-2': [ { id: 'b1', number: 1, x: 750, y: 250 }, { id: 'b2', number: 5, x: 670, y: 150 }, { id: 'b3', number: 4, x: 690, y: 250 }, { id: 'b4', number: 3, x: 670, y: 350 }, { id: 'b5', number: 11, x: 550, y: 80 }, { id: 'b6', number: 8, x: 570, y: 180 }, { id: 'b7', number: 6, x: 590, y: 250 }, { id: 'b8', number: 10, x: 570, y: 320 }, { id: 'b9', number: 7, x: 550, y: 420 }, { id: 'b10', number: 9, x: 450, y: 200 }, { id: 'b11', number: 12, x: 450, y: 300 } ],
  '3-4-3': [ { id: 'b1', number: 1, x: 750, y: 250 }, { id: 'b2', number: 5, x: 670, y: 120 }, { id: 'b3', number: 4, x: 690, y: 250 }, { id: 'b4', number: 3, x: 670, y: 380 }, { id: 'b5', number: 11, x: 570, y: 100 }, { id: 'b6', number: 8, x: 590, y: 200 }, { id: 'b7', number: 6, x: 590, y: 300 }, { id: 'b8', number: 7, x: 570, y: 400 }, { id: 'b9', number: 10, x: 470, y: 120 }, { id: 'b10', number: 9, x: 440, y: 250 }, { id: 'b11', number: 12, x: 470, y: 380 } ],
  '5-3-2': [ { id: 'b1', number: 1, x: 750, y: 250 }, { id: 'b2', number: 2, x: 650, y: 80 }, { id: 'b3', number: 5, x: 670, y: 165 }, { id: 'b4', number: 4, x: 680, y: 250 }, { id: 'b5', number: 3, x: 670, y: 335 }, { id: 'b6', number: 11, x: 650, y: 420 }, { id: 'b7', number: 8, x: 560, y: 120 }, { id: 'b8', number: 6, x: 580, y: 250 }, { id: 'b9', number: 10, x: 560, y: 380 }, { id: 'b10', number: 9, x: 460, y: 180 }, { id: 'b11', number: 12, x: 460, y: 320 } ],
};

function App() {
  const stageRef = useRef(null);
  const requestRef = useRef(null); 

  // Colors & Menus
  const [redTeamColor, setRedTeamColor] = useState('#ef4444');
  const [blueTeamColor, setBlueTeamColor] = useState('#3b82f6');
  const [showTimelineMenu, setShowTimelineMenu] = useState(true);
  const [showToolbarMenu, setShowToolbarMenu] = useState(true);
  const [showScoreMenu, setShowScoreMenu] = useState(true);
  const [showDatabaseMenu, setShowDatabaseMenu] = useState(false);

  // UI States
  const [pitchView, setPitchView] = useState('full');
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [showNamesInAnim, setShowNamesInAnim] = useState(true);
  const [showScoreboard, setShowScoreboard] = useState(true);
  const [redTeamName, setRedTeamName] = useState('RED');
  const [blueTeamName, setBlueTeamName] = useState('BLU');

  const [drawColor, setDrawColor] = useState('#fbbf24'); 
  const [drawStyle, setDrawStyle] = useState('solid'); 
  const [selectedPlayer, setSelectedPlayer] = useState(null); 
  const [redFormationName, setRedFormationName] = useState('4-3-3');
  const [blueFormationName, setBlueFormationName] = useState('4-3-3');

  const [playbackValue, setPlaybackValue] = useState(0); 
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [frames, setFrames] = useState([{
    redTeam: JSON.parse(JSON.stringify(RED_FORMATIONS['4-3-3'])),
    blueTeam: JSON.parse(JSON.stringify(BLUE_FORMATIONS['4-3-3'])),
    ball: { x: 400, y: 250, curve: false },
    arrows: [],
    score: { red: 0, blue: 0, redScorers: '', blueScorers: '' }
  }]);
  
  const currentFrameIdx = Math.round(playbackValue);
  const [animState, setAnimState] = useState(null); 
  const [newArrow, setNewArrow] = useState(null); 

  // --- DATABASE STATE ---
  const [tacticInputName, setTacticInputName] = useState('');
  const [savedTactics, setSavedTactics] = useState([]);
  const [isLoadingDB, setIsLoadingDB] = useState(true);

  // --- NEW: LOAD FROM CLOUD ON BOOT ---
  useEffect(() => {
    const fetchTacticsFromCloud = async () => {
      try {
        // Fetch all documents from the "tactics" collection in Firebase
        const querySnapshot = await getDocs(collection(db, "tactics"));
        const tacticsArray = [];
        querySnapshot.forEach((doc) => {
          tacticsArray.push({ id: doc.id, ...doc.data() }); // Attach Firebase ID to the object
        });
        setSavedTactics(tacticsArray);
      } catch (error) {
        console.error("Error loading tactics from Cloud: ", error);
      } finally {
        setIsLoadingDB(false);
      }
    };
    fetchTacticsFromCloud();
  }, []);

  // Data Extraction
  const currFrame = frames[currentFrameIdx] || frames[0] || {};
  const isMidTransition = playbackValue % 1 !== 0;
  const activeData = (isPlaying || isMidTransition) && animState ? animState : currFrame;
  
  const safeRedTeam = activeData?.redTeam || RED_FORMATIONS['4-3-3'];
  const safeBlueTeam = activeData?.blueTeam || BLUE_FORMATIONS['4-3-3'];
  const safeArrows = activeData?.arrows || [];
  const safeBall = activeData?.ball || { x: 400, y: 250, curve: false };
  const currentScore = activeData?.score || { red: 0, blue: 0, redScorers: '', blueScorers: '' };

  const safeRedScorers = String(currentScore?.redScorers || '');
  const safeBlueScorers = String(currentScore?.blueScorers || '');
  const hasScorers = safeRedScorers.trim() !== '' || safeBlueScorers.trim() !== '';
  const maxScorerLines = Math.max(1, safeRedScorers.split('\n').length, safeBlueScorers.split('\n').length);
  const scorerBoxHeight = hasScorers ? (maxScorerLines * 16 + 14) : 0; 
  const scoreboardTotalHeight = 40 + scorerBoxHeight; 
  const stageHeight = showScoreboard ? 500 + scoreboardTotalHeight + 30 : 500;

  // --- HANDLERS ---
  const snapToCurrentFrame = () => {
    if (isMidTransition) {
      setPlaybackValue(currentFrameIdx);
      setAnimState(null);
    }
  };

  const updateCurrentFrame = (key, value) => {
    snapToCurrentFrame();
    const newFrames = [...frames];
    newFrames[currentFrameIdx] = { ...newFrames[currentFrameIdx], [key]: value };
    setFrames(newFrames);
  };

  const getInterpolatedState = (progress) => {
    const maxIdx = frames.length - 1;
    if (maxIdx <= 0) return frames[0];

    const clamped = Math.max(0, Math.min(progress, maxIdx));
    const startIdx = Math.floor(clamped);
    const endIdx = Math.min(startIdx + 1, maxIdx);

    if (startIdx === endIdx) return frames[maxIdx];

    const startFrame = frames[startIdx];
    const endFrame = frames[endIdx];
    const localProg = clamped - startIdx;

    const lerp = (start, end, p) => start + (end - start) * p;
    const ease = localProg < 0.5 ? 2 * localProg * localProg : 1 - Math.pow(-2 * localProg + 2, 2) / 2;

    const currentRed = (startFrame.redTeam || []).map((p, i) => {
      const e = endFrame.redTeam?.[i] || p;
      return { ...e, x: lerp(p.x, e.x, ease), y: lerp(p.y, e.y, ease) };
    });
    
    const currentBlue = (startFrame.blueTeam || []).map((p, i) => {
      const e = endFrame.blueTeam?.[i] || p;
      return { ...e, x: lerp(p.x, e.x, ease), y: lerp(p.y, e.y, ease) };
    });

    const sBall = startFrame.ball || { x: 400, y: 250, curve: false };
    const eBall = endFrame.ball || { x: 400, y: 250, curve: false };
    let currentBallCoords;
    if (eBall.curve) {
      const cp = getControlPoint(sBall, eBall, 80); 
      currentBallCoords = getBezierPoint(sBall, eBall, cp, ease);
    } else {
      currentBallCoords = { x: lerp(sBall.x, eBall.x, ease), y: lerp(sBall.y, eBall.y, ease) };
    }

    return {
      redTeam: currentRed,
      blueTeam: currentBlue,
      ball: { ...eBall, ...currentBallCoords },
      arrows: startFrame.arrows || [],
      score: startFrame.score || currentScore
    };
  };

  const handleScrub = (e) => {
    const val = parseFloat(e.target.value);
    setPlaybackValue(val);
    if (isPlaying) {
      cancelAnimationFrame(requestRef.current);
      setIsPlaying(false);
    }
    if (val % 1 === 0) setAnimState(null); 
    else setAnimState(getInterpolatedState(val)); 
  };

  const togglePlay = () => {
    if (frames.length < 2) return;
    if (isPlaying) {
      cancelAnimationFrame(requestRef.current);
      setIsPlaying(false);
      setPlaybackValue(Math.round(playbackValue)); 
      setAnimState(null);
    } else {
      playAnimation();
    }
  };

  const playAnimation = (onComplete, startFromZero = false) => {
    if (frames.length < 2) return;
    setIsPlaying(true);
    let startProgress = startFromZero ? 0 : (playbackValue >= frames.length - 1 ? 0 : playbackValue);
    const durationPerFrame = 1500; 
    let startTime = performance.now() - (startProgress * durationPerFrame);

    const animate = (time) => {
      let rawProgress = (time - startTime) / durationPerFrame;

      if (rawProgress >= frames.length - 1) {
        rawProgress = frames.length - 1;
        setPlaybackValue(rawProgress);
        setAnimState(null);
        setIsPlaying(false);
        if (typeof onComplete === 'function') onComplete(); 
        return;
      }

      setPlaybackValue(rawProgress);
      setAnimState(getInterpolatedState(rawProgress));
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
  };

  const handleScoreUpdate = (field, value) => updateCurrentFrame('score', { ...currentScore, [field]: value });

  const handleFormationChange = (teamColor, newFormation) => {
    const currentTeam = teamColor === 'red' ? safeRedTeam : safeBlueTeam;
    const dict = teamColor === 'red' ? RED_FORMATIONS : BLUE_FORMATIONS;
    if (teamColor === 'red') setRedFormationName(newFormation);
    else setBlueFormationName(newFormation);
    const newCoords = dict[newFormation] || dict['4-3-3']; 
    const updatedTeam = currentTeam.map((p, index) => ({ ...p, x: newCoords[index]?.x || 0, y: newCoords[index]?.y || 0 }));
    updateCurrentFrame(`${teamColor}Team`, updatedTeam);
  };

  const handlePlayerUpdate = (teamColor, id, field, value) => {
    const teamKey = `${teamColor}Team`;
    const teamArray = teamColor === 'red' ? safeRedTeam : safeBlueTeam;
    const updatedTeam = teamArray.map(p => p.id === id ? { ...p, [field]: value } : p);
    updateCurrentFrame(teamKey, updatedTeam);
  };

  const handleTeamDrag = (e, id, teamColor) => {
    const teamKey = `${teamColor}Team`;
    const teamArray = teamColor === 'red' ? safeRedTeam : safeBlueTeam;
    const updatedTeam = teamArray.map((player) => {
      if (player.id === id) return { ...player, x: e.target.x(), y: e.target.y() };
      return player;
    });
    updateCurrentFrame(teamKey, updatedTeam);
  };

  const toggleBallCurve = () => updateCurrentFrame('ball', { ...safeBall, curve: !safeBall.curve });

  const getRelativePointerPosition = (stage) => {
    const pointer = stage.getPointerPosition();
    if (!pointer) return { x: 0, y: 0 };
    if (pitchView === 'right') return { x: pointer.x + 380, y: pointer.y };
    return pointer;
  };

  const handleMouseDown = (e) => {
    if (!isDrawingMode || isPlaying) return;
    const pos = getRelativePointerPosition(e.target.getStage());
    setNewArrow({ points: [pos.x, pos.y, pos.x, pos.y], color: drawColor, dashed: drawStyle === 'dashed' });
  };

  const handleMouseMove = (e) => {
    if (!isDrawingMode || !newArrow || isPlaying) return;
    const pos = getRelativePointerPosition(e.target.getStage());
    setNewArrow({ ...newArrow, points: [newArrow.points[0], newArrow.points[1], pos.x, pos.y] });
  };

  const handleMouseUp = () => {
    if (!isDrawingMode || !newArrow || isPlaying) return;
    updateCurrentFrame('arrows', [...safeArrows, newArrow]);
    setNewArrow(null); 
  };

  const addFrame = () => {
    snapToCurrentFrame();
    const nextFrame = JSON.parse(JSON.stringify(currFrame));
    nextFrame.arrows = []; 
    const newFrames = frames.slice(0, currentFrameIdx + 1);
    newFrames.push(nextFrame);
    setFrames(newFrames);
    setPlaybackValue(newFrames.length - 1); 
  };

  const deleteFrame = () => {
    if (frames.length <= 1) return; 
    snapToCurrentFrame();
    const newFrames = frames.filter((_, idx) => idx !== currentFrameIdx);
    setFrames(newFrames);
    setPlaybackValue(Math.min(currentFrameIdx, newFrames.length - 1)); 
  };

  const resetBoard = () => {
    if (isPlaying) cancelAnimationFrame(requestRef.current);
    setIsPlaying(false);
    setPlaybackValue(0);
    setFrames([{
      redTeam: JSON.parse(JSON.stringify(RED_FORMATIONS[redFormationName] || RED_FORMATIONS['4-3-3'])),
      blueTeam: JSON.parse(JSON.stringify(BLUE_FORMATIONS[blueFormationName] || BLUE_FORMATIONS['4-3-3'])),
      ball: { x: 400, y: 250, curve: false }, arrows: [], score: { red: 0, blue: 0, redScorers: '', blueScorers: '' }
    }]);
    setSelectedPlayer(null);
  };

  const handleExport = () => {
    const dataURL = stageRef.current.toDataURL({ pixelRatio: 2 });
    const link = document.createElement('a');
    link.download = `tactic-frame-${currentFrameIdx + 1}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleVideoExport = () => {
    if (frames.length < 2) return alert("Capture at least 2 frames to record an animation!");
    const canvas = stageRef.current.container().querySelector('canvas');
    if (!canvas) return;
    const stream = canvas.captureStream(60); 
    const options = { videoBitsPerSecond: 8000000 };
    let mediaRecorder;
    try { mediaRecorder = new MediaRecorder(stream, { ...options, mimeType: 'video/webm; codecs=vp9' }); } 
    catch (e) { mediaRecorder = new MediaRecorder(stream, options); }
    const chunks = [];
    mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tactics-animation-high-res.webm';
      a.click();
      URL.revokeObjectURL(url);
    };
    mediaRecorder.start();
    setPlaybackValue(0);
    playAnimation(() => { mediaRecorder.stop(); }, true); 
  };


  // --- UPDATED: PUSH DATA TO FIREBASE CLOUD ---
  const saveTacticToLibrary = async () => {
    if (!tacticInputName.trim()) {
      alert("Please enter a name for your tactic first!");
      return;
    }
    
    const newTactic = {
      name: tacticInputName,
      date: new Date().toLocaleDateString(),
      redTeamName,
      blueTeamName,
      redTeamColor,
      blueTeamColor,
      frames: frames 
    };

    try {
      // 1. Send to Firebase Firestore!
      const docRef = await addDoc(collection(db, "tactics"), newTactic);
      
      // 2. Add the unique Firebase ID back into our local UI state
      setSavedTactics([...savedTactics, { id: docRef.id, ...newTactic }]);
      setTacticInputName(''); 
      alert(`"${newTactic.name}" saved to the Cloud!`);
    } catch (e) {
      console.error("Error adding document to Cloud: ", e);
      alert("Failed to save tactic to the Cloud. Check console for details.");
    }
  };

  const loadTacticFromLibrary = (tacticData) => {
    if (isPlaying) cancelAnimationFrame(requestRef.current);
    setIsPlaying(false);
    setPlaybackValue(0);
    
    setRedTeamName(tacticData.redTeamName || 'RED');
    setBlueTeamName(tacticData.blueTeamName || 'BLU');
    setRedTeamColor(tacticData.redTeamColor || '#ef4444');
    setBlueTeamColor(tacticData.blueTeamColor || '#3b82f6');
    setFrames(tacticData.frames);
    setSelectedPlayer(null);
  };

  // --- UPDATED: DELETE FROM FIREBASE CLOUD ---
  const deleteTacticFromLibrary = async (idToRemove) => {
    if(!window.confirm("Are you sure you want to permanently delete this tactic from the Cloud?")) return;
    
    try {
      // 1. Delete from Firebase
      await deleteDoc(doc(db, "tactics", idToRemove));
      
      // 2. Remove from Local UI
      setSavedTactics(savedTactics.filter(t => t.id !== idToRemove));
    } catch (e) {
      console.error("Error deleting from Cloud: ", e);
      alert("Failed to delete tactic.");
    }
  };


  return (
    <div className="app-container">
      <h1 className="app-title">Tactics Board Pro</h1>
      
      {/* 4. CLOUD DATABASE ACCORDION */}
      <div style={{ width: '100%' }}>
        <div className="accordion-header" onClick={() => setShowDatabaseMenu(!showDatabaseMenu)} style={{ backgroundColor: showDatabaseMenu ? '#047857' : '#1f2937' }}>
          <span>☁️ Tactics Library (Cloud Sync)</span>
          <span>{showDatabaseMenu ? '▲' : '▼'}</span>
        </div>
        {showDatabaseMenu && (
          <div className="accordion-body">
            <div className="timeline-panel" style={{ marginBottom: 0, flexDirection: 'column', alignItems: 'stretch' }}>
              
              <div className="save-panel">
                <input 
                  type="text" 
                  className="tactic-name-input" 
                  placeholder="Name your tactic (e.g. 'Arsenal High Press')" 
                  value={tacticInputName} 
                  onChange={(e) => setTacticInputName(e.target.value)} 
                />
                <button onClick={saveTacticToLibrary} className="btn btn-save">☁️ Save to Cloud</button>
              </div>

              {isLoadingDB ? (
                <div style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '10px' }}>Loading tactics from Cloud...</div>
              ) : savedTactics.length > 0 ? (
                <div className="saved-list">
                  {savedTactics.map((tactic) => (
                    <div key={tactic.id} className="saved-item">
                      <div>
                        <div className="saved-item-name">{tactic.name}</div>
                        <div className="saved-item-details">
                          {tactic.frames.length} frames • Saved: {tactic.date}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => loadTacticFromLibrary(tactic)} className="btn btn-load">Load</button>
                        <button onClick={() => deleteTacticFromLibrary(tactic.id)} className="btn btn-delete-frame" style={{ padding: '6px 10px' }}>X</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '10px' }}>
                  Your Cloud library is empty. Create a tactic and save it!
                </div>
              )}

            </div>
          </div>
        )}
      </div>


      {/* 1. TIMELINE ACCORDION */}
      <div style={{ width: '100%' }}>
        <div className="accordion-header" onClick={() => setShowTimelineMenu(!showTimelineMenu)}>
          <span>🎞️ Timeline & Animation</span>
          <span>{showTimelineMenu ? '▲' : '▼'}</span>
        </div>
        {showTimelineMenu && (
          <div className="accordion-body">
            <div className="timeline-panel" style={{ marginBottom: 0, flexDirection: 'column', alignItems: 'stretch' }}>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center' }}>
                <button onClick={() => { setPlaybackValue(Math.max(0, currentFrameIdx - 1)); setAnimState(null); }} disabled={currentFrameIdx === 0 || isPlaying} className="btn btn-timeline">◀️ Prev</button>
                <span className="frame-counter">Frame {currentFrameIdx + 1} / {frames.length}</span>
                <button onClick={() => { setPlaybackValue(Math.min(frames.length - 1, currentFrameIdx + 1)); setAnimState(null); }} disabled={currentFrameIdx === frames.length - 1 || isPlaying} className="btn btn-timeline">Next ▶️</button>
                
                <div style={{ borderLeft: '2px solid #4b5563', height: '30px', margin: '0 5px' }}></div>
                <button onClick={addFrame} disabled={isPlaying} className="btn btn-timeline">🎞️ Capture Frame</button>
                <button onClick={deleteFrame} disabled={frames.length === 1 || isPlaying} className="btn btn-delete-frame">🗑️ Delete Frame</button>
                <div style={{ borderLeft: '2px solid #4b5563', height: '30px', margin: '0 5px' }}></div>
                
                <button onClick={togglePlay} disabled={frames.length < 2} className="btn btn-play" style={{ minWidth: '160px' }}>
                  {isPlaying ? '⏸️ PAUSE' : '▶️ PLAY ANIMATION'}
                </button>
              </div>

              <div className="scrubber-container">
                <span style={{color: '#9ca3af', fontSize: '12px', fontWeight: 'bold'}}>Start</span>
                <input 
                  type="range" 
                  min="0" 
                  max={Math.max(0, frames.length - 1)} 
                  step="0.01" 
                  value={playbackValue} 
                  onChange={handleScrub}
                  className="scrubber-input"
                  disabled={frames.length < 2}
                />
                <span style={{color: '#9ca3af', fontSize: '12px', fontWeight: 'bold'}}>End</span>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* 2. MAIN CONTROLS ACCORDION */}
      <div style={{ width: '100%' }}>
        <div className="accordion-header" onClick={() => setShowToolbarMenu(!showToolbarMenu)}>
          <span>🛠️ Pitch & Team Controls</span>
          <span>{showToolbarMenu ? '▲' : '▼'}</span>
        </div>
        {showToolbarMenu && (
          <div className="accordion-body">
            <div className="toolbar" style={{ marginBottom: 0 }}>
              <button 
                onClick={() => {
                  if (pitchView === 'full') setPitchView('left');
                  else if (pitchView === 'left') setPitchView('right');
                  else setPitchView('full');
                }} 
                className="btn btn-view"
              >
                {pitchView === 'full' ? '🔍 View: Full' : pitchView === 'left' ? '🔍 View: Left Half' : '🔍 View: Right Half'}
              </button>

              <div style={{ borderLeft: '2px solid #4b5563', height: '30px', margin: '0 5px' }}></div>
              <button onClick={() => { setIsDrawingMode(!isDrawingMode); setSelectedPlayer(null); }} className={`btn ${isDrawingMode ? 'btn-draw' : 'btn-drag'}`}>{isDrawingMode ? '🖌️ Drawing Mode' : '🤚 Dragging Mode'}</button>
              
              {!isDrawingMode && (
                <button onClick={toggleBallCurve} disabled={isPlaying} style={{ padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', border: 'none', fontWeight: 'bold', backgroundColor: safeBall.curve ? '#8b5cf6' : '#4b5563', color: 'white' }}>
                  ⚽ Pass: {safeBall.curve ? 'Curved ⤴️' : 'Straight ➡️'}
                </button>
              )}
              
              {isDrawingMode && (
                <div className="drawing-tools">
                  <select value={drawColor} onChange={(e) => setDrawColor(e.target.value)} className="tool-select"><option value="#fbbf24">Yellow</option> <option value="#ffffff">White</option> <option value="#ef4444">Red</option> <option value="#3b82f6">Blue</option> <option value="#000000">Black</option></select>
                  <select value={drawStyle} onChange={(e) => setDrawStyle(e.target.value)} className="tool-select"><option value="solid">Pass (Solid)</option> <option value="dashed">Run (Dashed)</option></select>
                </div>
              )}
              <button onClick={() => updateCurrentFrame('arrows', [])} className="btn btn-clear">🗑️ Clear Arrows</button>
              
              <div style={{ borderLeft: '2px solid #4b5563', height: '30px', margin: '0 5px' }}></div>
              <label style={{ color: 'white', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}><input type="checkbox" checked={showNamesInAnim} onChange={(e) => setShowNamesInAnim(e.target.checked)} disabled={isPlaying} /> Names in Video</label>
              <button onClick={handleExport} className="btn btn-export">📸 Save Image</button>
              <button onClick={handleVideoExport} disabled={frames.length < 2 || isPlaying} className="btn btn-video">🎥 Save Video</button>

              <div style={{ width: '100%', borderBottom: '1px solid #4b5563', margin: '5px 0' }}></div>
              
              <div className="formation-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="color" className="color-picker" value={redTeamColor} onChange={(e) => setRedTeamColor(e.target.value)} title="Change Team 1 Color"/>
                <span style={{ color: 'white', fontWeight: 'bold' }}>{redTeamName || 'RED'}:</span>
                <select value={redFormationName} onChange={(e) => handleFormationChange('red', e.target.value)} className="formation-select">{Object.keys(RED_FORMATIONS).map(f => <option key={f} value={f}>{f}</option>)}</select>
              </div>

              <div className="formation-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '10px' }}>
                <input type="color" className="color-picker" value={blueTeamColor} onChange={(e) => setBlueTeamColor(e.target.value)} title="Change Team 2 Color"/>
                <span style={{ color: 'white', fontWeight: 'bold' }}>{blueTeamName || 'BLU'}:</span>
                <select value={blueFormationName} onChange={(e) => handleFormationChange('blue', e.target.value)} className="formation-select">{Object.keys(BLUE_FORMATIONS).map(f => <option key={f} value={f}>{f}</option>)}</select>
              </div>

              <button onClick={resetBoard} className="btn btn-reset">🔄 Reset</button>
            </div>
          </div>
        )}
      </div>

      {selectedPlayer && (
        <div className="edit-panel" style={{ borderLeftColor: selectedPlayer.team === 'red' ? redTeamColor : blueTeamColor, marginBottom: '15px' }}>
          <span className="edit-label" style={{ color: 'white', fontWeight: 'bold' }}>Editing Player:</span>
          <input type="text" placeholder="No." className="edit-input edit-input-number" value={activeData[`${selectedPlayer.team}Team`]?.find(p => p.id === selectedPlayer.id)?.number || ''} onChange={(e) => handlePlayerUpdate(selectedPlayer.team, selectedPlayer.id, 'number', e.target.value)} />
          <input type="text" placeholder="Player Name" className="edit-input" value={activeData[`${selectedPlayer.team}Team`]?.find(p => p.id === selectedPlayer.id)?.name || ''} onChange={(e) => handlePlayerUpdate(selectedPlayer.team, selectedPlayer.id, 'name', e.target.value)} />
          <button onClick={() => setSelectedPlayer(null)} className="btn btn-clear">Done</button>
        </div>
      )}
      
      {/* PITCH CANVAS */}
      <div className="pitch-container" style={{ width: pitchView === 'full' ? '800px' : '420px', transition: 'width 0.3s ease-in-out', marginBottom: '15px' }}>
        <Stage ref={stageRef} width={pitchView === 'full' ? 800 : 420} height={stageHeight} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
          <Layer>
            <Group x={pitchView === 'right' ? -380 : 0}>
              <Rect x={0} y={0} width={800} height={500} fill="#2e7d32" />
              <Rect x={10} y={10} width={780} height={480} stroke="white" strokeWidth={3} />
              <Line points={[400, 10, 400, 490]} stroke="white" strokeWidth={3} />
              <Circle x={400} y={250} radius={60} stroke="white" strokeWidth={3} />
              <Rect x={10} y={100} width={130} height={300} stroke="white" strokeWidth={3} />
              <Rect x={10} y={180} width={40} height={140} stroke="white" strokeWidth={3} />
              <Rect x={660} y={100} width={130} height={300} stroke="white" strokeWidth={3} />
              <Rect x={750} y={180} width={40} height={140} stroke="white" strokeWidth={3} />
              <Rect x={0} y={210} width={10} height={80} stroke="white" strokeWidth={3} />
              <Rect x={790} y={210} width={10} height={80} stroke="white" strokeWidth={3} />
              <Circle x={100} y={250} radius={4} fill="white" />
              <Circle x={700} y={250} radius={4} fill="white" />

              {currentFrameIdx > 0 && !isPlaying && (frames[currentFrameIdx]?.redTeam || []).map((player, i) => {
                const prevPlayer = frames[currentFrameIdx - 1]?.redTeam?.[i];
                if (prevPlayer && prevPlayer.x != null && player.x != null && (prevPlayer.x !== player.x || prevPlayer.y !== player.y)) return <Line key={`red-ghost-${player.id}`} points={[prevPlayer.x, prevPlayer.y, player.x, player.y]} stroke="rgba(255, 255, 255, 0.4)" strokeWidth={2} dash={[5, 5]} />
                return null;
              })}
              {currentFrameIdx > 0 && !isPlaying && (frames[currentFrameIdx]?.blueTeam || []).map((player, i) => {
                const prevPlayer = frames[currentFrameIdx - 1]?.blueTeam?.[i];
                if (prevPlayer && prevPlayer.x != null && player.x != null && (prevPlayer.x !== player.x || prevPlayer.y !== player.y)) return <Line key={`blue-ghost-${player.id}`} points={[prevPlayer.x, prevPlayer.y, player.x, player.y]} stroke="rgba(255, 255, 255, 0.4)" strokeWidth={2} dash={[5, 5]} />
                return null;
              })}
              
              {currentFrameIdx > 0 && !isPlaying && (() => {
                const prevBall = frames[currentFrameIdx - 1]?.ball;
                const currBall = frames[currentFrameIdx]?.ball;
                if (prevBall && currBall && prevBall.x != null && currBall.x != null && (prevBall.x !== currBall.x || prevBall.y !== currBall.y)) {
                  if (currBall.curve) {
                    const cp = getControlPoint(prevBall, currBall, 80);
                    return <Path data={`M ${prevBall.x} ${prevBall.y} Q ${cp.x} ${cp.y} ${currBall.x} ${currBall.y}`} stroke="rgba(255, 255, 255, 0.7)" strokeWidth={3} dash={[8, 6]} />
                  } else {
                    return <Line points={[prevBall.x, prevBall.y, currBall.x, currBall.y]} stroke="rgba(255, 255, 255, 0.7)" strokeWidth={3} dash={[8, 6]} />
                  }
                }
                return null;
              })()}

              {safeArrows.map((arrow, i) => <Arrow key={i} points={arrow.points || []} stroke={arrow.color || 'white'} fill={arrow.color || 'white'} strokeWidth={4} pointerLength={10} pointerWidth={10} dash={arrow.dashed ? [10, 5] : null} />)}
              {newArrow && <Arrow points={newArrow.points || []} stroke={newArrow.color || 'white'} fill={newArrow.color || 'white'} strokeWidth={4} pointerLength={10} pointerWidth={10} dash={newArrow.dashed ? [10, 5] : null} />}

              {safeRedTeam.map((player) => (
                <Group key={player.id} x={player.x || 0} y={player.y || 0} draggable={!isDrawingMode && !isPlaying} onDragEnd={(e) => handleTeamDrag(e, player.id, 'red')} onClick={() => { if(!isPlaying) setSelectedPlayer({team: 'red', id: player.id})}}>
                  <Circle x={0} y={0} radius={15} fill={redTeamColor} stroke={selectedPlayer?.id === player.id ? "#fbbf24" : getContrastColor(redTeamColor)} strokeWidth={selectedPlayer?.id === player.id ? 3 : 2} />
                  <Text x={-15} y={-6} width={30} align="center" text={String(player?.number || '')} fill={getContrastColor(redTeamColor)} fontSize={14} fontStyle="bold" />
                  {(!isPlaying || showNamesInAnim) && player.name ? <Text x={-40} y={20} width={80} align="center" text={String(player.name)} fill="white" fontSize={12} fontStyle="bold" shadowColor="black" shadowBlur={2} /> : null}
                </Group>
              ))}

              {safeBlueTeam.map((player) => (
                <Group key={player.id} x={player.x || 0} y={player.y || 0} draggable={!isDrawingMode && !isPlaying} onDragEnd={(e) => handleTeamDrag(e, player.id, 'blue')} onClick={() => { if(!isPlaying) setSelectedPlayer({team: 'blue', id: player.id})}}>
                  <Circle x={0} y={0} radius={15} fill={blueTeamColor} stroke={selectedPlayer?.id === player.id ? "#fbbf24" : getContrastColor(blueTeamColor)} strokeWidth={selectedPlayer?.id === player.id ? 3 : 2} />
                  <Text x={-15} y={-6} width={30} align="center" text={String(player?.number || '')} fill={getContrastColor(blueTeamColor)} fontSize={14} fontStyle="bold" />
                  {(!isPlaying || showNamesInAnim) && player.name ? <Text x={-40} y={20} width={80} align="center" text={String(player.name)} fill="white" fontSize={12} fontStyle="bold" shadowColor="black" shadowBlur={2} /> : null}
                </Group>
              ))}

              <Circle x={safeBall.x || 400} y={safeBall.y || 250} radius={8} fill="white" stroke="black" strokeWidth={1} draggable={!isDrawingMode && !isPlaying} onDragEnd={(e) => updateCurrentFrame('ball', { ...safeBall, x: e.target.x(), y: e.target.y() })} />
            </Group>

            {showScoreboard && (
              <Group y={500}>
                <Rect width={pitchView === 'full' ? 800 : 420} height={stageHeight - 500} fill="#111827" />
                <Group x={(pitchView === 'full' ? 800 : 420) / 2 - 120} y={15}>
                  <Rect width={240} height={40} fill="rgba(0,0,0,0.8)" cornerRadius={hasScorers ? [8, 8, 0, 0] : 8} />
                  <Rect x={0} y={0} width={10} height={40} fill={redTeamColor} cornerRadius={hasScorers ? [8, 0, 0, 0] : [8, 0, 0, 8]} />
                  <Text x={15} y={12} text={String(redTeamName || 'RED')} fill="white" fontSize={16} fontStyle="bold" width={50} align="left" />
                  <Text x={80} y={12} text={String(currentScore?.red || 0)} fill="white" fontSize={16} fontStyle="bold" />
                  <Text x={115} y={12} text="-" fill="white" fontSize={16} fontStyle="bold" />
                  <Text x={150} y={12} text={String(currentScore?.blue || 0)} fill="white" fontSize={16} fontStyle="bold" />
                  <Text x={175} y={12} text={String(blueTeamName || 'BLU')} fill="white" fontSize={16} fontStyle="bold" width={50} align="right" />
                  <Rect x={230} y={0} width={10} height={40} fill={blueTeamColor} cornerRadius={hasScorers ? [0, 8, 0, 0] : [0, 8, 8, 0]} />

                  {hasScorers && (
                    <>
                      <Rect x={0} y={40} width={240} height={scorerBoxHeight} fill="rgba(0,0,0,0.6)" cornerRadius={[0, 0, 8, 8]} />
                      <Text x={10} y={48} text={safeRedScorers} fill={redTeamColor} fontSize={12} lineHeight={1.3} fontStyle="bold" width={105} align="left" />
                      <Text x={125} y={48} text={safeBlueScorers} fill={blueTeamColor} fontSize={12} lineHeight={1.3} fontStyle="bold" width={105} align="right" />
                    </>
                  )}
                </Group>
              </Group>
            )}

          </Layer>
        </Stage>
      </div>

      {/* 3. SCOREBOARD EDITOR ACCORDION */}
      <div style={{ width: '100%' }}>
        <div className="accordion-header" onClick={() => setShowScoreMenu(!showScoreMenu)}>
          <span>📊 Scoreboard Editor</span>
          <span>{showScoreMenu ? '▲' : '▼'}</span>
        </div>
        {showScoreMenu && (
          <div className="accordion-body">
            <div className="score-panel" style={{ marginBottom: 0 }}>
              <label style={{ color: 'white', marginRight: '10px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontWeight: 'bold', paddingTop: '10px' }}>
                <input type="checkbox" checked={showScoreboard} onChange={(e) => setShowScoreboard(e.target.checked)} /> Show Overlay
              </label>
              
              <div style={{ borderLeft: '2px solid #4b5563', height: '40px', margin: '0 10px' }}></div>

              <input type="text" className="score-input" style={{ width: '70px', color: redTeamColor }} maxLength={3} value={redTeamName} onChange={(e) => setRedTeamName(e.target.value.toUpperCase())} placeholder="RED" />
              <input type="number" className="score-input" value={currentScore?.red || 0} onChange={(e) => handleScoreUpdate('red', parseInt(e.target.value) || 0)} />
              <textarea className="scorer-input" placeholder="Scorers&#10;(e.g. Saka 12')" value={safeRedScorers} onChange={(e) => handleScoreUpdate('redScorers', e.target.value)} />
              
              <div style={{ borderLeft: '2px solid #4b5563', height: '40px', margin: '0 15px' }}></div>
              
              <input type="text" className="score-input" style={{ width: '70px', color: blueTeamColor }} maxLength={3} value={blueTeamName} onChange={(e) => setBlueTeamName(e.target.value.toUpperCase())} placeholder="BLU" />
              <input type="number" className="score-input" value={currentScore?.blue || 0} onChange={(e) => handleScoreUpdate('blue', parseInt(e.target.value) || 0)} />
              <textarea className="scorer-input" placeholder="Scorers&#10;(e.g. Palmer 89')" value={safeBlueScorers} onChange={(e) => handleScoreUpdate('blueScorers', e.target.value)} />
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default App;