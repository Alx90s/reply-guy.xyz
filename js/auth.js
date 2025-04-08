/**
 * Authentication related functions
 * Connects to the real backend API
 */

// Current user data
let currentUser = null;

/**
 * Initializes authentication - checks if user is logged in
 * @returns {Promise<boolean>} True if user is logged in
 */
async function initializeAuth() {
  try {
    // Verify token with the backend
    const response = await fetch(`${CONFIG.API_URL}/auth/verify-token`, {
      method: "GET",
      credentials: "include", // Important: Include cookies
    });

    if (response.ok) {
      // Token is valid, get user data
      const userData = await fetch(`${CONFIG.API_URL}/auth/me`, {
        method: "GET",
        credentials: "include",
      });

      if (userData.ok) {
        const data = await userData.json();
        if (data.success && data.user) {
          currentUser = data.user;
          return true;
        }
      }
    }

    // Clear any stored user data if token is invalid
    localStorage.removeItem("user");
    return false;
  } catch (error) {
    console.error("Auth initialization error:", error);
    return false;
  }
}

/**
 * Checks if user is logged in
 * @returns {boolean} True if user is logged in
 */
function isLoggedIn() {
  return currentUser !== null;
}

/**
 * Shows a message in the specified container
 */
function showMessage(message, type, container) {
  if (!container) return;

  container.textContent = message;
  container.className = "form-message";
  if (type) {
    container.classList.add(type);
  }
}

/**
 * Clears a message container
 */
function clearMessage(container) {
  if (!container) return;

  container.textContent = "";
  container.className = "form-message";
}

/**
 * Handles user login
 */
async function handleLoginSubmit(e) {
  if (e) e.preventDefault();

  const loginEmail = document.getElementById("loginEmail");
  const loginPassword = document.getElementById("loginPassword");
  const loginMessage = document.getElementById("loginMessage");
  const loginBtn = document.querySelector('#loginForm button[type="submit"]');

  if (!loginEmail || !loginPassword || !loginMessage) {
    console.error("Login form elements not found");
    return;
  }

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  // Validate input
  if (!email || !password) {
    showMessage("Please enter both email and password", "error", loginMessage);
    return;
  }

  // Disable button and show loading
  if (loginBtn) loginBtn.disabled = true;
  showMessage("Logging in...", "", loginMessage);

  try {
    // Make real API request to your backend
    const response = await fetch(`${CONFIG.API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      credentials: "include", // Important: Include cookies
    });

    const data = await response.json();

    if (data.success && data.user) {
      // Store minimal user data in localStorage as a backup
      // The real authentication relies on the HTTP-only cookie set by your backend
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: data.user.id,
          email: data.user.email,
          username: data.user.username,
        })
      );

      currentUser = data.user;

      // Clear form
      loginEmail.value = "";
      loginPassword.value = "";
      clearMessage(loginMessage);

      // Show success message and redirect to dashboard
      showToast("Logged in successfully!", "success");

      // Update navigation
      updateNavigation(true);

      // Load dashboard and show it
      await loadDashboard();
      window.showSection("dashboard");
    } else {
      showMessage(data.error || "Invalid credentials", "error", loginMessage);
    }
  } catch (error) {
    console.error("Login error:", error);
    showMessage("Connection error. Please try again.", "error", loginMessage);
  } finally {
    if (loginBtn) loginBtn.disabled = false;
  }
}

/**
 * Handles user registration
 */
async function handleRegisterSubmit(e) {
  if (e) e.preventDefault();

  const registerUsername = document.getElementById("registerUsername");
  const registerEmail = document.getElementById("registerEmail");
  const registerPassword = document.getElementById("registerPassword");
  const registerPasswordConfirm = document.getElementById(
    "registerPasswordConfirm"
  );
  const registerMessage = document.getElementById("registerMessage");
  const registerBtn = document.querySelector(
    '#registerForm button[type="submit"]'
  );

  if (
    !registerUsername ||
    !registerEmail ||
    !registerPassword ||
    !registerPasswordConfirm ||
    !registerMessage
  ) {
    console.error("Register form elements not found");
    return;
  }

  const username = registerUsername.value.trim();
  const email = registerEmail.value.trim();
  const password = registerPassword.value;
  const passwordConfirm = registerPasswordConfirm.value;

  // Validate input
  if (!username || !email || !password || !passwordConfirm) {
    showMessage("Please fill in all fields", "error", registerMessage);
    return;
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showMessage("Please enter a valid email address", "error", registerMessage);
    return;
  }

  // Validate username
  if (username.length < 3 || username.length > 20) {
    showMessage(
      "Username must be between 3 and 20 characters",
      "error",
      registerMessage
    );
    return;
  }

  // Validate password
  if (password.length < 6) {
    showMessage(
      "Password must be at least 6 characters",
      "error",
      registerMessage
    );
    return;
  }

  // Check if passwords match
  if (password !== passwordConfirm) {
    showMessage("Passwords do not match", "error", registerMessage);
    return;
  }

  // Disable button and show loading
  if (registerBtn) registerBtn.disabled = true;
  showMessage("Creating account...", "", registerMessage);

  try {
    // Make real API request to your backend
    const response = await fetch(`${CONFIG.API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, email, password }),
      credentials: "include", // Important: Include cookies
    });

    const data = await response.json();

    if (data.success && data.user) {
      // Store minimal user data in localStorage as a backup
      localStorage.setItem(
        "user",
        JSON.stringify({
          id: data.user.id,
          email: data.user.email,
          username: data.user.username,
        })
      );

      currentUser = data.user;

      // Clear form
      registerUsername.value = "";
      registerEmail.value = "";
      registerPassword.value = "";
      registerPasswordConfirm.value = "";
      clearMessage(registerMessage);

      // Show success message and redirect to dashboard
      showToast("Account created successfully!", "success");

      // Update navigation
      updateNavigation(true);

      // Load dashboard and show it
      await loadDashboard();
      window.showSection("dashboard");
    } else {
      showMessage(
        data.error || "Registration failed",
        "error",
        registerMessage
      );
    }
  } catch (error) {
    console.error("Registration error:", error);
    showMessage(
      "Connection error. Please try again.",
      "error",
      registerMessage
    );
  } finally {
    if (registerBtn) registerBtn.disabled = false;
  }
}

/**
 * Handles user logout
 */
async function handleLogout() {
  try {
    // Send logout request to backend to clear the cookie
    const response = await fetch(`${CONFIG.API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include", // Important: Include cookies
    });

    // Clear local user data
    localStorage.removeItem("user");
    currentUser = null;

    // Update UI
    updateNavigation(false);

    // Show home page
    window.showSection("home");

    // Show success message
    showToast("Logged out successfully", "success");
  } catch (error) {
    console.error("Logout error:", error);
    // Even if logout fails, we still want to clear local storage
    localStorage.removeItem("user");
    currentUser = null;
    window.showSection("home");
  }
}

/**
 * Load dashboard data
 * Fetches user data and transaction history from backend
 */
async function loadDashboard() {
  // Get DOM elements
  const userCredits = document.getElementById("userCredits");
  const postsCreated = document.getElementById("postsCreated");
  const accountStatus = document.getElementById("accountStatus");
  const transactionsTableBody = document.getElementById(
    "transactionsTableBody"
  );

  try {
    // Check if user is logged in
    if (!isLoggedIn()) {
      throw new Error("User not logged in");
    }

    // Get fresh user data
    const userResponse = await fetch(`${CONFIG.API_URL}/auth/me`, {
      method: "GET",
      credentials: "include",
    });

    if (!userResponse.ok) {
      throw new Error("Failed to fetch user data");
    }

    const userData = await userResponse.json();

    if (userData.success && userData.user) {
      currentUser = userData.user;

      // Update dashboard with user data
      if (userCredits)
        userCredits.textContent = currentUser.credits.toLocaleString();
      if (postsCreated)
        postsCreated.textContent = currentUser.postsCreated || 0;
      if (accountStatus)
        accountStatus.textContent = currentUser.status || "Active";
    }

    // Load transaction history
    if (transactionsTableBody) {
      try {
        const transactionResponse = await fetch(
          `${CONFIG.API_URL}/transactions/history`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        if (!transactionResponse.ok) {
          throw new Error("Failed to fetch transaction history");
        }

        const transactionData = await transactionResponse.json();

        // Clear existing rows
        transactionsTableBody.innerHTML = "";

        if (
          !transactionData.success ||
          !transactionData.transactions ||
          transactionData.transactions.length === 0
        ) {
          // No transactions
          const row = document.createElement("tr");
          row.innerHTML = `<td colspan="5" style="text-align: center;">No transactions yet</td>`;
          transactionsTableBody.appendChild(row);
        } else {
          // Add transaction rows
          transactionData.transactions.forEach((transaction) => {
            const row = document.createElement("tr");
            row.innerHTML = `
              <td>${new Date(transaction.date).toLocaleDateString()}</td>
              <td>${transaction.packageName}</td>
              <td>$${transaction.amountUsd.toFixed(
                2
              )} (${transaction.amountSol.toFixed(6)} SOL)</td>
              <td>${transaction.credits.toLocaleString()}</td>
              <td>
                <a href="https://explorer.solana.com/tx/${
                  transaction.signature
                }?cluster=${CONFIG.SOLANA_NETWORK}" 
                   target="_blank" rel="noopener noreferrer">
                   ${transaction.signature.substring(
                     0,
                     8
                   )}...${transaction.signature.substring(
              transaction.signature.length - 8
            )}
                </a>
              </td>
            `;
            transactionsTableBody.appendChild(row);
          });
        }
      } catch (error) {
        console.error("Transaction history error:", error);
        // Show error in transaction table
        transactionsTableBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; color: var(--error-color);">
              Failed to load transaction history
            </td>
          </tr>
        `;
      }
    }

    return true;
  } catch (error) {
    console.error("Load dashboard error:", error);

    // Show error in transaction table if it exists
    if (transactionsTableBody) {
      transactionsTableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--error-color);">
            Failed to load dashboard data
          </td>
        </tr>
      `;
    }

    return false;
  }
}

// Set up event listeners when the DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  if (loginForm) {
    loginForm.addEventListener("submit", handleLoginSubmit);
  }

  if (registerForm) {
    registerForm.addEventListener("submit", handleRegisterSubmit);
  }
});
