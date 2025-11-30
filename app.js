// ---------------------------
// SAVE DAILY PROGRESS
// ---------------------------
function saveProgress() {
  let text = document.getElementById("dailyText").value;

  if (text === "") {
    alert("Enter something first!");
    return;
  }

  let old = JSON.parse(localStorage.getItem("progress") || "[]");
  old.push({ date: new Date().toLocaleDateString(), text });

  localStorage.setItem("progress", JSON.stringify(old));

  alert("Saved!");
  document.getElementById("dailyText").value = "";

  loadGraph();
}

// ---------------------------
// AI ASSISTANT (DEMO VERSION)
// ---------------------------
function askAI() {
  let q = document.getElementById("aiInput").value;

  if (q === "") {
    alert("Type a question!");
    return;
  }

  // Dummy AI response (real AI available if you want)
  let responses = [
    "Stay focused! You can do it 💪",
    "Great question! Try breaking the task into smaller steps.",
    "Remember: consistency beats motivation.",
    "Take a short break, then continue!"
  ];

  document.getElementById("aiOutput").innerText =
    responses[Math.floor(Math.random() * responses.length)];
}

// ---------------------------
// LOAD GRAPH
// ---------------------------
function loadGraph() {
  let data = JSON.parse(localStorage.getItem("progress") || "[]");

  let labels = data.map(x => x.date);
  let values = data.map(x => x.text.length);

  const ctx = document.getElementById("productivityChart");

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Daily Productivity',
        data: values,
        borderWidth: 3
      }]
    }
  });
}

// Load graph on page load
window.onload = loadGraph;
