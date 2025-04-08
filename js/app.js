/**
 * Main application script
 */
document.addEventListener("DOMContentLoaded", function () {
  // Navigation elements
  const navLinks = {
    home: document.getElementById("homeLink"),
    pricing: document.getElementById("pricingLink"),
    dashboard: document.getElementById("dashboardLink"),
    login: document.getElementById("loginLink"),
    register: document.getElementById("registerLink"),
    logout: document.getElementById("logoutLink"),
  };

  // Content sections
  const sections = {
    home: document.getElementById("homeSection"),
    pricing: document.getElementById("pricingSection"),
    dashboard: document.getElementById("dashboardSection"),
    login: document.getElementById("loginSection"),
    register: document.getElementById("registerSection"),
    loading: document.getElementById("loadingState"),
  };

  // Direct navigation setup - THIS ENSURES THE NAVIGATION WORKS
  navLinks.home.addEventListener("click", function (e) {
    e.preventDefault();
    showSection("home");
  });

  navLinks.pricing.addEventListener("click", function (e) {
    e.preventDefault();
    showSection("pricing");
  });

  navLinks.login.addEventListener("click", function (e) {
    e.preventDefault();
    showSection("login");
  });

  navLinks.register.addEventListener("click", function (e) {
    e.preventDefault();
    showSection("register");
  });

  navLinks.dashboard.addEventListener("click", function (e) {
    e.preventDefault();
    if (typeof isLoggedIn === "function" && isLoggedIn()) {
      showSection("loading");
      if (typeof loadDashboard === "function") {
        loadDashboard()
          .then(() => {
            showSection("dashboard");
          })
          .catch((err) => {
            console.error("Dashboard loading error:", err);
            showSection("dashboard");
          });
      } else {
        // Fallback if loadDashboard isn't defined
        showSection("dashboard");
      }
    } else {
      showSection("login");
    }
  });

  navLinks.logout &&
    navLinks.logout.addEventListener("click", function (e) {
      e.preventDefault();
      if (typeof handleLogout === "function") {
        handleLogout();
      } else {
        console.warn("handleLogout function not defined");
        showSection("home");
      }
    });

  // Function to switch between sections - CRITICAL FOR NAVIGATION
  function showSection(sectionName) {
    console.log(`Showing section: ${sectionName}`);

    // Remove active from previous sections
    document.querySelectorAll(".section:not(.hidden)").forEach((section) => {
      section.classList.add("hidden");
    });

    // Remove active class from all nav links
    Object.values(navLinks).forEach((link) => {
      if (link) link.classList.remove("active");
    });

    // Show the requested section
    if (sections[sectionName]) {
      sections[sectionName].classList.remove("hidden");

      // Make sure active class is applied to correct nav link
      if (navLinks[sectionName]) {
        navLinks[sectionName].classList.add("active");
      }
    } else {
      console.warn(`Section "${sectionName}" not found`);
    }
  }

  // Payment elements
  const paymentSection = document.getElementById("paymentSection");
  const selectedPackage = document.getElementById("selectedPackage");
  const packagePrice = document.getElementById("packagePrice");
  const packageCredits = document.getElementById("packageCredits");
  const solAmount = document.getElementById("solAmount");
  const connectWalletBtn = document.getElementById("connectWalletBtn");
  const connectedWallet = document.getElementById("connectedWallet");
  const walletAddress = document.getElementById("walletAddress");
  const payNowBtn = document.getElementById("payNowBtn");
  const cancelPaymentBtn = document.getElementById("cancelPaymentBtn");
  const paymentStatus = document.getElementById("paymentStatus");

  // Auth form elements
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const loginMessage = document.getElementById("loginMessage");
  const registerMessage = document.getElementById("registerMessage");

  // Dashboard elements
  const userCredits = document.getElementById("userCredits");
  const postsCreated = document.getElementById("postsCreated");
  const accountStatus = document.getElementById("accountStatus");
  const transactionsTableBody = document.getElementById(
    "transactionsTableBody"
  );
  const buyMoreBtn = document.getElementById("buyMoreBtn");

  // Other elements
  const getStartedBtn = document.getElementById("getStartedBtn");
  const loginFormLink = document.getElementById("loginFormLink");
  const registerFormLink = document.getElementById("registerFormLink");

  // Register form link navigation
  if (loginFormLink) {
    loginFormLink.addEventListener("click", function (e) {
      e.preventDefault();
      showSection("login");
    });
  }

  if (registerFormLink) {
    registerFormLink.addEventListener("click", function (e) {
      e.preventDefault();
      showSection("register");
    });
  }

  // Get started button
  if (getStartedBtn) {
    getStartedBtn.addEventListener("click", function (e) {
      e.preventDefault();
      if (typeof isLoggedIn === "function" && isLoggedIn()) {
        showSection("pricing");
      } else {
        showSection("register");
      }
    });
  }

  // Package selection
  const packageButtons = document.querySelectorAll(".select-package-btn");
  packageButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const card = this.closest(".pricing-card");
      if (typeof selectPackage === "function") {
        selectPackage(card.dataset.package);
      } else {
        console.warn("selectPackage function not defined");
        // Fallback behavior - just show the payment section
        if (paymentSection) {
          paymentSection.classList.remove("hidden");
          if (selectedPackage)
            selectedPackage.textContent = card.querySelector("h3").textContent;
          if (packagePrice) packagePrice.textContent = card.dataset.price;
          if (packageCredits) packageCredits.textContent = card.dataset.credits;
        }
      }
    });
  });

  // Add fallback functions for missing dependencies
  if (typeof isLoggedIn !== "function") {
    window.isLoggedIn = function () {
      console.warn("Using fallback isLoggedIn function");
      return false;
    };
  }

  if (typeof initializeAuth !== "function") {
    window.initializeAuth = function () {
      console.warn("Using fallback initializeAuth function");
      return Promise.resolve(false);
    };
  }

  if (typeof loadDashboard !== "function") {
    window.loadDashboard = function () {
      console.warn("Using fallback loadDashboard function");
      return Promise.resolve();
    };
  }

  // Define other fallback functions as needed
  if (typeof updateNavigation !== "function") {
    window.updateNavigation = function (isAuthenticated) {
      console.warn("Using fallback updateNavigation function");
      if (isAuthenticated) {
        if (navLinks.login) navLinks.login.classList.add("hidden");
        if (navLinks.register) navLinks.register.classList.add("hidden");
        if (navLinks.logout) navLinks.logout.classList.remove("hidden");
        if (navLinks.dashboard) navLinks.dashboard.classList.remove("hidden");
      } else {
        if (navLinks.login) navLinks.login.classList.remove("hidden");
        if (navLinks.register) navLinks.register.classList.remove("hidden");
        if (navLinks.logout) navLinks.logout.classList.add("hidden");
        if (navLinks.dashboard) navLinks.dashboard.classList.add("hidden");
      }
    };
  }

  // Initialize app
  async function init() {
    // First make sure the home section is visible
    showSection("home");

    try {
      // Initialize authentication if available
      let isAuthenticated = false;
      if (typeof initializeAuth === "function") {
        try {
          isAuthenticated = await initializeAuth();
        } catch (error) {
          console.error("Auth initialization error:", error);
        }
      }

      if (typeof updateNavigation === "function") {
        updateNavigation(isAuthenticated);
      }

      // Initialize Solana connection if available
      if (typeof initializeSolanaConnection === "function") {
        try {
          initializeSolanaConnection();
        } catch (error) {
          console.error("Solana initialization error:", error);
        }
      }

      // Show appropriate section based on authentication status
      if (isAuthenticated) {
        if (typeof loadDashboard === "function") {
          try {
            await loadDashboard();
          } catch (error) {
            console.error("Dashboard loading error:", error);
          }
        }
        showSection("dashboard");
      } else {
        // Already showing home section
      }
    } catch (error) {
      console.error("Initialization error:", error);
    }
  }

  // Initialize the app
  init();

  // Make showSection available globally for debugging
  window.showSection = showSection;
});
