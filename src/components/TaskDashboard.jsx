import React, { useEffect, useMemo, useState } from "react";
import {
  formatCountdown,
  formatDisplayDate,
  formatDisplayDateTime,
  getCountdownTarget,
  parsePlanned
} from "../utils/date.js";

const webAppUrl = import.meta.env.VITE_GAS_WEBAPP_URL;
const adminEmail = "pc01@ntwoods.com";

const normalizeEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");

export default function TaskDashboard({ auth, onLogout, onToast }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(() => new Set());
  const [now, setNow] = useState(Date.now());
  const [selectedUser, setSelectedUser] = useState("all");

  const isAdmin = normalizeEmail(auth?.email) === adminEmail;

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
            const actualDate = parsePlanned(task.actualStr);
            return {
              ...task,
              plannedDate,
              actualDate,
              isCompleted: actualDate instanceof Date
            };
          })
          .filter((task) => task.plannedDate instanceof Date);

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

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const displayName = useMemo(() => {
    if (auth?.name) {
      return auth.name;
    }

    if (!isAdmin) {
      const fromTasks = tasks.find((task) => task.name)?.name;
      if (fromTasks) {
        return fromTasks;
      }
    }

    if (auth?.email) {
      return auth.email.split("@")[0];
    }

    return "there";
  }, [auth, tasks]);

  const userOptions = useMemo(() => {
    if (!isAdmin) {
      return [];
    }

    const map = new Map();
    tasks.forEach((task) => {
      const email = normalizeEmail(task.email);
      if (!email) {
        return;
      }
      const label = (task.name || "").trim() || task.email || email;
      if (!map.has(email)) {
        map.set(email, label);
      }
    });

    return Array.from(map, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label)
    );
  }, [isAdmin, tasks]);

  useEffect(() => {
    if (!isAdmin) {
      if (selectedUser !== "all") {
        setSelectedUser("all");
      }
      return;
    }

    if (selectedUser === "all") {
      return;
    }

    const exists = userOptions.some((option) => option.value === selectedUser);
    if (!exists) {
      setSelectedUser("all");
    }
  }, [isAdmin, selectedUser, userOptions]);

  const filteredTasks = useMemo(() => {
    if (!isAdmin || selectedUser === "all") {
      return tasks;
    }
    return tasks.filter(
      (task) => normalizeEmail(task.email) === selectedUser
    );
  }, [isAdmin, selectedUser, tasks]);

  const pendingSummary = useMemo(() => {
    if (!isAdmin) {
      return [];
    }

    const map = new Map();
    tasks.forEach((task) => {
      if (task.isCompleted) {
        return;
      }
      const email = normalizeEmail(task.email);
      if (!email) {
        return;
      }
      const label = (task.name || "").trim() || task.email || email;
      const current = map.get(email) || { label, count: 0 };
      current.count += 1;
      if (!current.label && label) {
        current.label = label;
      }
      map.set(email, current);
    });

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [isAdmin, tasks]);

  const sortedTasks = useMemo(() => {
    const pending = filteredTasks
      .filter((task) => !task.isCompleted)
      .sort((a, b) => a.plannedDate - b.plannedDate);
    const completed = filteredTasks
      .filter((task) => task.isCompleted)
      .sort((a, b) => a.actualDate - b.actualDate);
    return [...pending, ...completed];
  }, [filteredTasks]);

  const taskCountLabel = useMemo(() => {
    if (loading) {
      return "Loading";
    }
    return `${sortedTasks.length} Tasks`;
  }, [loading, sortedTasks.length]);

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

      setTasks((prev) =>
        prev.map((task) => {
          if (task.taskId !== taskId) {
            return task;
          }
          const actualDate = parsePlanned(data.actual);
          return {
            ...task,
            actualStr: data.actual,
            actualDate,
            isCompleted: true
          };
        })
      );
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
        <p className="welcome-text">Welcome, {displayName}</p>
        <p className="email-text">{auth.email}</p>
        <div className="header-actions">
          <button className="button button-secondary" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      {isAdmin ? (
        <div className="filter-bar">
          <label htmlFor="userFilter">Filter by user</label>
          <select
            id="userFilter"
            value={selectedUser}
            onChange={(event) => setSelectedUser(event.target.value)}
          >
            <option value="all">All Users</option>
            {userOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {isAdmin && pendingSummary.length > 0 ? (
        <section className="summary-panel">
          <h2>Pending Summary (Today and Earlier)</h2>
          <div className="summary-grid">
            {pendingSummary.map((item) => (
              <div key={item.label} className="summary-item">
                <span>{item.label}</span>
                <span className="summary-count">
                  {String(item.count).padStart(2, "0")}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {loading ? (
        <div className="loading-wrap">
          <span className="spinner"></span>
          <span>{taskCountLabel}</span>
        </div>
      ) : sortedTasks.length === 0 ? (
        <div className="empty-state">No Tasks Found</div>
      ) : (
        <div className="table-wrap">
          <table className="task-table">
            <thead>
              <tr>
                <th>Task ID</th>
                <th>Task Name</th>
                <th>Planned Date</th>
                <th>Deadline / Actual</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map((task) => {
                const deadlineDate = getCountdownTarget(task.plannedDate);
                const deadlineText = task.isCompleted
                  ? formatDisplayDateTime(task.actualDate)
                  : formatDisplayDateTime(deadlineDate);
                const countdown = deadlineDate
                  ? formatCountdown(deadlineDate.getTime() - now)
                  : { text: "", isOverdue: false };
                const isOwnTask =
                  normalizeEmail(task.email) === normalizeEmail(auth.email);

                return (
                  <tr
                    key={task.taskId}
                    className={`task-row ${task.isCompleted ? "completed" : ""}`}
                  >
                    <td>{task.taskId}</td>
                    <td className="task-name">
                      <div>{task.task}</div>
                      {isAdmin ? (
                        <div className="task-owner">
                          {task.name || task.email || "-"}
                        </div>
                      ) : null}
                    </td>
                    <td>{formatDisplayDate(task.plannedDate)}</td>
                    <td>
                      <div>{deadlineText || "-"}</div>
                      {!task.isCompleted && countdown.text ? (
                        <div
                          className={`countdown-text ${countdown.isOverdue ? "overdue" : ""}`}
                        >
                          {countdown.text}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      {task.isCompleted ? (
                        <span className="status-completed">Completed</span>
                      ) : !isOwnTask ? (
                        <span className="status-view">View Only</span>
                      ) : (
                        <button
                          className="button button-primary button-done"
                          onClick={() => handleMarkDone(task.taskId)}
                          disabled={processing.has(task.taskId)}
                        >
                          {processing.has(task.taskId) ? (
                            <span className="spinner"></span>
                          ) : (
                            "Mark Done"
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

