import { useState } from "react";
import { ConceptMap, Legend } from "../components/ConceptMap";
import { Icon } from "../components/Icon";
import { Kai } from "../components/Kai";
import { Shell } from "../components/Shell";
import { Button, Dialog, PrivateBadge } from "../components/ui";
import { confidenceLabels, todayLabel } from "../lib/data";
import { go } from "../lib/router";
import { useStore } from "../lib/store";

export function Summary() {
  const { profile, confidenceBefore, confidenceAfter, toast } = useStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const before = confidenceBefore ?? 4;
  const after = confidenceAfter ?? 4;
  const next = ["Teach Kai about infinite recursion (5 min)", "Trace fib(4) by hand", "Try Binary Trees next — it uses recursion!"];

  return (
    <Shell page="history">
      <header className="summary-head">
        <Kai size="md" mood="aha" />
        <div>
          <p className="eyebrow">SESSION REFLECTION · {todayLabel(true)}</p>
          <h1 tabIndex={-1}>Nice teaching, {profile.name}!</h1>
          <p>You helped Kai build a much clearer picture of recursion.</p>
        </div>
        <PrivateBadge />
      </header>

      <div className="stat-strip" aria-label="Session at a glance">
        <span><strong>5/6</strong> ideas Kai gets</span>
        <span><strong>1</strong> misconception repaired</span>
        <span><strong>1</strong> to revisit</span>
      </div>

      <section className="card final-map">
        <div><h2>Kai’s final understanding</h2><p>Here’s the picture you built together.</p><Legend /></div>
        <ConceptMap step={4} />
      </section>

      <div className="summary-grid">
        <section className="summary-card mint-card">
          <p className="eyebrow">EXPLAINED CLEARLY</p>
          <h2>4 ideas clicked</h2>
          <ul>{["Self-call", "Base case", "Smaller sub-problem", "Call stack"].map((x) => <li className="summary-item" key={x}><Icon name="check" />{x}</li>)}</ul>
        </section>
        <section className="summary-card teal-card">
          <p className="eyebrow">A MISCONCEPTION YOU REPAIRED</p>
          <h2>Return values combine</h2>
          <p>Kai first thought the base case value was the final answer. You fixed it by showing how results multiply on the way back up.</p>
        </section>
        <section className="summary-card amber-card">
          <p className="eyebrow">WORTH REVISITING</p>
          <h2>Infinite recursion</h2>
          <p>You didn’t cover what happens when there’s no base case yet.</p>
          <button type="button" className="text-link" onClick={() => go("meet")}>Teach this next <Icon name="arrowRight" size={16} /></button>
        </section>
        <section className="summary-card confidence-summary">
          <p className="eyebrow">CONFIDENCE VS EXPLANATION</p>
          <h2>{after < before ? "You calibrated your confidence" : "You found one hidden gap"}</h2>
          <div className="bar-line"><span>Before</span><i><b style={{ width: `${before * 20}%` }} /></i><em>{before}/5 · {confidenceLabels[before - 1]}</em></div>
          <div className="bar-line"><span>After</span><i><b className="after" style={{ width: `${after * 20}%` }} /></i><em>{after}/5 · {confidenceLabels[after - 1]}</em></div>
          <p>You felt confident going in, and Kai found one hidden gap — that’s exactly what this is for.</p>
        </section>
      </div>

      <section className="next-steps card">
        <div><p className="eyebrow">KEEP THE MOMENTUM</p><h2>Good next steps</h2></div>
        {next.map((x) => <label key={x}><input type="checkbox" />{x}</label>)}
      </section>

      <p className="disclaimer">This summary is an estimate based on the conversation. Disagree with something? Open the idea in Kai’s map and challenge it.</p>
      <div className="page-actions">
        <Button icon="check" onClick={() => { toast("Saved to your progress."); go("progress"); }}>Save to my progress</Button>
        <Button variant="secondary" icon="repeat" onClick={() => go("meet")}>Teach again</Button>
        <Button variant="ghost" icon="trash" onClick={() => setConfirmDelete(true)}>Delete this session</Button>
      </div>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} label="Delete session" className="small-modal">
        <span className="danger-icon"><Icon name="trash" size={26} /></span>
        <h2>Delete this session?</h2>
        <p>The conversation, map and reflection will be permanently removed. This can’t be undone.</p>
        <div className="button-row centered">
          <Button variant="danger" onClick={() => { toast("Session deleted."); go("home"); }}>Delete session</Button>
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Keep it</Button>
        </div>
      </Dialog>
    </Shell>
  );
}
