// app.js — Common JavaScript used in index.html and other shared logic

// Function to check if user is logged in
function isLoggedIn() {
  return localStorage.getItem("token") !== null;
}

// Show or hide elements based on auth status
function updateNavbar() {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (isLoggedIn()) {
    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";
  } else {
    loginBtn.style.display = "inline-block";
    logoutBtn.style.display = "none";
  }
}

// Handle logout
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user_id");
  window.location.href = "index.html";
}

// Fetch stories from backend and display them
async function loadStories() {
  try {
    const response = await fetch("http://localhost:3000/stories");
    const stories = await response.json();
    const storyList = document.getElementById("storyList");

    if (!storyList) return;

    storyList.innerHTML = "";

    stories.forEach((story) => {
      const card = document.createElement("div");
      card.className = "story-card";

      card.innerHTML = `
        <h3>${story.title}</h3>
        <p>${story.content.slice(0, 100)}...</p>
        <a href="story.html?id=${story.id}">Read more</a>
      `;

      storyList.appendChild(card);
    });
  } catch (err) {
    console.error("Failed to load stories:", err);
  }
}

// Load navbar logic and stories on page load
document.addEventListener("DOMContentLoaded", () => {
  updateNavbar();

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }

  loadStories();
});
