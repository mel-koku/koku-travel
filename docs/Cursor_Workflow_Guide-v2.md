# 🧠 Koku – Cursor Workflow Guide (v2)
**Purpose:**  
Stay productive inside Cursor by keeping sessions short, structured, and context-aware.  
Each chat = one focused deliverable.  
End every session with a clear hand-off summary.

---

## 🧭 1. Session Flow

### 🚀 **Session Startup Template**
```
Project: Koku (Japan travel planner web app)
Phase: [e.g. Phase 2 – Trip Builder]
Chat #: [e.g. 2.3]
Goal(s):
1. [Short bullet]
2. [Short bullet]

Tech Stack: Next.js 14, TypeScript, Tailwind, Supabase
Design: Desktop-first (1024px+), Tablet (768–1024), Mobile (<768)
Deliverables: [List files or components]
```

### 🏁 **Session Wrap-Up Template**
```
✅ Completed:
⚙️ Issues / To-Do:
🧩 Next Session Handoff:
Summary in 2–3 sentences for context refresh.
```

---

## 🧱 2. Prompt Library

### 🧱 **Build / Create**
- “Create a new component called `LocationCard.tsx` with props for image, title, tags, and hover tooltip.”
- “Scaffold a new page `/trip-builder` using the design system’s Container and Section components.”
- “Generate mock JSON data for 10 Kyoto locations following the Location type schema.”

### 🧩 **Modify / Enhance / Refactor**
- “Refactor `ActivityCard.tsx` to accept dynamic category colors.”
- “Enhance `DaySelector.tsx` with keyboard navigation (ArrowUp/ArrowDown).”
- “Add tooltip on hover showing hours and price.”

### ✨ **Style & Polish**
- “Improve visual hierarchy with Tailwind spacing (use multiples of 8).”
- “Add hover/focus parity for accessibility.”
- “Ensure responsive behavior for 1440, 1024, 768, 480 widths.”

### 🧠 **Debug & Explain**
- “Explain in plain English what this function does.”
- “Identify why this component throws ‘undefined’ at line 42.”
- “Show me only the fixed lines.”

### 🧪 **Testing**
- “Generate manual test cases for Trip Builder steps 1–5.”
- “List edge cases for itinerary drag-and-drop.”
- “Write sample test data to stress-test Explore filters.”

---

## ⚡ 3. Micro-Prompts (Quick Actions)
```
"Summarize this file in one sentence."
"Show me just the props interface."
"Generate realistic mock data for this type."
"Give me a short commit message for the last 3 changes."
"Reinitialize context: Koku is a Japan travel itinerary builder. We’re on Phase [X]. Our goal is [...]."
```

Use these for instant context or output without scrolling the full guide.

---

## 🧰 4. Utilities & Shortcuts

### 🧾 **Commit Message Generator**
```
Summarize the latest changes as:
[Phase X.X] [Feature/Fix]: [Short Description]
```

### 🔁 **Context Refresh**
If Cursor forgets, paste:
```
Reinitialize context:
Koku – desktop-first Japan travel planner built in Next.js 14 + Tailwind + Supabase.
We’re currently in Phase [X], working on [feature].
```

### 📦 **Phase Checkpoint Example**
```
Phase 2 Summary:
✅ Trip Builder steps 1–5 working
⚙️ Algorithm basic version complete
🧩 Next: Itinerary layout & drag-drop integration
```

---

## 💡 5. Desktop-First Guidance (Quick Ref)
- **Default styles = desktop.**  
  Override for smaller screens with `md:` (tablet) and `sm:` (mobile).  
- **Map + Itinerary Split:** 40 % / 60 % ratio  
- **Grid layouts:**  
  `lg:grid-cols-3 xl:grid-cols-4 md:grid-cols-2 sm:grid-cols-1`  
- **Hover logic:** only enable on devices supporting `(hover: hover)`.  
- **Accessibility:** match hover with focus for keyboard users.

---

## 🧩 6. Cursor Session Best Practices

| 🧠 Practice | Why it matters |
|-------------|----------------|
| Keep chats 1–2 screens of code | Prevents context loss |
| End every session with summary + next steps | Smooth hand-offs |
| Test as you go | Avoids long debugging later |
| Commit after each milestone | Easy rollback & progress tracking |
| Ask for explanations often | Turns AI into a teacher |
| Keep this guide open | Ensures prompt consistency |

---

## 🧠 7. Visual Cues Legend
| Emoji | Meaning |
|-------|---------|
| 🧱 | Build / Create |
| 🧩 | Modify / Refactor |
| ✨ | Polish / Style |
| 🧠 | Debug / Explain |
| 🧪 | Test |
| 🧭 | Session Management |

---

## 🔎 8. Cursor Limit Warnings
**You’re near context limits when:**
- Cursor forgets file paths or variable names  
- It starts redefining existing components  
- Responses become shorter or vague  

→ Wrap up and start a **new chat** using the Session Startup Template.

---

## 🧾 9. Koku-Specific QA Checklist (Phase 7)
- Verify all 5 Trip Builder steps validate inputs.  
- Test drag-drop between days (desktop).  
- Confirm Explore filters persist via URL params.  
- Check map markers highlight activities on hover.  
- Run Lighthouse: performance + accessibility > 90.  

---

## ✅ 10. Closing Reminders
1. **Build in small slices.**  
2. **Test visually often.**  
3. **Document what you finish.**  
4. **Commit early, commit often.**  
5. **Use this guide like a compass, not a script.**

---

**End of File**
