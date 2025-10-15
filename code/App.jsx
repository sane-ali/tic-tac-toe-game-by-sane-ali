// App.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';

// ------------------------------ I. CONSTANTS & THEMES ------------------------------

const defaultN = 3;
const defaultK = 3;
const minSize = 3;
const maxSize = 8;
const AI_MODES = {
  HUMAN: 'human',
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
};

const THEME_DATA = {
  Neon: {
    background: 'bg-gray-900',
    primary: 'text-green-400',
    accent: 'text-purple-500',
    board: 'bg-gray-800/80 backdrop-blur-sm shadow-neon',
    cellHover: 'hover:bg-gray-700/50',
    markerX: 'text-green-400 drop-shadow-neon-x',
    markerO: 'text-purple-500 drop-shadow-neon-o',
    button: 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg',
  },
  Pastel: {
    background: 'bg-rose-50',
    primary: 'text-slate-800',
    accent: 'text-pink-400',
    board: 'bg-white/80 backdrop-blur-sm shadow-xl',
    cellHover: 'hover:bg-pink-100/50',
    markerX: 'text-sky-500',
    markerO: 'text-pink-400',
    button: 'bg-sky-500 hover:bg-sky-400 text-white shadow-md',
  },
  'Retro Arcade': {
    background: 'bg-gray-900',
    primary: 'text-lime-400',
    accent: 'text-red-500',
    board: 'bg-gray-800 border-8 border-gray-700 shadow-xl',
    cellHover: 'hover:bg-gray-700/50',
    markerX: 'text-lime-400 font-retro',
    markerO: 'text-red-500 font-retro',
    button: 'bg-red-500 hover:bg-red-400 text-lime-100',
  },
  'Dark Matrix': {
    background: 'bg-black',
    primary: 'text-green-500',
    accent: 'text-cyan-500',
    board: 'bg-black/90 border border-green-700 shadow-matrix',
    cellHover: 'hover:bg-gray-900/50',
    markerX: 'text-green-500 font-mono',
    markerO: 'text-cyan-500 font-mono',
    button: 'bg-green-700 hover:bg-green-600 text-black shadow-lg',
  },
  Ocean: {
    background: 'bg-blue-900',
    primary: 'text-blue-100',
    accent: 'text-cyan-400',
    board: 'bg-blue-800/70 backdrop-blur-md border border-cyan-500/50',
    cellHover: 'hover:bg-blue-700/50',
    markerX: 'text-cyan-400',
    markerO: 'text-yellow-300',
    button: 'bg-cyan-500 hover:bg-cyan-400 text-blue-900 shadow-lg',
  },
  Forest: {
    background: 'bg-green-800',
    primary: 'text-amber-100',
    accent: 'text-lime-400',
    board: 'bg-green-900/70 backdrop-blur-md border border-lime-400/50',
    cellHover: 'hover:bg-green-700/50',
    markerX: 'text-amber-100',
    markerO: 'text-lime-400',
    button: 'bg-amber-400 hover:bg-amber-300 text-green-900 shadow-lg',
  },
};

// Placeholder sound constant (replace with real urls)
const SOUNDS = {
  CLICK: '', // TODO: put real click sound path
  WIN: '', // TODO: put real win sound path
};

// ------------------------------ II. UTILITY HOOKS ------------------------------

const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      if (typeof window === 'undefined') return initialValue;
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (err) {
      console.error('useLocalStorage read error', err);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (err) {
      console.error('useLocalStorage set error', err);
    }
  };

  return [storedValue, setValue];
};

const useTheme = () => {
  const [currentThemeName, setCurrentThemeName] = useLocalStorage('tictactoe-theme', 'Neon');
  const [isDarkMode, setIsDarkMode] = useLocalStorage('tictactoe-darkmode', true);

  const theme = useMemo(() => THEME_DATA[currentThemeName] || THEME_DATA.Neon, [currentThemeName]);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    // Add transition for color changes
    document.body.classList.add('transition-colors', 'duration-500', 'ease-in-out');
  }, [isDarkMode]);

  return {
    theme,
    currentThemeName,
    setCurrentThemeName,
    isDarkMode,
    toggleDarkMode: () => setIsDarkMode(prev => !prev),
  };
};

// ------------------------------ III. CORE GAME LOGIC ------------------------------

const checkWin = (board, N, K, idx) => {
  if (idx === null || idx === undefined) return null;
  const player = board[idx];
  if (!player) return null;

  const r = Math.floor(idx / N);
  const c = idx % N;

  const directions = [
    [0, 1], // horiz
    [1, 0], // vert
    [1, 1], // diag \
    [1, -1], // diag /
  ];

  for (const [dr, dc] of directions) {
    // collect contiguous cells including the last move
    const line = [idx];

    // go forward
    for (let step = 1; step < K; step++) {
      const nr = r + dr * step;
      const nc = c + dc * step;
      if (nr < 0 || nr >= N || nc < 0 || nc >= N) break;
      const i2 = nr * N + nc;
      if (board[i2] === player) line.push(i2);
      else break;
    }
    // go backward
    for (let step = 1; step < K; step++) {
      const nr = r - dr * step;
      const nc = c - dc * step;
      if (nr < 0 || nr >= N || nc < 0 || nc >= N) break;
      const i2 = nr * N + nc;
      if (board[i2] === player) line.unshift(i2);
      else break;
    }

    // check all contiguous K-length subsegments of collected line
    if (line.length >= K) {
      for (let s = 0; s <= line.length - K; s++) {
        const seg = line.slice(s, s + K);
        if (seg.length === K && seg.every(i => board[i] === player)) {
          return { winner: player, line: seg };
        }
      }
    }
  }

  return null;
};

// ------------------------------ IV. AI (kept mostly same, small fixes) ------------------------------

const evaluateBoard = (board, N, K, player) => {
  const opponent = player === 'X' ? 'O' : 'X';
  let score = 0;
  // simple positional heuristic: favor center
  const center = (N - 1) / 2;
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const val = board[r * N + c];
      if (val === player) {
        const dist = Math.abs(r - center) + Math.abs(c - center);
        score += Math.max(0, (N * 2) - dist);
      } else if (val === opponent) {
        const dist = Math.abs(r - center) + Math.abs(c - center);
        score -= Math.max(0, (N * 2) - dist);
      }
    }
  }
  return score;
};

const minimax = (board, N, K, player, depth, maxDepth, isMaximizingPlayer) => {
  const emptyCells = board.map((v, i) => v === null ? i : -1).filter(i => i !== -1);

  if (depth === 0 || emptyCells.length === 0) {
    return evaluateBoard(board, N, K, player);
  }

  const opponent = player === 'X' ? 'O' : 'X';

  if (isMaximizingPlayer) {
    let best = -Infinity;
    // small optimization: try moves near existing marks
    const candidate = emptyCells.filter(idx => {
      return board.some((p, i) => p !== null && Math.abs(Math.floor(idx / N) - Math.floor(i / N)) <= 1 && Math.abs(idx % N - i % N) <= 1) || emptyCells.length === N * N;
    });
    const moves = candidate.length ? candidate : emptyCells;
    for (const m of moves) {
      const nb = [...board];
      nb[m] = player;
      const sc = minimax(nb, N, K, player, depth - 1, maxDepth, false);
      best = Math.max(best, sc);
      if (best >= 10000) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of emptyCells) {
      const nb = [...board];
      nb[m] = opponent;
      const sc = minimax(nb, N, K, player, depth - 1, maxDepth, true);
      best = Math.min(best, sc);
      if (best <= -10000) break;
    }
    return best;
  }
};

const findAIMove = (mode, board, N, K, player) => {
  const emptyCells = board.map((cell, i) => cell === null ? i : -1).filter(i => i !== -1);
  if (!emptyCells.length) return -1;

  // immediate wins/blocks
  for (const move of emptyCells) {
    const b1 = [...board];
    b1[move] = player;
    if (checkWin(b1, N, K, move)) return move;
    const opponent = player === 'X' ? 'O' : 'X';
    const b2 = [...board];
    b2[move] = opponent;
    if (checkWin(b2, N, K, move)) return move;
  }

  if (mode === AI_MODES.EASY) return emptyCells[Math.floor(Math.random() * emptyCells.length)];

  let depth = 2;
  if (N <= 4) depth = 4;
  if (N >= 6) depth = 1;

  const depthToUse = mode === AI_MODES.HARD ? depth : Math.min(depth, 2);
  let bestScore = -Infinity;
  let bestMove = emptyCells[0];

  // shuffle to add variability
  const shuffled = [...emptyCells].sort(() => Math.random() - 0.5);
  for (const move of shuffled) {
    const nb = [...board];
    nb[move] = player;
    const sc = minimax(nb, N, K, player, depthToUse, depthToUse, false);
    if (sc > bestScore) {
      bestScore = sc;
      bestMove = move;
    }
    if (bestScore >= 10000) break;
  }

  return bestMove;
};

// ------------------------------ V. GAME STATE HOOK ------------------------------

const useGameLogic = () => {
  const [N, setN] = useLocalStorage('tictactoe-N', defaultN);
  const [K, setK] = useLocalStorage('tictactoe-K', defaultK);
  const [gameMode, setGameMode] = useLocalStorage('tictactoe-mode', AI_MODES.HUMAN);
  const [soundEnabled, setSoundEnabled] = useLocalStorage('tictactoe-sound', true);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Ensure initial board matches N
  const makeEmptyBoard = useCallback((n) => Array(n * n).fill(null), []);

  const [history, setHistory] = useState(() => [makeEmptyBoard(N)]);
  const [currentStep, setCurrentStep] = useState(0);
  const [xIsNext, setXIsNext] = useState(true);
  const [status, setStatus] = useState('New Game');
  const [winner, setWinner] = useState(null);
  const [winningLine, setWinningLine] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);

  // ensure history resets when N changes externally
  useEffect(() => {
    setHistory([makeEmptyBoard(N)]);
    setCurrentStep(0);
    setXIsNext(true);
    setWinner(null);
    setWinningLine([]);
    setStatus('Game Started');
  }, [N, K, makeEmptyBoard]);

  const currentBoard = history[currentStep];
  const emptyCells = currentBoard ? currentBoard.filter(c => c === null).length : 0;

  const checkGameStatus = useCallback((board, lastMoveIndex) => {
    const winResult = checkWin(board, N, K, lastMoveIndex);
    if (winResult) {
      setWinner(winResult.winner);
      setWinningLine(winResult.line);
      setStatus(`${winResult.winner} wins!`);
      return true;
    }
    if (board.every(cell => cell !== null)) {
      setWinner('Draw');
      setStatus('Draw!');
      return true;
    }
    return false;
  }, [N, K]);

  const playSound = useCallback((type) => {
    if (!soundEnabled) return;
    const url = SOUNDS[type];
    if (!url) return;
    const a = new Audio(url);
    a.volume = 0.45;
    a.play().catch(() => {});
  }, [soundEnabled]);

  const handleMove = useCallback((i) => {
    if (!currentBoard || winner || currentBoard[i] || isAnimating) return;

    const player = xIsNext ? 'X' : 'O';
    const newBoard = [...currentBoard];
    newBoard[i] = player;

    const newHistory = history.slice(0, currentStep + 1);
    setHistory([...newHistory, newBoard]);
    setCurrentStep(prev => prev + 1);

    playSound('CLICK');

    if (!checkGameStatus(newBoard, i)) {
      setXIsNext(prev => !prev);
      setStatus(prev => (xIsNext ? 'O turn' : 'X turn'));
    }
  }, [currentBoard, winner, isAnimating, xIsNext, history, currentStep, checkGameStatus, playSound]);

  // AI effect: AI plays when it's O's turn and mode != human (assuming X is human)
  useEffect(() => {
    if (!currentBoard) return;
    if (winner) return;
    if (gameMode === AI_MODES.HUMAN) return;
    if (xIsNext) return; // assume X is human; when xIsNext=false, AI's turn

    setStatus(`AI (${gameMode}) is thinking...`);
    setIsAnimating(true);

    const aiPlayer = 'O';
    const delay = N > 5 ? 500 : 200;
    const timer = setTimeout(() => {
      const move = findAIMove(gameMode, currentBoard, N, K, aiPlayer);
      if (move !== -1 && move !== undefined) {
        const nb = [...currentBoard];
        nb[move] = aiPlayer;
        const newHistory = history.slice(0, currentStep + 1);
        setHistory([...newHistory, nb]);
        setCurrentStep(prev => prev + 1);
        playSound('CLICK');

        if (!checkGameStatus(nb, move)) {
          setXIsNext(true);
          setStatus('Your turn, X.');
        }
      }
      setIsAnimating(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [xIsNext, winner, gameMode, currentBoard, currentStep, history, N, K, playSound, checkGameStatus]);

  const handleSizeChange = useCallback((newN, newK) => {
    const validatedN = Math.max(minSize, Math.min(maxSize, parseInt(newN, 10) || defaultN));
    const validatedK = Math.max(3, Math.min(validatedN, parseInt(newK, 10) || validatedN));
    setN(validatedN);
    setK(validatedK);
    // history will reset via effect watching N
  }, [setN, setK]);

  const resetGame = useCallback(() => {
    setHistory([makeEmptyBoard(N)]);
    setCurrentStep(0);
    setXIsNext(true);
    setWinner(null);
    setWinningLine([]);
    setStatus('Game Started');
    setIsAnimating(false);
  }, [N, makeEmptyBoard]);

  const undoMove = useCallback(() => {
    if (currentStep > 0 && !winner) {
      setHistory(prev => prev.slice(0, currentStep));
      setCurrentStep(prev => prev - 1);
      setXIsNext(prev => !prev);
      setStatus('Undo performed');
    }
  }, [currentStep, winner]);

  useEffect(() => {
    if (window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mq.matches);
      const listener = (e) => setReducedMotion(e.matches);
      mq.addEventListener ? mq.addEventListener('change', listener) : mq.addListener(listener);
      return () => {
        mq.removeEventListener ? mq.removeEventListener('change', listener) : mq.removeListener(listener);
      };
    }
  }, []);

  useEffect(() => {
    if (winner && window.navigator.vibrate) {
      window.navigator.vibrate([100, 50, 100]);
    }
  }, [winner]);

  return {
    N, K, gameMode, setGameMode, soundEnabled, setSoundEnabled, reducedMotion,
    currentBoard, xIsNext, winner, winningLine, status, isAnimating,
    handleMove, handleSizeChange, resetGame, undoMove, currentStep, history,
  };
};

// ------------------------------ VI. COMPONENTS ------------------------------

const AnimatedButton = ({ onClick, children, className = '', disabled = false, isAccent = false, theme = {} }) => {
  const base = 'px-4 py-2 font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-4';
  const accent = isAccent ? (theme.button || 'bg-indigo-600 text-white') : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${accent} ${className} disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-[.98] focus:scale-[1.02]`}
      aria-label={typeof children === 'string' ? children : 'Action button'}
    >
      {children}
    </button>
  );
};

const Cell = React.memo(({ value, onClick, isWinning, index, N, theme, reducedMotion, winner }) => {
  const isPlayed = value !== null && value !== undefined;
  const isWinnerMarker = isPlayed && winner && isWinning;
  const fontSizeClass = N <= 4 ? 'text-4xl sm:text-7xl' : N <= 6 ? 'text-3xl sm:text-5xl' : 'text-2xl sm:text-4xl';

  // Anim classes
  let anim = '';
  if (isWinnerMarker) anim = reducedMotion ? 'opacity-0' : 'animate-fly-away';
  else if (isPlayed && !reducedMotion) anim = 'animate-pop-in';
  else anim = `${theme.cellHover || ''} hover:scale-[1.05] transition-transform duration-150`;

  const markerClass = value === 'X' ? theme.markerX : theme.markerO;

  // Inline size to avoid invalid Tailwind arbitrary classes generated at runtime
  const percent = 100 / N;
  const style = { minWidth: `${percent}%`, minHeight: `${percent}%` };

  return (
    <div
      role="gridcell"
      tabIndex={winner ? -1 : 0}
      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !winner) onClick(); }}
      onClick={() => { if (!winner) onClick(); }}
      style={style}
      className={`flex items-center justify-center p-1 cursor-pointer ${fontSizeClass} ${markerClass} ${anim}`}
      aria-label={`cell-${index}`}
    >
      {value}
    </div>
  );
});

// ------------------------------ VII. BOARD & VIEWS ------------------------------

const GameBoard = ({ state, handleMove, N, winningLine, theme, reducedMotion, winner }) => {
  const gridStyle = {
    gridTemplateColumns: `repeat(${N}, 1fr)`,
    gridTemplateRows: `repeat(${N}, 1fr)`,
    gap: '6px',
  };

  const slowMoClass = winner && !reducedMotion ? 'transition-all duration-[1000ms] delay-[500ms]' : 'transition-all duration-300';
  const zoomClass = winner ? 'scale-100' : 'scale-100';

  return (
    <div className="relative p-2 w-full max-w-3xl" style={{ aspectRatio: '1 / 1' }}>
      {winner && !reducedMotion && (
        <div className="absolute inset-0 bg-white/5 dark:bg-black/5 backdrop-blur-sm z-10 rounded-2xl pointer-events-none" />
      )}

      <div
        className={`grid w-full h-full rounded-2xl border-4 ${theme.board} ${slowMoClass} ${zoomClass}`}
        style={gridStyle}
        role="grid"
      >
        {state.map((value, i) => (
          <Cell
            key={i}
            index={i}
            value={value}
            onClick={() => handleMove(i)}
            isWinning={Array.isArray(winningLine) && winningLine.includes(i)}
            N={N}
            theme={theme}
            reducedMotion={reducedMotion}
            winner={winner}
          />
        ))}
      </div>
    </div>
  );
};

const ThemeGallery = ({ theme, currentThemeName, setCurrentThemeName, allThemes, setView }) => (
  <div className="p-4 sm:p-8 w-full max-w-5xl">
    <h2 className={`text-3xl font-bold mb-6 ${theme.primary}`}>Theme Gallery</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {Object.entries(allThemes).map(([name, t]) => (
        <div
          key={name}
          className={`p-6 rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.03] ${t.board} shadow-lg`}
          onClick={() => setCurrentThemeName(name)}
        >
          <div className={`${t.primary} text-xl font-semibold mb-2`}>{name}</div>
          <div className="flex space-x-2">
            <div className={`text-4xl ${t.markerX}`}>X</div>
            <div className={`text-4xl ${t.markerO}`}>O</div>
          </div>
          <p className={`mt-4 text-sm ${t.primary}`}>Click to select. Try Light/Dark Mode!</p>
        </div>
      ))}
    </div>
    <div className="mt-8">
      <AnimatedButton onClick={() => setView('game')} isAccent={true} theme={theme} className="w-full sm:w-auto">
        Back to Game
      </AnimatedButton>
    </div>
  </div>
);

const SettingsView = ({ settings, theme, setView }) => {
  const { N, K, handleSizeChange, gameMode, setGameMode, soundEnabled, setSoundEnabled, resetGame } = settings;
  const [tempN, setTempN] = useState(N);
  const [tempK, setTempK] = useState(K);

  useEffect(() => { setTempN(N); setTempK(K); }, [N, K]);

  const applySettings = () => {
    handleSizeChange(tempN, tempK);
    setView('game');
  };

  return (
    <div className="p-4 sm:p-8 w-full max-w-lg">
      <h2 className={`text-3xl font-bold mb-6 ${theme.primary}`}>Game Settings</h2>

      <div className="space-y-6 mb-8 p-6 rounded-xl bg-white/10 dark:bg-black/10 backdrop-blur-md">
        <div>
          <label className={`block text-lg font-medium mb-2 ${theme.primary}`}>Board Size (N×N): {tempN}x{tempN}</label>
          <input
            type="range" min={minSize} max={maxSize} value={tempN}
            onChange={(e) => {
              const newN = parseInt(e.target.value, 10);
              setTempN(newN);
              setTempK(k => Math.min(k, newN));
            }}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-600/50"
          />
        </div>

        <div>
          <label className={`block text-lg font-medium mb-2 ${theme.primary}`}>Win Length (K): {tempK} in a row</label>
          <input
            type="range" min={3} max={tempN} value={tempK}
            onChange={(e) => setTempK(parseInt(e.target.value, 10))}
            disabled={tempN < 3}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer disabled:opacity-50 bg-gray-600/50"
          />
          <p className="text-sm text-gray-400 mt-1">Min: 3, Max: {tempN}</p>
        </div>

        <div>
          <label className={`block text-lg font-medium mb-2 ${theme.primary}`}>Game Mode</label>
          <select
            value={gameMode}
            onChange={(e) => setGameMode(e.target.value)}
            className={`w-full p-3 rounded-lg ${theme.board} border border-gray-600 ${theme.primary}`}
          >
            <option value={AI_MODES.HUMAN}>Human vs Human</option>
            <option value={AI_MODES.EASY}>Human vs AI (Easy)</option>
            <option value={AI_MODES.MEDIUM}>Human vs AI (Medium)</option>
            <option value={AI_MODES.HARD}>Human vs AI (Hard)</option>
          </select>
        </div>

        <div className="flex justify-between items-center">
          <span className={`text-lg font-medium ${theme.primary}`}>Game Sounds</span>
          <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} className="h-6 w-6 rounded border-gray-300" />
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <AnimatedButton onClick={() => setView('game')} theme={theme}>
          Cancel
        </AnimatedButton>
        <AnimatedButton onClick={applySettings} isAccent={true} theme={theme}>
          Apply & Reset Game
        </AnimatedButton>
      </div>
    </div>
  );
};

// ------------------------------ VIII. APP ------------------------------

const App = () => {
  const [view, setView] = useState('game'); // 'game', 'themes', 'settings'
  const { theme, currentThemeName, setCurrentThemeName, isDarkMode, toggleDarkMode } = useTheme();
  const gameSettings = useGameLogic();
  const { N, K, currentBoard, xIsNext, winner, status, winningLine, handleMove, resetGame, undoMove, isAnimating, gameMode } = gameSettings;

  const playerMarker = xIsNext ? 'X' : 'O';
  const turnColor = xIsNext ? theme.markerX : theme.markerO;

  const pages = {
    game: (
      <div className="flex flex-col items-center justify-start h-full w-full">
        <h1 className={`text-4xl sm:text-6xl font-extrabold mb-4 pt-8 ${theme.primary} transition-colors duration-500`}>
          TicTacToe Pro
        </h1>

        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8 p-4 w-full max-w-3xl">
          <div className="w-full sm:w-auto text-center">
            <p className={`text-lg font-medium text-gray-400 transition-opacity duration-500 ${isAnimating ? 'opacity-50' : 'opacity-100'}`}>
              {winner ? 'Game Over' : gameMode === AI_MODES.HUMAN ? 'Turn' : 'Status'}
            </p>
            <div className="h-10 overflow-hidden">
              <p key={playerMarker + status} className={`text-3xl font-black transition-all duration-500 ${turnColor}`}>
                {winner ? status : gameMode !== AI_MODES.HUMAN && !xIsNext ? status : playerMarker}
              </p>
            </div>
            <p className="text-sm text-gray-500">Board: {N}x{N} | Win: {K} in a row</p>
          </div>

          <div className="flex space-x-3 w-full sm:w-auto justify-center">
            <AnimatedButton onClick={undoMove} disabled={gameSettings.currentStep === 0 || !!winner} theme={theme}>
              Undo
            </AnimatedButton>
            <AnimatedButton onClick={() => resetGame()} isAccent={true} theme={theme}>
              {winner ? 'New Game' : 'Reset'}
            </AnimatedButton>
          </div>
        </div>

        <GameBoard
          state={currentBoard}
          handleMove={handleMove}
          N={N}
          winningLine={winningLine}
          theme={theme}
          reducedMotion={gameSettings.reducedMotion}
          winner={winner}
        />
      </div>
    ),
    themes: <ThemeGallery theme={theme} currentThemeName={currentThemeName} setCurrentThemeName={setCurrentThemeName} allThemes={THEME_DATA} setView={setView} />,
    settings: <SettingsView settings={gameSettings} theme={theme} setView={setView} />,
  };

  const customStyles = `
    .shadow-neon { box-shadow: 0 0 10px rgba(52, 211, 163, 0.6), 0 0 20px rgba(168, 85, 247, 0.4); }
    .drop-shadow-neon-x { filter: drop-shadow(0 0 5px rgba(52, 211, 163, 0.9)); }
    .drop-shadow-neon-o { filter: drop-shadow(0 0 5px rgba(168, 85, 247, 0.9)); }
    .shadow-matrix { box-shadow: 0 0 10px #10b981; }
    .font-retro { font-family: 'Press Start 2P', monospace; }
    .animate-pop-in { animation: pop-in 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94) both; }
    @keyframes pop-in { from { opacity: 0; transform: scale(0.5) rotate(-15deg); filter: blur(10px);} to { opacity: 1; transform: scale(1) rotate(0deg); filter: blur(0);} }
    .animate-fly-away { animation: fly-away 2000ms cubic-bezier(0.19, 1, 0.22, 1) forwards; }
    @keyframes fly-away { 0% { transform: translate(0,0) scale(1) rotate(0deg); opacity:1; } 100% { transform: translate(0,-200vh) scale(0.5) rotate(360deg); opacity:0; } }
    .animate-slide-in { animation: slide-in 400ms cubic-bezier(0.25,0.46,0.45,0.94) both; }
    @keyframes slide-in { from { transform: translateY(100%); filter: blur(5px); opacity:0; } to { transform: translateY(0); filter: blur(0); opacity:1; } }
    .animate-pulse-light { animation: pulse-light 1.5s infinite alternate; }
    @keyframes pulse-light { 0% { box-shadow: 0 0 0px rgba(255,255,255,0.0);} 50% { box-shadow: 0 0 50px rgba(255,255,255,0.12);} 100% { box-shadow: 0 0 0px rgba(255,255,255,0.0);} }
  `;

  return (
    <>
      <style>{customStyles}</style>
      <div className={`min-h-screen w-full flex flex-col items-center transition-all duration-1000 ${theme.background} text-gray-900 dark:text-gray-100`}>
        <div className="w-full max-w-7xl flex justify-end p-4 space-x-4">
          <AnimatedButton onClick={() => setView(view === 'themes' ? 'game' : 'themes')} theme={theme} isAccent={view === 'themes'}>
            {view === 'themes' ? 'Close Themes' : 'Themes'}
          </AnimatedButton>
          <AnimatedButton onClick={() => setView(view === 'settings' ? 'game' : 'settings')} theme={theme} isAccent={view === 'settings'}>
            {view === 'settings' ? 'Close Settings' : 'Settings'}
          </AnimatedButton>
          <AnimatedButton onClick={() => toggleDarkMode()} theme={theme}>
            {isDarkMode ? '🌞 Light Mode' : '🌙 Dark Mode'}
          </AnimatedButton>
        </div>

        <div key={view} className={`flex-grow w-full flex justify-center items-start transition-all duration-500 ${view === 'game' ? 'py-4' : 'py-8'} animate-fade-slide`}>
          {pages[view]}
        </div>

        <style>{`
          @keyframes fade-slide-in { from { opacity:0; transform: translateY(20px); } to { opacity:1; transform: translateY(0); } }
          .animate-fade-slide { animation: fade-slide-in 500ms ease-out both; }
        `}</style>
      </div>
    </>
  );
};

export default App;
