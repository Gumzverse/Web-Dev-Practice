const workouts = []; // In-memory list storing all workout entries for the session

document.addEventListener("DOMContentLoaded", () => {
  // Grab key DOM elements used throughout the app
  const loginOverlay = document.getElementById("loginOverlay");
  const loginForm = document.getElementById("loginForm");
  const loginMessage = document.getElementById("loginMessage");
  const app = document.getElementById("app");
  const openLoginBtn = document.getElementById("openLogin");
  const workoutForm = document.getElementById("workoutForm");

  // References to each day's table body to render workouts into
  const dayTableBodies = {
    Monday: document.getElementById("ledgerBodyMonday"),
    Tuesday: document.getElementById("ledgerBodyTuesday"),
    Wednesday: document.getElementById("ledgerBodyWednesday"),
    Thursday: document.getElementById("ledgerBodyThursday"),
    Friday: document.getElementById("ledgerBodyFriday"),
    Saturday: document.getElementById("ledgerBodySaturday"),
    Sunday: document.getElementById("ledgerBodySunday"),
  };

  // Known muscle groups used for stats counting
  const muscleGroups = ["Shoulders", "Chest", "Back", "Legs", "Arms", "Core"];

  // Toast notification setup for brief success/error messages
  const toast = document.getElementById("toast");
  let toastTimeout;

  function showToast(message, type = "success") {
    if (!toast) return;

    toast.textContent = message;
    toast.classList.remove("toast-success", "toast-error");
    toast.classList.add(type === "error" ? "toast-error" : "toast-success");
    toast.classList.add("show");

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove("show");
    }, 2500);
  }

  /* NAV smooth scroll */

  // Smoothly scrolls to sections and highlights active nav link
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const id = link.getAttribute("href").slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });

      document
        .querySelectorAll(".nav-link")
        .forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
    });
  });

  /* LOGIN */

  // Handles login validation and transition into the main app
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const username = loginForm.username.value.trim();
    const password = loginForm.password.value.trim();

    if (!username || password.length < 4) {
      loginMessage.textContent =
        "Error: Please enter a username and a password (at least 4 characters).";
      loginMessage.style.color = "var(--danger)";
      loginMessage.style.display = "block";
      showToast("Enter username + 4+ char password", "error");
      return;
    }

    loginMessage.textContent = "Login successful. Welcome, " + username + "!";
    loginMessage.style.color = "rgb(74, 222, 128)";
    loginMessage.style.display = "block";

    showToast("Login successful", "success");

    setTimeout(() => {
      loginOverlay.classList.add("hidden");
      app.classList.remove("hidden");
    }, 500);
  });

  // Reopens login overlay and hides the app when the nav button is clicked
  openLoginBtn.addEventListener("click", () => {
    loginMessage.textContent = "";
    loginMessage.style.display = "none";
    loginForm.reset();
    loginOverlay.classList.remove("hidden");
    app.classList.add("hidden");
  });

  /* WORKOUT FORM */

  // Validates input, builds a workout object, and updates UI when adding a workout
  workoutForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const title = workoutForm.workoutTitle.value.trim();
    const group = workoutForm.muscleGroup.value;
    const sets = parseInt(workoutForm.sets.value, 10);
    const reps = parseInt(workoutForm.reps.value, 10);
    const weightRaw = workoutForm.weightTime.value.trim();
    const day = workoutForm.day.value;

    if (!title || !group || !day) {
      showToast("Fill Workout, Target, and Day", "error");
      return;
    }

    if (isNaN(sets) || isNaN(reps)) {
      showToast("Sets and Reps must be numbers", "error");
      return;
    }

    if (sets <= 0 || reps <= 0) {
      showToast("Sets and Reps must be positive", "error");
      return;
    }

    let weight;
    if (weightRaw === "") {
      weight = null;
    } else {
      const parsed = parseInt(weightRaw, 10);
      if (isNaN(parsed) || parsed < 0) {
        showToast("Weight/Time must be 0 or more", "error");
        return;
      }
      weight = parsed;
    }

    const workout = {
      id: Date.now(),
      day,
      title,
      group,
      sets,
      reps,
      weight,
      status: "idle",
    };

    workouts.push(workout);
    refreshAll();
    workoutForm.reset();

    showToast("Workout added to log", "success");
  });

  /* TRAINING LOG RENDER */

  // Renders all workouts into their respective day tables
  function renderTrainingLogTables() {
    Object.values(dayTableBodies).forEach((tbody) => (tbody.innerHTML = ""));

    workouts.forEach((w) => {
      const tbody = dayTableBodies[w.day];
      if (!tbody) return;

      const tr = document.createElement("tr");

      addCell(tr, w.title);
      addCell(tr, w.group);
      addCell(tr, `${w.sets} x ${w.reps}`);

      const weightText =
        w.weight === null || w.weight === undefined ? "-" : String(w.weight);
      addCell(tr, weightText);

      const actionTd = document.createElement("td");
      actionTd.className = "status-cell";

      const checkBtn = document.createElement("button");
      checkBtn.textContent = "Done";
      checkBtn.className = "status-btn status-check";

      const xBtn = document.createElement("button");
      xBtn.textContent = "Skipped";
      xBtn.className = "status-btn status-x";

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "DELETE";
      deleteBtn.className = "delete-workout-btn";

      // Status and delete actions for each workout row
      checkBtn.addEventListener("click", () => {
        w.status = "done";
        refreshAll();
        showToast("Workout marked as done", "success");
      });

      xBtn.addEventListener("click", () => {
        w.status = "skipped";
        refreshAll();
        showToast("Workout marked as skipped", "error");
      });

      deleteBtn.addEventListener("click", () => {
        const ok = confirm("Delete this workout from the training log?");
        if (!ok) return;
        const idx = workouts.findIndex((x) => x.id === w.id);
        if (idx !== -1) workouts.splice(idx, 1);
        refreshAll();
        showToast("Workout deleted", "error");
      });

      actionTd.appendChild(checkBtn);
      actionTd.appendChild(xBtn);
      actionTd.appendChild(deleteBtn);
      tr.appendChild(actionTd);

      if (w.status === "done") {
        tr.classList.add("row-done");
      }

      tbody.appendChild(tr);
    });

    // Shows a friendly message when a day has no workouts
    Object.values(dayTableBodies).forEach((tbody) => {
      if (tbody.children.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 5;
        td.textContent = "No workouts yet. Create one above.";
        tr.appendChild(td);
        tbody.appendChild(tr);
      }
    });
  }

  // Helper to append a text cell to a table row
  function addCell(row, text) {
    const td = document.createElement("td");
    td.textContent = text;
    row.appendChild(td);
  }

  /* MUSCLE FOCUS */

  // Counts workouts per muscle group and updates the stats section
  function renderMuscleFocus() {
    const counts = {};
    muscleGroups.forEach((m) => (counts[m] = 0));

    workouts.forEach((w) => {
      if (counts[w.group] !== undefined) counts[w.group] += 1;
    });

    muscleGroups.forEach((group) => {
      const el = document.querySelector(
        `.muscle-focus-value[data-muscle="${group}"]`
      );
      if (el) el.textContent = counts[group];
    });
  }

  /* STATUS SUMMARY */

  // Calculates done/idle/skipped totals and updates counters and progress bar
  function renderStatusSummary() {
    const total = workouts.length;
    const done = workouts.filter((w) => w.status === "done").length;
    const skipped = workouts.filter((w) => w.status === "skipped").length;
    const idle = total - done - skipped;

    const doneEl = document.getElementById("doneCount");
    const skippedEl = document.getElementById("undoneCount");
    const idleEl = document.getElementById("pendingCount");
    const percentEl = document.getElementById("completionPercent");
    const barEl = document.getElementById("completionBar");

    if (doneEl) doneEl.textContent = done;
    if (skippedEl) skippedEl.textContent = skipped;
    if (idleEl) idleEl.textContent = idle;

    const completion = total === 0 ? 0 : Math.round((done / total) * 100);

    if (percentEl) percentEl.textContent = completion + "%";
    if (barEl) barEl.style.width = completion + "%";
  }

  // Central function to rerender tables and stats after any change
  function refreshAll() {
    renderTrainingLogTables();
    renderMuscleFocus();
    renderStatusSummary();
  }

  /* INITIAL */

  // Initial render so empty states and stats appear on load
  refreshAll();
});
