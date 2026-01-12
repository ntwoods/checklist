import React, { useMemo, useEffect, useState } from "react";
import {
  formatCountdown,
  formatDisplayDate,
  getCountdownTarget
} from "../utils/date.js";

export default function TaskCard({ task, onMarkDone, isUpdating }) {
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const displayDate = useMemo(() => formatDisplayDate(task.plannedDate), [task]);

  const countdown = useMemo(() => {
    const target = getCountdownTarget(task.plannedDate);
    if (!target) {
      return { isOverdue: false, text: "" };
    }
    const diff = target.getTime() - tick;
    return formatCountdown(diff);
  }, [task, tick]);

  return (
    <div className="task-card">
      <div className="task-meta">Task ID {task.taskId}</div>
      <div className="task-title">{task.task}</div>
      <div className="task-date">Planned: {displayDate}</div>
      <div className={`task-countdown ${countdown.isOverdue ? "overdue" : ""}`}>
        {countdown.text}
      </div>
      <div className="card-actions">
        <button
          className="button button-primary button-done"
          onClick={() => onMarkDone(task.taskId)}
          disabled={isUpdating}
        >
          {isUpdating ? <span className="spinner"></span> : "Mark Done"}
        </button>
      </div>
    </div>
  );
}
