import { useState, useEffect, useRef, useCallback } from "react";
import { LEVEL_META, EXAMS, HSK_LEVEL_META, HSK_EXAMS } from "./examData.js";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const C = {
  ink:        "#1a1a2e",
  inkLight:   "#2d2d44",
  inkDeep:    "#0f0f1e",
  paper:      "#faf8f0",
  paperDark:  "#f0ece0",
  red:        "#c0392b",
  redSoft:    "#e74c3c",
  gold:       "#d4a017",
  goldSoft:   "#f0c040",
  jade:       "#1a7a5a",
  jadeSoft:   "#27ae60",
  blue:       "#2c5f8a",
  blueSoft:   "#3b82b8",
  grey:       "#8a8a8a",
  greyLight:  "#d5d0c5",
  white:      "#ffffff",
  dim:        "#c8c4b8",
};

const PASS_THRESHOLD    = 80;  // % to auto-advance in diagnostic
const RECOMMEND_THRESHOLD = 60; // % to get "good foundation" rating
const TOTAL_Q = 20;

const STORAGE_KEY = "mandarin_placement_results";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function normalizePinyin(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[āáǎà]/g, "a")
    .replace(/[ēéěè]/g, "e")
    .replace(/[īíǐì]/g, "i")
    .replace(/[ōóǒò]/g, "o")
    .replace(/[ūúǔù]/g, "u")
    .replace(/[ǖǘǚǜü]/g, "u")
    .replace(/\s+/g, " ");
}

function pinyinMatch(input, answer) {
  return normalizePinyin(input) === normalizePinyin(answer);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getExam(levelId, isHsk = false) {
  const exams = isHsk ? HSK_EXAMS : EXAMS;
  const variants = exams[levelId];
  const variant = Math.random() < 0.5 ? variants.a : variants.b;
  return shuffle(variant);
}

const HSK_PASS_MESSAGES = {
  hsk1: "You're ready for HSK 2 preparation!",
  hsk2: "HSK 2 level — you have basic everyday Chinese!",
  hsk3: "HSK 3 level — you can handle daily Chinese situations!",
  hsk4: "HSK 4 level — upper-intermediate Mandarin fluency!",
};

function pct(score, total = TOTAL_Q) {
  return Math.round((score / total) * 100);
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function loadResults() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}

function saveResult(levelId, score) {
  const all = loadResults();
  const prev = all[levelId] || { bestScore: 0, attempts: 0 };
  all[levelId] = {
    bestScore: Math.max(prev.bestScore, score),
    lastScore: score,
    attempts: prev.attempts + 1,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function getRating(percentage) {
  if (percentage >= 90) return { label: "Excellent!", sub: "You've mastered this level. Try the next one!", color: C.jade };
  if (percentage >= 80) return { label: "Great!", sub: "You're ready for the next level.", color: C.jadeSoft };
  if (percentage >= 60) return { label: "Good foundation.", sub: "We recommend starting at this level.", color: C.gold };
  return { label: "Keep practising.", sub: "We recommend starting at the level below this one.", color: C.red };
}

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────

function Btn({ children, onClick, color = C.red, secondary, style: sx = {}, disabled }) {
  const base = {
    width: "100%", padding: "14px 20px", borderRadius: 10, border: "none",
    cursor: disabled ? "not-allowed" : "pointer", fontSize: 15, fontWeight: 600,
    fontFamily: "'Helvetica Neue', sans-serif", letterSpacing: 0.3,
    transition: "opacity 0.15s, transform 0.1s",
    opacity: disabled ? 0.45 : 1,
    ...(secondary
      ? { background: "transparent", color: color, border: `1.5px solid ${color}50` }
      : { background: color, color: C.white }),
    ...sx,
  };
  return (
    <button style={base} onClick={disabled ? undefined : onClick}>
      {children}
    </button>
  );
}

function Card({ children, style: sx = {} }) {
  return (
    <div style={{
      background: C.white, borderRadius: 14, padding: "20px 20px 18px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      ...sx,
    }}>
      {children}
    </div>
  );
}

function ProgressBar({ value, max, color = C.jade, thin }) {
  return (
    <div style={{ width: "100%", height: thin ? 4 : 6, background: C.greyLight, borderRadius: 3, overflow: "hidden" }}>
      <div style={{
        width: `${Math.min(100, (value / max) * 100)}%`,
        height: "100%", background: color, borderRadius: 3,
        transition: "width 0.4s ease",
      }} />
    </div>
  );
}

// ─── WELCOME SCREEN ───────────────────────────────────────────────────────────

function LevelButton({ lv, index, saved, onClick, disabled }) {
  return (
    <button
      key={lv.id}
      onClick={disabled ? undefined : () => onClick(index)}
      style={{
        background: disabled ? C.inkDeep : C.inkLight,
        border: `1px solid ${disabled ? C.inkLight : lv.color + "30"}`,
        borderRadius: 12, padding: "14px 16px",
        display: "flex", alignItems: "center", gap: 14,
        cursor: disabled ? "default" : "pointer", textAlign: "left",
        transition: "border-color 0.2s", opacity: disabled ? 0.55 : 1,
      }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 10,
        background: lv.color + "22", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22,
      }}>
        {lv.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 15, fontWeight: 600, color: disabled ? C.grey : C.paper }}>
          {lv.name}
          {disabled && (
            <span style={{
              marginLeft: 8, fontSize: 10, padding: "2px 7px", borderRadius: 4,
              background: C.inkLight, color: C.grey, fontWeight: 400,
              letterSpacing: 1, textTransform: "uppercase",
            }}>
              Coming Soon
            </span>
          )}
        </div>
        <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: C.grey, marginTop: 1 }}>
          {lv.hsk} · {lv.description}
        </div>
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        {!disabled && saved ? (
          <>
            <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 14, fontWeight: 700, color: lv.color }}>
              {pct(saved.bestScore)}%
            </div>
            <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10, color: C.grey }}>
              best
            </div>
          </>
        ) : !disabled ? (
          <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: C.grey }}>→</div>
        ) : null}
      </div>
    </button>
  );
}

function WelcomeScreen({ onStart, onStartDiagnostic, onStartHsk, onStartHskDiagnostic }) {
  const [selectedTrack, setSelectedTrack] = useState(null); // null | "estc" | "hsk"
  const savedResults = loadResults();

  const Hero = () => (
    <div style={{
      background: `linear-gradient(170deg, ${C.inkDeep} 0%, ${C.inkLight} 100%)`,
      padding: "48px 24px 36px", textAlign: "center",
      borderBottom: `1px solid ${C.gold}30`,
    }}>
      <div style={{ fontSize: 52, fontWeight: 300, letterSpacing: 10, color: C.paper, marginBottom: 8, fontFamily: "'Noto Serif SC', serif" }}>
        中文水平测试
      </div>
      <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 14, letterSpacing: 4, textTransform: "uppercase", color: C.goldSoft, marginBottom: 6 }}>
        Mandarin Placement Test
      </div>
      <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: C.grey, letterSpacing: 1 }}>
        by Mandarin Project
      </div>
    </div>
  );

  const Footer = () => (
    <div style={{ marginTop: 40, textAlign: "center", fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11, color: C.grey, letterSpacing: 1 }}>
      © Mandarin Project — Placement Test v1.0
    </div>
  );

  const BackBtn = () => (
    <button
      onClick={() => setSelectedTrack(null)}
      style={{
        background: "none", border: "none", cursor: "pointer",
        color: C.grey, fontFamily: "'Helvetica Neue', sans-serif",
        fontSize: 13, padding: "0 0 20px", display: "flex", alignItems: "center", gap: 6,
      }}
    >
      ← Back to tracks
    </button>
  );

  // ── ESTC levels view ───────────────────────────────────────────────────────
  if (selectedTrack === "estc") {
    return (
      <div style={{ minHeight: "100vh", background: C.ink, display: "flex", flexDirection: "column" }}>
        <Hero />
        <div style={{ flex: 1, padding: "24px 20px 32px", maxWidth: 480, margin: "0 auto", width: "100%" }}>
          <BackBtn />
          <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11, textTransform: "uppercase", letterSpacing: 2, color: C.jadeSoft, marginBottom: 3 }}>
            📗 Easy Steps to Chinese (ESTC)
          </div>
          <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: C.grey, marginBottom: 16 }}>
            Based on Easy Steps to Chinese textbook series
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {LEVEL_META.map((lv, i) => (
              <LevelButton key={lv.id} lv={lv} index={i} saved={savedResults[lv.id]} onClick={onStart} />
            ))}
          </div>
          <Card style={{ background: C.inkLight, border: `1px solid ${C.jadeSoft}20`, marginBottom: 24 }}>
            <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 13, color: C.grey, marginBottom: 12, lineHeight: 1.6 }}>
              Don't know your level? Run the full ESTC diagnostic — it advances through each book automatically.
            </div>
            <button
              onClick={onStartDiagnostic}
              style={{
                width: "100%", padding: "13px 16px", borderRadius: 10,
                border: `1.5px solid ${C.jadeSoft}40`, background: C.jade + "18",
                color: C.jadeSoft, cursor: "pointer",
                fontFamily: "'Helvetica Neue', sans-serif", fontSize: 14, fontWeight: 600,
              }}
            >
              Start ESTC Diagnostic →
            </button>
          </Card>
          <Footer />
        </div>
      </div>
    );
  }

  // ── HSK levels view ────────────────────────────────────────────────────────
  if (selectedTrack === "hsk") {
    return (
      <div style={{ minHeight: "100vh", background: C.ink, display: "flex", flexDirection: "column" }}>
        <Hero />
        <div style={{ flex: 1, padding: "24px 20px 32px", maxWidth: 480, margin: "0 auto", width: "100%" }}>
          <BackBtn />
          <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11, textTransform: "uppercase", letterSpacing: 2, color: "#818cf8", marginBottom: 3 }}>
            📋 HSK 2.0 Exam Preparation
          </div>
          <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: C.grey, marginBottom: 16 }}>
            Official Chinese Proficiency Test prep · Independent study path
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {HSK_LEVEL_META.map((lv, i) => (
              <LevelButton key={lv.id} lv={lv} index={i} saved={savedResults[lv.id]} onClick={onStartHsk} disabled={lv.comingSoon} />
            ))}
          </div>
          <Card style={{ background: C.inkLight, border: "1px solid #4f46e520", marginBottom: 24 }}>
            <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 13, color: C.grey, marginBottom: 12, lineHeight: 1.6 }}>
              Not sure of your HSK level? Run the HSK diagnostic — it progresses from HSK 1 through HSK 4 automatically.
            </div>
            <button
              onClick={onStartHskDiagnostic}
              style={{
                width: "100%", padding: "13px 16px", borderRadius: 10,
                border: "1.5px solid #4f46e540", background: "#4f46e518",
                color: "#818cf8", cursor: "pointer",
                fontFamily: "'Helvetica Neue', sans-serif", fontSize: 14, fontWeight: 600,
              }}
            >
              Start HSK Diagnostic →
            </button>
          </Card>
          <Footer />
        </div>
      </div>
    );
  }

  // ── Track selection (default) ──────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: C.ink, display: "flex", flexDirection: "column" }}>
      <Hero />
      <div style={{ flex: 1, padding: "24px 20px 32px", maxWidth: 480, margin: "0 auto", width: "100%" }}>

        <p style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 14, color: C.dim, textAlign: "center", marginBottom: 8, lineHeight: 1.7 }}>
          Find out your Mandarin level.
        </p>
        <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11, textTransform: "uppercase", letterSpacing: 2, color: C.grey, marginBottom: 16, textAlign: "center" }}>
          Choose Your Exam Track
        </div>

        {/* Track cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 28 }}>

          {/* ESTC Card */}
          <button
            onClick={() => setSelectedTrack("estc")}
            style={{
              background: C.inkLight, border: `1.5px solid ${C.jadeSoft}28`,
              borderRadius: 14, padding: "20px 20px 18px",
              textAlign: "left", cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
              <div style={{ width: 50, height: 50, borderRadius: 12, background: C.jade + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>
                📗
              </div>
              <div>
                <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 17, fontWeight: 700, color: C.paper, marginBottom: 2 }}>
                  Easy Steps to Chinese
                </div>
                <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: C.jadeSoft }}>
                  ESTC Track · 6 levels
                </div>
              </div>
            </div>
            <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 13, color: C.grey, lineHeight: 1.6, marginBottom: 12 }}>
              Based on the Easy Steps to Chinese textbook series. Ideal if you're studying with Mandarin Project classes.
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["Intro", "Book 1", "Book 2", "Book 3", "Book 4", "Book 5"].map(tag => (
                <span key={tag} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: C.jade + "18", color: C.jadeSoft, fontFamily: "'Helvetica Neue', sans-serif" }}>
                  {tag}
                </span>
              ))}
            </div>
          </button>

          {/* HSK Card */}
          <button
            onClick={() => setSelectedTrack("hsk")}
            style={{
              background: C.inkLight, border: "1.5px solid #4f46e528",
              borderRadius: 14, padding: "20px 20px 18px",
              textAlign: "left", cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
              <div style={{ width: 50, height: 50, borderRadius: 12, background: "#4f46e522", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, flexShrink: 0 }}>
                📋
              </div>
              <div>
                <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 17, fontWeight: 700, color: C.paper, marginBottom: 2 }}>
                  HSK 2.0
                </div>
                <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: "#818cf8" }}>
                  HSK Track · HSK 1–4 active
                </div>
              </div>
            </div>
            <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 13, color: C.grey, lineHeight: 1.6, marginBottom: 12 }}>
              Official Chinese Proficiency Test preparation. Covers HSK 1–4 vocabulary and grammar structures.
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["HSK 1", "HSK 2", "HSK 3", "HSK 4"].map(tag => (
                <span key={tag} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: "#4f46e518", color: "#818cf8", fontFamily: "'Helvetica Neue', sans-serif" }}>
                  {tag}
                </span>
              ))}
              {["HSK 5", "HSK 6"].map(tag => (
                <span key={tag} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, background: C.inkDeep, color: C.grey, fontFamily: "'Helvetica Neue', sans-serif" }}>
                  {tag} soon
                </span>
              ))}
            </div>
          </button>
        </div>

        {/* Full Diagnostic */}
        <Card style={{ background: C.inkLight, border: `1px solid ${C.gold}30`, marginBottom: 24 }}>
          <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: 18, color: C.paper, marginBottom: 4 }}>
            Full Diagnostic
          </div>
          <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 13, color: C.grey, marginBottom: 14, lineHeight: 1.6 }}>
            Progress through all levels automatically. Stops at your ceiling. Choose a track:
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onStartDiagnostic}
              style={{
                flex: 1, padding: "12px 10px", borderRadius: 10,
                border: `1.5px solid ${C.jadeSoft}40`, background: C.jade + "18",
                color: C.jadeSoft, cursor: "pointer",
                fontFamily: "'Helvetica Neue', sans-serif", fontSize: 13, fontWeight: 600,
              }}
            >
              📗 ESTC
            </button>
            <button
              onClick={onStartHskDiagnostic}
              style={{
                flex: 1, padding: "12px 10px", borderRadius: 10,
                border: "1.5px solid #4f46e540", background: "#4f46e518",
                color: "#818cf8", cursor: "pointer",
                fontFamily: "'Helvetica Neue', sans-serif", fontSize: 13, fontWeight: 600,
              }}
            >
              📋 HSK
            </button>
          </div>
        </Card>

        <Footer />
      </div>
    </div>
  );
}

// ─── EXAM SCREEN ──────────────────────────────────────────────────────────────

function ExamScreen({ levelIndex, onComplete, onBack, isDiagnostic, isHsk }) {
  const lv = isHsk ? HSK_LEVEL_META[levelIndex] : LEVEL_META[levelIndex];
  const [questions]   = useState(() => getExam(lv.id, isHsk));
  const [current, setCurrent]     = useState(0);
  const [answers, setAnswers]     = useState([]);
  const [selected, setSelected]   = useState(null);   // MC selection
  const [textInput, setTextInput] = useState("");     // pinyin input
  const [elapsed, setElapsed]     = useState(0);
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const q = questions[current];
  const isPinyin = q.type === "pinyin";
  const isMC     = q.type === "match" || q.type === "hanzi" || q.type === "translate";

  const canAdvance = selected !== null || (isPinyin && textInput.trim().length > 0);

  function submitAnswer() {
    if (!canAdvance) return;
    let isCorrect;
    if (isPinyin) {
      isCorrect = pinyinMatch(textInput, q.answer);
    } else {
      isCorrect = selected === q.answer;
    }
    const newAnswers = [...answers, { questionIndex: current, correct: isCorrect }];
    setAnswers(newAnswers);
    setSelected(null);
    setTextInput("");

    if (current + 1 >= TOTAL_Q) {
      clearInterval(timerRef.current);
      const score = newAnswers.filter(a => a.correct).length;
      saveResult(lv.id, score);
      onComplete({ levelIndex, score, total: TOTAL_Q, elapsed, questions, answers: newAnswers });
    } else {
      setCurrent(c => c + 1);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKey(e) {
    if (e.key === "Enter") submitAnswer();
  }

  return (
    <div style={{ minHeight: "100vh", background: C.ink, display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{
        background: C.inkDeep, padding: "14px 20px",
        display: "flex", alignItems: "center", gap: 12,
        borderBottom: `1px solid ${C.inkLight}`,
      }}>
        <button
          onClick={onBack}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: C.grey, fontSize: 18, padding: "2px 6px", borderRadius: 6,
            fontFamily: "'Helvetica Neue', sans-serif",
          }}
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
          <div style={{
            fontFamily: "'Helvetica Neue', sans-serif", fontSize: 13,
            fontWeight: 600, color: C.dim,
          }}>
            {lv.icon} {lv.name} {isDiagnostic && <span style={{ color: C.gold, fontSize: 11 }}>· Diagnostic</span>}
          </div>
          <ProgressBar value={current} max={TOTAL_Q} color={lv.color} thin />
        </div>
        <div style={{
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: C.grey,
          minWidth: 48, textAlign: "right",
        }}>
          {formatTime(elapsed)}
        </div>
      </div>

      {/* Question counter */}
      <div style={{
        padding: "18px 24px 0",
        fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12,
        color: C.grey, textAlign: "center", letterSpacing: 1,
      }}>
        Question {current + 1} / {TOTAL_Q}
      </div>

      {/* Question */}
      <div style={{ flex: 1, padding: "20px 20px 16px", maxWidth: 480, margin: "0 auto", width: "100%" }}>
        <Card style={{ background: C.inkLight, border: `1px solid ${lv.color}25`, marginBottom: 20 }}>
          {/* Type badge */}
          <div style={{
            fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10,
            textTransform: "uppercase", letterSpacing: 2,
            color: lv.color, marginBottom: 10, fontWeight: 600,
          }}>
            {q.type === "match" ? "Choose the meaning" :
             q.type === "pinyin" ? "Type the pinyin" :
             q.type === "hanzi" ? "Select the character" :
             "Choose the translation"}
          </div>
          <div style={{
            fontFamily: q.question.match(/[\u4e00-\u9fff]/) ? "'Noto Serif SC', serif" : "'Helvetica Neue', sans-serif",
            fontSize: q.question.match(/[\u4e00-\u9fff]/) ? 30 : 17,
            color: C.paper, lineHeight: 1.4, fontWeight: 400,
          }}>
            {q.question}
          </div>
        </Card>

        {/* Answer area */}
        {isMC && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {q.options.map((opt, i) => {
              const isSelected = selected === i;
              return (
                <button
                  key={i}
                  onClick={() => setSelected(i)}
                  style={{
                    background: isSelected ? lv.color + "22" : C.inkLight,
                    border: `1.5px solid ${isSelected ? lv.color : C.inkLight}`,
                    borderRadius: 10, padding: "14px 18px",
                    textAlign: "left", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 12,
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                >
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%",
                    background: isSelected ? lv.color : C.ink,
                    border: `1.5px solid ${isSelected ? lv.color : C.grey}40`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700,
                    color: isSelected ? C.white : C.grey,
                    fontFamily: "'Helvetica Neue', sans-serif",
                    flexShrink: 0,
                  }}>
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span style={{
                    fontFamily: opt.match(/[\u4e00-\u9fff]/) ? "'Noto Serif SC', serif" : "'Helvetica Neue', sans-serif",
                    fontSize: opt.match(/[\u4e00-\u9fff]/) ? 18 : 15,
                    color: isSelected ? C.paper : C.dim,
                  }}>
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {isPinyin && (
          <div>
            <input
              ref={inputRef}
              autoFocus
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type pinyin here (e.g. nǐ hǎo or ni hao)"
              style={{
                width: "100%", padding: "16px 18px", borderRadius: 10,
                border: `1.5px solid ${textInput ? lv.color : C.inkLight}`,
                background: C.inkLight, color: C.paper,
                fontFamily: "'Helvetica Neue', sans-serif", fontSize: 16,
                outline: "none", transition: "border-color 0.15s",
              }}
            />
            <div style={{
              fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
              color: C.grey, marginTop: 8, textAlign: "center",
            }}>
              Tone marks optional — ni hao = nǐ hǎo
            </div>
          </div>
        )}

        {/* Submit */}
        <div style={{ marginTop: 24 }}>
          <Btn
            color={lv.color}
            onClick={submitAnswer}
            disabled={!canAdvance}
          >
            {current + 1 === TOTAL_Q ? "Finish Exam" : "Next →"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── RESULTS SCREEN ───────────────────────────────────────────────────────────

function ResultsScreen({ result, onTryNext, onRetry, onHome, onViewSummary, isDiagnostic, isHsk }) {
  const { levelIndex, score, total, elapsed, questions, answers } = result;
  const meta = isHsk ? HSK_LEVEL_META : LEVEL_META;
  const lv = meta[levelIndex];
  const percentage = pct(score, total);
  const rating = getRating(percentage);
  const nextLevel = meta[levelIndex + 1];
  const canTryNext = percentage >= RECOMMEND_THRESHOLD && !!nextLevel && !nextLevel.comingSoon;

  function handleShare() {
    const text = `I scored ${percentage}% on the ${lv.name} Mandarin Placement Test by Mandarin Project! 🎉 Test your level too!`;
    navigator.clipboard?.writeText(text).then(() => alert("Copied to clipboard!"));
  }

  return (
    <div style={{ minHeight: "100vh", background: C.ink, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(170deg, ${C.inkDeep} 0%, ${C.inkLight} 100%)`,
        padding: "40px 24px 32px", textAlign: "center",
        borderBottom: `1px solid ${lv.color}30`,
      }}>
        <div style={{ fontSize: 48, marginBottom: 6 }}>{lv.icon}</div>
        <div style={{
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12,
          letterSpacing: 3, textTransform: "uppercase",
          color: lv.color, marginBottom: 6,
        }}>
          {lv.name} · {lv.hsk}
        </div>
        <div style={{
          fontFamily: "'Noto Serif SC', serif", fontSize: 52,
          fontWeight: 700, color: rating.color, lineHeight: 1,
        }}>
          {percentage}<span style={{ fontSize: 28, fontWeight: 300 }}>%</span>
        </div>
        <div style={{
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 14,
          color: C.dim, marginTop: 4,
        }}>
          {score} / {total} correct · {formatTime(elapsed)}
        </div>
      </div>

      <div style={{ flex: 1, padding: "24px 20px 32px", maxWidth: 480, margin: "0 auto", width: "100%" }}>

        {/* Rating card */}
        <Card style={{ background: C.inkLight, border: `1.5px solid ${rating.color}40`, marginBottom: 20, textAlign: "center" }}>
          <div style={{
            fontFamily: "'Helvetica Neue', sans-serif", fontSize: 18,
            fontWeight: 700, color: rating.color, marginBottom: 6,
          }}>
            {rating.label}
          </div>
          <div style={{
            fontFamily: "'Helvetica Neue', sans-serif", fontSize: 14,
            color: C.dim, lineHeight: 1.6,
          }}>
            {isHsk && percentage >= PASS_THRESHOLD && HSK_PASS_MESSAGES[lv.id]
              ? HSK_PASS_MESSAGES[lv.id]
              : rating.sub}
          </div>
        </Card>

        {/* Score breakdown */}
        <Card style={{ background: C.inkLight, marginBottom: 20 }}>
          <div style={{
            fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
            textTransform: "uppercase", letterSpacing: 2, color: C.grey, marginBottom: 12,
          }}>
            Score Breakdown
          </div>
          <ProgressBar value={score} max={total} color={rating.color} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <span style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: C.jadeSoft }}>
              ✓ {score} correct
            </span>
            <span style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: C.redSoft }}>
              ✗ {total - score} incorrect
            </span>
          </div>
        </Card>

        {/* Question review */}
        <Card style={{ background: C.inkLight, marginBottom: 24 }}>
          <div style={{
            fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
            textTransform: "uppercase", letterSpacing: 2, color: C.grey, marginBottom: 12,
          }}>
            Question Review
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {answers.map((a, i) => (
              <div
                key={i}
                style={{
                  width: 32, height: 32, borderRadius: 6,
                  background: a.correct ? C.jadeSoft + "22" : C.redSoft + "22",
                  border: `1px solid ${a.correct ? C.jadeSoft : C.redSoft}40`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700,
                  color: a.correct ? C.jadeSoft : C.redSoft,
                  fontFamily: "'Helvetica Neue', sans-serif",
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </Card>

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {canTryNext && !isDiagnostic && (
            <Btn color={lv.color} onClick={onTryNext}>
              Try {nextLevel.name} →
            </Btn>
          )}
          <Btn color={C.blue} onClick={onRetry} secondary>
            Try Again
          </Btn>
          {isDiagnostic && (
            <Btn color={C.gold} style={{ color: C.ink }} onClick={onViewSummary}>
              View Diagnostic Summary
            </Btn>
          )}
          <Btn color={C.grey} onClick={handleShare} secondary>
            Share Result 📤
          </Btn>
          <Btn color={C.grey} onClick={onHome} secondary>
            Back to Home
          </Btn>
        </div>

        <div style={{
          marginTop: 32, textAlign: "center",
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
          color: C.grey, letterSpacing: 1,
        }}>
          © Mandarin Project — Placement Test v1.0
        </div>
      </div>
    </div>
  );
}

// ─── DIAGNOSTIC SUMMARY SCREEN ────────────────────────────────────────────────

function DiagnosticSummaryScreen({ history, onRetry, onHome, isHsk }) {
  const meta = isHsk ? HSK_LEVEL_META : LEVEL_META;
  const activeMeta = isHsk ? meta.filter(lv => !lv.comingSoon) : meta;
  const lastPassed = [...history].reverse().find(h => pct(h.score) >= PASS_THRESHOLD);
  const recommended = lastPassed ? meta[lastPassed.levelIndex] : meta[0];

  // If they passed all active levels
  const passedAll = history.length === activeMeta.length &&
    pct(history[history.length - 1].score) >= PASS_THRESHOLD;

  function handleShare() {
    const text = `I completed the Mandarin Project Placement Test! My recommended level: ${recommended.name} (${recommended.hsk}). 🎉`;
    navigator.clipboard?.writeText(text).then(() => alert("Copied to clipboard!"));
  }

  return (
    <div style={{ minHeight: "100vh", background: C.ink, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(170deg, ${C.inkDeep} 0%, ${C.inkLight} 100%)`,
        padding: "40px 24px 32px", textAlign: "center",
        borderBottom: `1px solid ${isHsk ? "#4f46e530" : C.gold + "30"}`,
      }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
        <div style={{
          fontFamily: "'Noto Serif SC', serif", fontSize: 24,
          color: C.paper, marginBottom: 4,
        }}>
          诊断结果
        </div>
        <div style={{
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 13,
          letterSpacing: 2, textTransform: "uppercase",
          color: isHsk ? "#818cf8" : C.goldSoft,
        }}>
          {isHsk ? "HSK Track · Diagnostic Results" : "ESTC Track · Diagnostic Results"}
        </div>
      </div>

      <div style={{ flex: 1, padding: "24px 20px 32px", maxWidth: 480, margin: "0 auto", width: "100%" }}>

        {/* Recommendation card */}
        <Card style={{
          background: C.inkLight,
          border: `1.5px solid ${C.gold}50`,
          marginBottom: 24, textAlign: "center",
        }}>
          <div style={{
            fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
            textTransform: "uppercase", letterSpacing: 2, color: C.gold,
            marginBottom: 8,
          }}>
            {passedAll ? "🏆 Outstanding!" : isHsk ? "Your HSK Level" : "Your Recommended Starting Level"}
          </div>
          {passedAll ? (
            <div style={{
              fontFamily: "'Helvetica Neue', sans-serif", fontSize: 16,
              color: C.paper, lineHeight: 1.6,
            }}>
              {isHsk
                ? "You passed HSK 1–4! You have upper-intermediate Mandarin proficiency."
                : "You passed all ESTC levels! You have advanced Mandarin proficiency."}
            </div>
          ) : (
            <>
              <div style={{
                fontFamily: "'Noto Serif SC', serif", fontSize: 28,
                color: recommended.color, marginBottom: 4,
              }}>
                {recommended.icon} {recommended.name}
              </div>
              <div style={{
                fontFamily: "'Helvetica Neue', sans-serif", fontSize: 13,
                color: C.grey,
              }}>
                {recommended.hsk} · {recommended.description}
              </div>
            </>
          )}
        </Card>

        {/* Per-level results */}
        <Card style={{ background: C.inkLight, marginBottom: 20 }}>
          <div style={{
            fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
            textTransform: "uppercase", letterSpacing: 2, color: C.grey, marginBottom: 14,
          }}>
            Level Breakdown
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {history.map((h) => {
              const lv = meta[h.levelIndex];
              const p = pct(h.score);
              const passed = p >= PASS_THRESHOLD;
              return (
                <div key={h.levelIndex}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{
                      fontFamily: "'Helvetica Neue', sans-serif", fontSize: 13,
                      color: C.dim, display: "flex", alignItems: "center", gap: 6,
                    }}>
                      {lv.icon} {lv.name}
                      <span style={{
                        fontSize: 10, padding: "1px 6px", borderRadius: 4,
                        background: passed ? C.jade + "25" : C.red + "25",
                        color: passed ? C.jadeSoft : C.redSoft,
                        fontWeight: 600,
                      }}>
                        {passed ? "PASSED" : "STOPPED"}
                      </span>
                    </span>
                    <span style={{
                      fontFamily: "'Helvetica Neue', sans-serif", fontSize: 13,
                      fontWeight: 700, color: passed ? C.jadeSoft : C.redSoft,
                    }}>
                      {h.score}/{h.total} · {p}%
                    </span>
                  </div>
                  <ProgressBar value={h.score} max={h.total} color={passed ? C.jade : C.red} thin />
                </div>
              );
            })}
          </div>
        </Card>

        {/* Enrol CTA */}
        <Card style={{ background: C.inkLight, border: `1px solid ${C.gold}25`, marginBottom: 20, textAlign: "center" }}>
          <div style={{
            fontFamily: "'Helvetica Neue', sans-serif", fontSize: 14,
            fontWeight: 600, color: C.paper, marginBottom: 6,
          }}>
            Ready to start learning?
          </div>
          <div style={{
            fontFamily: "'Helvetica Neue', sans-serif", fontSize: 13,
            color: C.grey, marginBottom: 14, lineHeight: 1.6,
          }}>
            Contact Mandarin Project to enrol at your recommended level.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <a
              href="https://wa.me/message/CONTACT"
              style={{
                display: "block", padding: "12px 16px", borderRadius: 10,
                background: "#25D366", color: C.white, textDecoration: "none",
                fontFamily: "'Helvetica Neue', sans-serif", fontSize: 14,
                fontWeight: 600, textAlign: "center",
              }}
            >
              📱 WhatsApp Mandarin Project
            </a>
          </div>
        </Card>

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Btn color={C.gold} style={{ color: C.ink }} onClick={handleShare}>
            Share My Results 📤
          </Btn>
          <Btn color={isHsk ? "#4f46e5" : C.blue} onClick={onRetry} secondary>
            Retake {isHsk ? "HSK" : "ESTC"} Diagnostic
          </Btn>
          <Btn color={C.grey} onClick={onHome} secondary>
            Back to Home
          </Btn>
        </div>

        <div style={{
          marginTop: 32, textAlign: "center",
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
          color: C.grey, letterSpacing: 1,
        }}>
          © Mandarin Project — Placement Test v1.0
        </div>
      </div>
    </div>
  );
}

// ─── DIAGNOSTIC EXIT SCREEN ───────────────────────────────────────────────────
// Shown mid-diagnostic when score < 80%

function DiagnosticStopScreen({ result, history, onContinue, onSummary, onHome }) {
  const lv = LEVEL_META[result.levelIndex];
  const percentage = pct(result.score);

  // recommend: if failed intro (first level), recommend intro. Otherwise recommend the level just attempted.
  const prevLevelIndex = result.levelIndex > 0 ? result.levelIndex - 1 : 0;
  const recommended = LEVEL_META[percentage >= RECOMMEND_THRESHOLD ? result.levelIndex : prevLevelIndex];

  return (
    <div style={{ minHeight: "100vh", background: C.ink, display: "flex", flexDirection: "column" }}>
      <div style={{
        background: `linear-gradient(170deg, ${C.inkDeep} 0%, ${C.inkLight} 100%)`,
        padding: "40px 24px 32px", textAlign: "center",
        borderBottom: `1px solid ${C.red}30`,
      }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🎯</div>
        <div style={{
          fontFamily: "'Noto Serif SC', serif", fontSize: 22,
          color: C.paper, marginBottom: 4,
        }}>
          Level Found
        </div>
        <div style={{
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 13,
          color: C.grey,
        }}>
          {lv.name} · {percentage}%
        </div>
      </div>

      <div style={{ flex: 1, padding: "24px 20px 32px", maxWidth: 480, margin: "0 auto", width: "100%" }}>
        <Card style={{
          background: C.inkLight, border: `1.5px solid ${C.gold}40`,
          marginBottom: 24, textAlign: "center",
        }}>
          <div style={{
            fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12,
            textTransform: "uppercase", letterSpacing: 2, color: C.gold,
            marginBottom: 8,
          }}>
            Based on your results, we recommend
          </div>
          <div style={{
            fontFamily: "'Noto Serif SC', serif", fontSize: 28,
            color: recommended.color, marginBottom: 4,
          }}>
            {recommended.icon} {recommended.name}
          </div>
          <div style={{
            fontFamily: "'Helvetica Neue', sans-serif", fontSize: 13,
            color: C.grey,
          }}>
            {recommended.hsk} · {recommended.description}
          </div>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Btn color={C.gold} style={{ color: C.ink }} onClick={onSummary}>
            View Full Summary
          </Btn>
          <Btn color={C.grey} onClick={onHome} secondary>
            Back to Home
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen]             = useState("welcome");
  const [levelIndex, setLevelIndex]     = useState(0);
  const [isDiagnostic, setIsDiagnostic] = useState(false);
  const [isHskTrack, setIsHskTrack]     = useState(false);
  const [lastResult, setLastResult]     = useState(null);
  const [diagHistory, setDiagHistory]   = useState([]);
  const [diagStopped, setDiagStopped]   = useState(false);

  // scroll to top on screen change
  useEffect(() => { window.scrollTo(0, 0); }, [screen]);

  function startSingleLevel(index) {
    setLevelIndex(index);
    setIsHskTrack(false);
    setIsDiagnostic(false);
    setScreen("exam");
  }

  function startHskLevel(index) {
    setLevelIndex(index);
    setIsHskTrack(true);
    setIsDiagnostic(false);
    setScreen("exam");
  }

  function startDiagnostic() {
    setLevelIndex(0);
    setIsHskTrack(false);
    setIsDiagnostic(true);
    setDiagHistory([]);
    setDiagStopped(false);
    setScreen("exam");
  }

  function startHskDiagnostic() {
    setLevelIndex(0);
    setIsHskTrack(true);
    setIsDiagnostic(true);
    setDiagHistory([]);
    setDiagStopped(false);
    setScreen("exam");
  }

  function handleExamComplete(result) {
    setLastResult(result);
    const p = pct(result.score);

    if (isDiagnostic) {
      const newHistory = [...diagHistory, result];
      setDiagHistory(newHistory);

      const meta = isHskTrack ? HSK_LEVEL_META : LEVEL_META;
      const nextMeta = meta[result.levelIndex + 1];
      if (p >= PASS_THRESHOLD && nextMeta && !nextMeta.comingSoon) {
        // auto-advance after a brief results screen
        setScreen("results");
      } else {
        // stop diagnostic
        setDiagStopped(true);
        setScreen("results");
      }
    } else {
      setScreen("results");
    }
  }

  function handleTryNext() {
    if (isDiagnostic && !diagStopped) {
      // Coming from "auto-advance" results — go to next level
      setLevelIndex(l => l + 1);
      setScreen("exam");
    } else {
      setLevelIndex(l => l + 1);
      setIsDiagnostic(false);
      setScreen("exam");
    }
  }

  function handleRetry() {
    setScreen("exam");
  }

  function handleDiagnosticSummary() {
    setScreen("diagnostic-summary");
  }

  function goHome() {
    setScreen("welcome");
    setIsDiagnostic(false);
    setIsHskTrack(false);
    setDiagHistory([]);
  }

  if (screen === "welcome") {
    return (
      <WelcomeScreen
        onStart={startSingleLevel}
        onStartDiagnostic={startDiagnostic}
        onStartHsk={startHskLevel}
        onStartHskDiagnostic={startHskDiagnostic}
      />
    );
  }

  if (screen === "exam") {
    return (
      <ExamScreen
        key={`${levelIndex}-${isDiagnostic}-${isHskTrack}-${Date.now()}`}
        levelIndex={levelIndex}
        isDiagnostic={isDiagnostic}
        isHsk={isHskTrack}
        onComplete={handleExamComplete}
        onBack={goHome}
      />
    );
  }

  if (screen === "results" && lastResult) {
    const p = pct(lastResult.score);
    const autoAdvance = isDiagnostic && !diagStopped && p >= PASS_THRESHOLD;

    return (
      <ResultsScreen
        result={lastResult}
        isDiagnostic={isDiagnostic}
        isHsk={isHskTrack}
        onTryNext={handleTryNext}
        onRetry={handleRetry}
        onHome={goHome}
        onViewSummary={handleDiagnosticSummary}
        autoAdvance={autoAdvance}
      />
    );
  }

  if (screen === "diagnostic-summary") {
    return (
      <DiagnosticSummaryScreen
        history={diagHistory}
        isHsk={isHskTrack}
        onRetry={isHskTrack ? startHskDiagnostic : startDiagnostic}
        onHome={goHome}
      />
    );
  }

  return null;
}
