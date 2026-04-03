import { useState, useEffect, useRef, useCallback } from "react";
import { LEVEL_META, EXAMS } from "./examData.js";

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

function getExam(levelId) {
  const variants = EXAMS[levelId];
  const variant = Math.random() < 0.5 ? variants.a : variants.b;
  return shuffle(variant);
}

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

function WelcomeScreen({ onStart, onStartDiagnostic }) {
  const savedResults = loadResults();

  return (
    <div style={{ minHeight: "100vh", background: C.ink, display: "flex", flexDirection: "column" }}>
      {/* Hero */}
      <div style={{
        background: `linear-gradient(170deg, ${C.inkDeep} 0%, ${C.inkLight} 100%)`,
        padding: "48px 24px 36px", textAlign: "center",
        borderBottom: `1px solid ${C.gold}30`,
      }}>
        <div style={{
          fontSize: 52, fontWeight: 300, letterSpacing: 10,
          color: C.paper, marginBottom: 8,
          fontFamily: "'Noto Serif SC', serif",
        }}>
          中文水平测试
        </div>
        <div style={{
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 14,
          letterSpacing: 4, textTransform: "uppercase",
          color: C.goldSoft, marginBottom: 6,
        }}>
          Mandarin Placement Test
        </div>
        <div style={{
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12,
          color: C.grey, letterSpacing: 1,
        }}>
          by Mandarin Project
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: "24px 20px 32px", maxWidth: 480, margin: "0 auto", width: "100%" }}>

        {/* Intro text */}
        <p style={{
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 14,
          color: C.dim, textAlign: "center", marginBottom: 28, lineHeight: 1.7,
        }}>
          Find out your Mandarin level. Choose a test below, or start from the beginning.
        </p>

        {/* Full diagnostic CTA */}
        <Card style={{ background: C.inkLight, border: `1px solid ${C.gold}30`, marginBottom: 24 }}>
          <div style={{ fontFamily: "'Noto Serif SC', serif", fontSize: 20, color: C.paper, marginBottom: 4 }}>
            Full Diagnostic
          </div>
          <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 13, color: C.grey, marginBottom: 16, lineHeight: 1.6 }}>
            Start from Intro level and progress through each level automatically. Stops when you reach your ceiling.
          </div>
          <Btn color={C.gold} style={{ color: C.ink }} onClick={onStartDiagnostic}>
            Start Full Diagnostic →
          </Btn>
        </Card>

        {/* Level selector */}
        <div style={{
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
          textTransform: "uppercase", letterSpacing: 2, color: C.grey,
          marginBottom: 12,
        }}>
          Or test a specific level
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {LEVEL_META.map((lv, i) => {
            const saved = savedResults[lv.id];
            return (
              <button
                key={lv.id}
                onClick={() => onStart(i)}
                style={{
                  background: C.inkLight, border: `1px solid ${lv.color}30`,
                  borderRadius: 12, padding: "14px 16px",
                  display: "flex", alignItems: "center", gap: 14,
                  cursor: "pointer", textAlign: "left",
                  transition: "border-color 0.2s",
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
                  <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 15, fontWeight: 600, color: C.paper }}>
                    {lv.name}
                  </div>
                  <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: C.grey, marginTop: 1 }}>
                    {lv.hsk} · {lv.description}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {saved ? (
                    <>
                      <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 14, fontWeight: 700, color: lv.color }}>
                        {pct(saved.bestScore)}%
                      </div>
                      <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 10, color: C.grey }}>
                        best
                      </div>
                    </>
                  ) : (
                    <div style={{ fontFamily: "'Helvetica Neue', sans-serif", fontSize: 12, color: C.grey }}>
                      →
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Branding footer */}
        <div style={{
          marginTop: 40, textAlign: "center",
          fontFamily: "'Helvetica Neue', sans-serif", fontSize: 11,
          color: C.grey, letterSpacing: 1,
        }}>
          © Mandarin Project — Placement Test v1.0
        </div>
      </div>
    </div>
  );
}

// ─── EXAM SCREEN ──────────────────────────────────────────────────────────────

function ExamScreen({ levelIndex, onComplete, onBack, isDiagnostic }) {
  const lv = LEVEL_META[levelIndex];
  const [questions]   = useState(() => getExam(lv.id));
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

function ResultsScreen({ result, onTryNext, onRetry, onHome, onViewSummary, isDiagnostic }) {
  const { levelIndex, score, total, elapsed, questions, answers } = result;
  const lv = LEVEL_META[levelIndex];
  const percentage = pct(score, total);
  const rating = getRating(percentage);
  const canTryNext = percentage >= RECOMMEND_THRESHOLD && levelIndex < LEVEL_META.length - 1;

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
            {rating.sub}
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
              Try {LEVEL_META[levelIndex + 1].name} →
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

function DiagnosticSummaryScreen({ history, onRetry, onHome }) {
  const lastPassed = [...history].reverse().find(h => pct(h.score) >= PASS_THRESHOLD);
  const recommended = lastPassed
    ? LEVEL_META[lastPassed.levelIndex]
    : LEVEL_META[0];

  // If they passed all levels
  const passedAll = history.length === LEVEL_META.length &&
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
        borderBottom: `1px solid ${C.gold}30`,
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
          color: C.goldSoft,
        }}>
          Diagnostic Results
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
            {passedAll ? "🏆 Outstanding!" : "Your Recommended Starting Level"}
          </div>
          {passedAll ? (
            <div style={{
              fontFamily: "'Helvetica Neue', sans-serif", fontSize: 16,
              color: C.paper, lineHeight: 1.6,
            }}>
              You passed all levels! You have advanced Mandarin proficiency.
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
              const lv = LEVEL_META[h.levelIndex];
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
          <Btn color={C.blue} onClick={onRetry} secondary>
            Retake Diagnostic
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
  const [lastResult, setLastResult]     = useState(null);
  const [diagHistory, setDiagHistory]   = useState([]);
  const [diagStopped, setDiagStopped]   = useState(false);

  // scroll to top on screen change
  useEffect(() => { window.scrollTo(0, 0); }, [screen]);

  function startSingleLevel(index) {
    setLevelIndex(index);
    setIsDiagnostic(false);
    setScreen("exam");
  }

  function startDiagnostic() {
    setLevelIndex(0);
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

      if (p >= PASS_THRESHOLD && result.levelIndex < LEVEL_META.length - 1) {
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
    setDiagHistory([]);
  }

  if (screen === "welcome") {
    return (
      <WelcomeScreen
        onStart={startSingleLevel}
        onStartDiagnostic={startDiagnostic}
      />
    );
  }

  if (screen === "exam") {
    return (
      <ExamScreen
        key={`${levelIndex}-${isDiagnostic}-${Date.now()}`}
        levelIndex={levelIndex}
        isDiagnostic={isDiagnostic}
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
        onTryNext={handleTryNext}
        onRetry={handleRetry}
        onHome={goHome}
        onViewSummary={handleDiagnosticSummary}
        // In diagnostic auto-advance mode, show "Next Level" prominently
        autoAdvance={autoAdvance}
      />
    );
  }

  if (screen === "diagnostic-summary") {
    return (
      <DiagnosticSummaryScreen
        history={diagHistory}
        onRetry={startDiagnostic}
        onHome={goHome}
      />
    );
  }

  return null;
}
