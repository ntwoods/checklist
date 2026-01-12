import React, { useEffect, useMemo, useState } from "react";
import TaskCard from "./TaskCard.jsx";
import { parsePlanned } from "../utils/date.js";

const webAppUrl = import.meta.env.VITE_GAS_WEBAPP_URL;

export default function TaskDashboard({ auth, onLogout, onToast }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(() => new Set());

  useEffect(() => {
    let isMounted = true;

    async function fetchTasks() {
      if (!webAppUrl) {
        onToast("Missing Apps Script Web App URL in .env");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `${webAppUrl}?action=getTasks&idToken=${encodeURIComponent(auth.idToken)}`
        );
        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data?.message || "Failed to fetch tasks");
        }

        const normalized = (data.tasks || [])
          .map((task) => {
            const plannedDate = parsePlanned(task.plannedStr);
            return { ...task, plannedDate };
          })
          .filter((task) => task.plannedDate instanceof Date)
          .sort((a, b) => a.plannedDate - b.plannedDate);

        if (isMounted) {
          setTasks(normalized);
        }
      } catch (error) {
        if (isMounted) {
          onToast(error.message || "Unable to load tasks");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchTasks();

    return () => {
      isMounted = false;
    };
  }, [auth.idToken, onToast]);

  const taskCountLabel = useMemo(() => {
    if (loading) {
      return "Loading";
    }
    return `${tasks.length} Pending Tasks`;
  }, [loading, tasks.length]);

  async function handleMarkDone(taskId) {
    if (!webAppUrl || processing.has(taskId)) {
      return;
    }

    setProcessing((prev) => new Set(prev).add(taskId));
    try {
      const response = await fetch(webAppUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify({
          action: "markDone",
          taskId,
          idToken: auth.idToken
        })
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data?.message || "Failed to mark task done");
      }

      setTasks((prev) => prev.filter((task) => task.taskId !== taskId));
      onToast("Successfully Marked as Done");
    } catch (error) {
      onToast(error.message || "Unable to update task");
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  }

  return (
    <main className="dashboard">
      <header className="header">
        <h1>NT Woods Checklist</h1>
        <p>{auth.email}</p>
        <div className="header-actions">
          <button className="button button-secondary" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      {loading ? (
        <div className="loading-wrap">
          <span className="spinner"></span>
          <span>{taskCountLabel}</span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">No Pending Tasks ??</div>
      ) : (
        <div className="task-grid">
          {tasks.map((task) => (
            <TaskCard
              key={task.taskId}
              task={task}
              onMarkDone={handleMarkDone}
              isUpdating={processing.has(task.taskId)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
