/**
 * Application configuration
 */
const CONFIG = {
  // API URL - update this to match your backend deployment
  API_URL: "https://api.reply-guy.xyz/api",
  // Recipient wallet for payments (the admin's wallet)
  PAYMENT_WALLET: "3yBZQz58CscgqkRxFCH7YA55tJKhSrtcDYAxegNwvA1x",

  // Package definitions
  PACKAGES: {
    1: { name: "Starter", price: 5, credits: 10000 },
    2: { name: "Pro", price: 20, credits: 56000 },
    3: { name: "Enterprise", price: 50, credits: 150000 },
  },

  // Estimated SOL/USD rate for conversion - will be updated dynamically
  ESTIMATED_SOL_USD_RATE: 100, // Example: 1 SOL = $100 USD
};

/**
 * Gets the current SOL to USD conversion rate
 * In a production environment, you would fetch this from an API
 *
 * @returns {Promise<number>} The current SOL/USD rate
 */
async function getSolUsdRate() {
  try {
    // In production, fetch from a price API like CoinGecko
    // For now, we'll use a simple example
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
    );
    if (!response.ok) {
      throw new Error("Failed to fetch SOL rate");
    }
    const data = await response.json();
    return data.solana.usd;
  } catch (error) {
    console.warn("Failed to fetch SOL/USD rate, using estimated value:", error);
    // Fall back to the estimated rate
    return CONFIG.ESTIMATED_SOL_USD_RATE;
  }
}

/**
 * Converts USD to SOL based on the current rate
 *
 * @param {number} usdAmount - Amount in USD to convert
 * @returns {Promise<number>} The equivalent amount in SOL
 */
async function convertUsdToSol(usdAmount) {
  const rate = await getSolUsdRate();
  return usdAmount / rate;
}

/**
 * Formats a SOL amount to a readable string with appropriate decimal places
 *
 * @param {number} solAmount - The SOL amount to format
 * @returns {string} Formatted SOL amount
 */
function formatSol(solAmount) {
  return solAmount.toFixed(6) + " SOL";
}

/**
 * Shows a toast notification
 *
 * @param {string} message - The message to display
 * @param {string} type - The type of notification (success, error, info)
 */
function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toastMessage");

  if (!toast || !toastMessage) {
    console.error("Toast elements not found");
    return;
  }

  // Set message and type
  toastMessage.textContent = message;
  toast.className = "toast";
  if (type) {
    toast.classList.add(type);
  }

  // Show the toast
  setTimeout(() => {
    toast.classList.add("visible");
  }, 10);

  // Hide after 3 seconds
  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => {
      toast.className = "toast hidden";
    }, 300);
  }, 3000);
}
