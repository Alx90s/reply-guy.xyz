/**
 * Functions for interacting with Phantom wallet
 */
import { Buffer } from "buffer";
if (typeof window.Buffer === "undefined") {
  window.Buffer = Buffer;
}

// Solana connection
let solanaConnection = null;

// Current wallet
let currentWallet = null;

// Selected package info
let selectedPackageInfo = null;

/**
 * Initializes the Solana connection
 */
function initializeSolanaConnection() {
  if (!solanaConnection) {
    try {
      // Determine which network to connect to
      const network = "https://rpc.shyft.to?api_key=SXrlqCn1UPcutdoj";

      // Initialize connection
      solanaConnection = new solanaWeb3.Connection(network);
      console.log("Solana connection initialized:", "mainnet");
    } catch (error) {
      console.error("Failed to initialize Solana connection:", error);
    }
  }

  return solanaConnection;
}

/**
 * Checks if Phantom wallet is installed
 * @returns {boolean} True if Phantom is available
 */
function isPhantomInstalled() {
  const isPhantomInstalled = window.phantom?.solana?.isPhantom;
  return !!isPhantomInstalled;
}

/**
 * Connects to Phantom wallet
 * @returns {Promise<object>} Connection result with public key
 */
async function connectWallet() {
  try {
    if (!isPhantomInstalled()) {
      throw new Error("Phantom wallet is not installed");
    }

    // Request connection
    const response = await window.phantom.solana.connect();
    currentWallet = response.publicKey.toString();

    return {
      success: true,
      publicKey: currentWallet,
    };
  } catch (error) {
    console.error("Wallet connection error:", error);
    return {
      success: false,
      error: error.message || "Failed to connect to wallet",
    };
  }
}

/**
 * Disconnects from Phantom wallet
 */
function disconnectWallet() {
  if (window.phantom?.solana) {
    window.phantom.solana.disconnect();
  }
  currentWallet = null;
}

/**
 * Gets the connected wallet address
 * @returns {string|null} Wallet address or null if not connected
 */
function getWalletAddress() {
  return currentWallet;
}

/**
 * Selects a package for payment
 * @param {string} packageId - ID of the package to select
 */
async function selectPackage(packageId) {
  // Check if logged in
  if (!isLoggedIn()) {
    showToast("Please log in to purchase a package", "error");
    window.showSection("login");
    return;
  }

  // Get package info
  selectedPackageInfo = CONFIG.PACKAGES[packageId];

  if (!selectedPackageInfo) {
    showToast("Invalid package selected", "error");
    return;
  }

  // Calculate SOL amount
  const solAmountValue = await convertUsdToSol(selectedPackageInfo.price);

  // Update payment section
  const paymentSection = document.getElementById("paymentSection");
  const selectedPackageElem = document.getElementById("selectedPackage");
  const packagePriceElem = document.getElementById("packagePrice");
  const packageCreditsElem = document.getElementById("packageCredits");
  const solAmountElem = document.getElementById("solAmount");

  if (paymentSection) paymentSection.classList.remove("hidden");
  if (selectedPackageElem)
    selectedPackageElem.textContent = selectedPackageInfo.name;
  if (packagePriceElem)
    packagePriceElem.textContent = selectedPackageInfo.price;
  if (packageCreditsElem)
    packageCreditsElem.textContent =
      selectedPackageInfo.credits.toLocaleString();
  if (solAmountElem) solAmountElem.textContent = formatSol(solAmountValue);

  // Store packageId for later use
  if (paymentSection) paymentSection.dataset.packageId = packageId;

  // Scroll to payment section
  if (paymentSection) {
    paymentSection.scrollIntoView({ behavior: "smooth" });
  }
}
/**
 * Creates and sends a payment transaction
 * @param {number} amountInSol - Amount to send in SOL
 * @param {string} packageId - ID of the package being purchased
 * @returns {Promise<object>} Transaction result
 */
async function sendPayment(amountInSol, packageId) {
  try {
    if (!currentWallet) {
      throw new Error("Wallet not connected");
    }

    // Initialize connection if needed
    const connection = initializeSolanaConnection();

    // Create transaction
    const transaction = new solanaWeb3.Transaction();

    // Get recent blockhash
    const { blockhash } = await connection.getRecentBlockhash("finalized");
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new solanaWeb3.PublicKey(currentWallet);

    // Add payment instruction
    const recipientPubkey = new solanaWeb3.PublicKey(CONFIG.PAYMENT_WALLET);
    const senderPubkey = new solanaWeb3.PublicKey(currentWallet);

    // Convert SOL to lamports (1 SOL = 1,000,000,000 lamports)
    const lamports = Math.round(amountInSol * 1000000000);

    // Create transfer instruction
    const transferInstruction = solanaWeb3.SystemProgram.transfer({
      fromPubkey: senderPubkey,
      toPubkey: recipientPubkey,
      lamports: lamports,
    });

    // Add instruction to transaction
    transaction.add(transferInstruction);

    // Sign and send transaction
    const { signature } = await window.phantom.solana.signAndSendTransaction(
      transaction
    );

    console.log("Transaction sent with signature:", signature);

    // Wait for confirmation with explicit finalized commitment
    const confirmationOptions = {
      commitment: "finalized",
      maxRetries: 5, // Add retries for network reliability
    };

    try {
      // First wait for basic confirmation
      const initialConfirmation = await connection.confirmTransaction(
        signature,
        "confirmed"
      );

      if (initialConfirmation.value.err) {
        throw new Error(
          `Transaction confirmed but has errors: ${JSON.stringify(
            initialConfirmation.value.err
          )}`
        );
      }

      console.log(
        "Transaction confirmed at 'confirmed' level:",
        initialConfirmation
      );

      // Next, wait for finalized confirmation (higher level of finality)
      console.log("Waiting for finalized confirmation...");

      // Use a timeout to ensure we don't wait forever
      const confirmFinalized = async () => {
        const finalizedConfirmation = await connection.confirmTransaction(
          signature,
          "finalized"
        );
        return finalizedConfirmation;
      };

      // Set a timeout for finalization
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Transaction finalization timeout")),
          30000
        )
      );

      // Wait for either finalization or timeout
      const finalConfirmation = await Promise.race([
        confirmFinalized(),
        timeoutPromise,
      ]);

      console.log("Transaction finalized:", finalConfirmation);

      // Additional verification step - actually get the transaction details
      const txDetails = await connection.getTransaction(signature, {
        commitment: "finalized",
      });

      if (!txDetails) {
        console.warn(
          "Transaction details not found after finalization. This could indicate an RPC node issue."
        );
        // Continue anyway since we got a finalized confirmation
      } else {
        console.log("Transaction details retrieved:", txDetails);
      }
    } catch (confirmError) {
      console.error("Transaction confirmation error:", confirmError);

      // Important: Check if transaction exists despite confirmation error
      // This can happen with RPC node issues where the transaction is actually processed
      const retryCheck = async () => {
        console.log("Performing retry check for transaction:", signature);
        try {
          // Wait a bit longer before checking again
          await new Promise((resolve) => setTimeout(resolve, 5000));

          // Try to get the transaction with finalized commitment
          const txDetails = await connection.getTransaction(signature, {
            commitment: "finalized",
          });

          if (txDetails) {
            console.log("Transaction found during retry check:", txDetails);
            return true;
          }
          return false;
        } catch (e) {
          console.error("Retry check error:", e);
          return false;
        }
      };

      const transactionExists = await retryCheck();
      if (!transactionExists) {
        throw confirmError; // Re-throw if the transaction truly doesn't exist
      }
      // If we reach here, the transaction exists despite confirmation error - proceed
    }

    // Notify the backend about the transaction
    const paymentResult = await notifyPaymentToBackend(
      signature,
      amountInSol,
      packageId
    );

    return {
      success: true,
      signature,
      credits: paymentResult.credits,
    };
  } catch (error) {
    console.error("Payment error:", error);
    return {
      success: false,
      error: error.message || "Payment failed",
    };
  }
}

/**
 * Notifies the backend about a successful payment
 * @param {string} signature - Transaction signature
 * @param {number} amountInSol - Amount sent in SOL
 * @param {string} packageId - ID of the package purchased
 * @returns {Promise<object>} Backend response
 */
async function notifyPaymentToBackend(signature, amountInSol, packageId) {
  try {
    // Add some delay before notifying backend to ensure transaction propagation
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log("Notifying backend about payment:", {
      signature,
      amountInSol,
      packageId,
    });

    // Make up to 3 attempts to notify the backend
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Backend notification attempt ${attempt}/3`);

        const response = await fetch(`${CONFIG.API_URL}/transactions/payment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            signature,
            amountInSol,
            packageId,
          }),
          credentials: "include",
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Backend notification failed (${response.status}): ${errorText}`
          );
        }

        const result = await response.json();
        console.log("Backend notification successful:", result);
        return result;
      } catch (error) {
        console.error(`Backend notification attempt ${attempt} failed:`, error);
        lastError = error;

        if (attempt < 3) {
          // Wait before retrying (increasing delay with each attempt)
          const retryDelay = attempt * 3000;
          console.log(`Retrying in ${retryDelay / 1000} seconds...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }

    // All attempts failed
    throw (
      lastError ||
      new Error(
        "Failed to notify backend about payment after multiple attempts"
      )
    );
  } catch (error) {
    console.error("Backend notification error:", error);
    throw error;
  }
}
/**
 * Gets the SOL balance of the connected wallet
 * @returns {Promise<number>} Balance in SOL
 */
async function getWalletBalance() {
  try {
    if (!currentWallet) {
      throw new Error("Wallet not connected");
    }

    // Initialize connection if needed
    const connection = initializeSolanaConnection();

    // Get balance in lamports
    const balance = await connection.getBalance(
      new solanaWeb3.PublicKey(currentWallet)
    );

    // Convert lamports to SOL (1 SOL = 1,000,000,000 lamports)
    return balance / 1000000000;
  } catch (error) {
    console.error("Get balance error:", error);
    throw error;
  }
}

/**
 * Handles the wallet connection and payment process
 */
document.addEventListener("DOMContentLoaded", function () {
  const connectWalletBtn = document.getElementById("connectWalletBtn");
  const connectedWallet = document.getElementById("connectedWallet");
  const walletAddress = document.getElementById("walletAddress");
  const payNowBtn = document.getElementById("payNowBtn");
  const cancelPaymentBtn = document.getElementById("cancelPaymentBtn");
  const paymentStatus = document.getElementById("paymentStatus");

  // Connect wallet button
  if (connectWalletBtn) {
    connectWalletBtn.addEventListener("click", async function () {
      if (!paymentStatus) return;

      paymentStatus.className = "payment-status";
      paymentStatus.textContent = "";

      if (!isPhantomInstalled()) {
        paymentStatus.className = "payment-status error";
        paymentStatus.innerHTML =
          'Phantom wallet is not installed. <a href="https://phantom.app/" target="_blank">Click here to install</a>';
        return;
      }

      connectWalletBtn.disabled = true;
      connectWalletBtn.textContent = "Connecting...";

      try {
        const result = await connectWallet();

        if (result.success) {
          if (connectWalletBtn) connectWalletBtn.style.display = "none";
          if (connectedWallet) connectedWallet.classList.remove("hidden");
          if (walletAddress)
            walletAddress.textContent = `${result.publicKey.substring(
              0,
              6
            )}...${result.publicKey.substring(result.publicKey.length - 4)}`;
          if (payNowBtn) payNowBtn.classList.remove("hidden");

          paymentStatus.className = "payment-status success";
          paymentStatus.textContent = "Wallet connected successfully!";
        } else {
          paymentStatus.className = "payment-status error";
          paymentStatus.textContent =
            result.error || "Failed to connect wallet";
          connectWalletBtn.textContent = "Connect Phantom Wallet";
        }
      } catch (error) {
        paymentStatus.className = "payment-status error";
        paymentStatus.textContent = "An error occurred connecting to wallet";
      } finally {
        connectWalletBtn.disabled = false;
      }
    });
  }

  // Pay now button
  if (payNowBtn) {
    payNowBtn.addEventListener("click", async function () {
      const paymentSection = document.getElementById("paymentSection");
      if (!paymentSection || !paymentStatus) return;

      const packageId = paymentSection.dataset.packageId;
      if (!packageId) {
        paymentStatus.className = "payment-status error";
        paymentStatus.textContent = "No package selected";
        return;
      }

      // Get package info
      const packageInfo = CONFIG.PACKAGES[packageId];
      if (!packageInfo) {
        paymentStatus.className = "payment-status error";
        paymentStatus.textContent = "Invalid package selected";
        return;
      }

      // Calculate SOL amount
      const solAmountValue = await convertUsdToSol(packageInfo.price);

      // Disable button and show loading
      payNowBtn.disabled = true;
      payNowBtn.textContent = "Processing...";

      paymentStatus.className = "payment-status loading";
      paymentStatus.innerHTML = `
        <div class="loading-spinner" style="width: 20px; height: 20px; margin: 0;"></div>
        <span>Processing payment, please confirm in your Phantom wallet...</span>
      `;

      // Store transaction signature globally to allow recovery
      window.lastTransactionSignature = null;

      try {
        // Check wallet balance first
        const balance = await getWalletBalance();
        if (balance < solAmountValue) {
          paymentStatus.className = "payment-status error";
          paymentStatus.textContent = `Insufficient balance. You need at least ${formatSol(
            solAmountValue
          )}`;
          payNowBtn.textContent = "Pay Now";
          payNowBtn.disabled = false;
          return;
        }

        // Send payment
        const result = await sendPayment(solAmountValue, packageId);

        // Store the signature even if there's an error reported
        if (result.signature) {
          window.lastTransactionSignature = result.signature;
        }

        if (result.success) {
          paymentStatus.className = "payment-status success";
          paymentStatus.textContent = `Payment successful! ${result.credits.toLocaleString()} credits added to your account.`;

          // Update user credits
          await loadDashboard();

          // Show success toast
          showToast("Payment successful!", "success");

          // Hide pay button
          payNowBtn.style.display = "none";

          // Update cancel button text
          if (cancelPaymentBtn) cancelPaymentBtn.textContent = "Done";

          // Show dashboard after a delay
          setTimeout(async function () {
            await loadDashboard();
            window.showSection("dashboard");

            // Reset UI for next time
            if (connectWalletBtn) connectWalletBtn.style.display = "block";
            if (connectedWallet) connectedWallet.classList.add("hidden");
            if (payNowBtn) {
              payNowBtn.classList.add("hidden");
              payNowBtn.disabled = false;
              payNowBtn.textContent = "Pay Now";
            }
            if (paymentSection) paymentSection.classList.add("hidden");
            if (cancelPaymentBtn) cancelPaymentBtn.textContent = "Cancel";

            // Disconnect wallet
            disconnectWallet();
          }, 3000);
        } else {
          // Check if we have a signature despite the error
          if (window.lastTransactionSignature) {
            paymentStatus.className = "payment-status warning";
            paymentStatus.innerHTML = `
              <div>
                <p>Transaction may have been sent but we couldn't confirm it.</p>
                <p>Signature: <code>${window.lastTransactionSignature}</code></p>
                <p>Please check your wallet and try refreshing. If you see the transaction was successful, please contact support with this signature.</p>
                <button id="verifyManuallyBtn" class="btn btn-secondary mt-2">Verify Transaction Manually</button>
              </div>
            `;

            // Add event listener to the verify button
            document
              .getElementById("verifyManuallyBtn")
              .addEventListener("click", async function () {
                this.disabled = true;
                this.textContent = "Verifying...";

                try {
                  await manuallyVerifyTransaction(
                    window.lastTransactionSignature,
                    solAmountValue,
                    packageId
                  );
                } finally {
                  this.disabled = false;
                  this.textContent = "Verify Transaction Manually";
                }
              });
          } else {
            paymentStatus.className = "payment-status error";
            paymentStatus.textContent = result.error || "Payment failed";
          }
          payNowBtn.textContent = "Try Again";
          payNowBtn.disabled = false;
        }
      } catch (error) {
        console.error("Payment process error:", error);

        // Check if we have a signature despite the error
        if (window.lastTransactionSignature) {
          paymentStatus.className = "payment-status warning";
          paymentStatus.innerHTML = `
            <div>
              <p>Transaction may have been sent but we encountered an error: ${error.message}</p>
              <p>Signature: <code>${window.lastTransactionSignature}</code></p>
              <p>Please check your wallet and try refreshing. If you see the transaction was successful, please contact support with this signature.</p>
              <button id="verifyManuallyBtn" class="btn btn-secondary mt-2">Verify Transaction Manually</button>
            </div>
          `;

          // Add event listener to the verify button
          document
            .getElementById("verifyManuallyBtn")
            .addEventListener("click", async function () {
              this.disabled = true;
              this.textContent = "Verifying...";

              try {
                await manuallyVerifyTransaction(
                  window.lastTransactionSignature,
                  solAmountValue,
                  packageId
                );
              } finally {
                this.disabled = false;
                this.textContent = "Verify Transaction Manually";
              }
            });
        } else {
          paymentStatus.className = "payment-status error";
          paymentStatus.textContent = "An error occurred during payment";
        }

        payNowBtn.textContent = "Try Again";
        payNowBtn.disabled = false;
      }
    });
  }

  /**
   * Manually verify a transaction and notify backend if successful
   * @param {string} signature - Transaction signature to verify
   * @param {number} amountInSol - Amount in SOL
   * @param {string} packageId - Package ID
   */
  async function manuallyVerifyTransaction(signature, amountInSol, packageId) {
    const paymentStatus = document.getElementById("paymentStatus");
    if (!paymentStatus) return;

    paymentStatus.className = "payment-status loading";
    paymentStatus.innerHTML = `
      <div class="loading-spinner" style="width: 20px; height: 20px; margin: 0;"></div>
      <span>Manually verifying transaction...</span>
    `;

    try {
      // Initialize connection if needed
      const connection = initializeSolanaConnection();

      // Get transaction details with finalized commitment
      const txDetails = await connection.getTransaction(signature, {
        commitment: "finalized",
      });

      if (!txDetails) {
        paymentStatus.className = "payment-status error";
        paymentStatus.textContent = "Transaction not found on blockchain.";
        return;
      }

      console.log("Transaction found during manual verification:", txDetails);

      // Verify the transaction goes to admin wallet
      const adminWalletStr = CONFIG.PAYMENT_WALLET;
      const accountKeys = txDetails.transaction.message.accountKeys;
      const adminIndex = accountKeys.findIndex(
        (key) => key.toString() === adminWalletStr
      );

      if (adminIndex === -1) {
        paymentStatus.className = "payment-status error";
        paymentStatus.textContent =
          "Transaction does not involve the payment wallet.";
        return;
      }

      // Check if balance increased
      const preBalance = txDetails.meta.preBalances[adminIndex];
      const postBalance = txDetails.meta.postBalances[adminIndex];

      if (postBalance <= preBalance) {
        paymentStatus.className = "payment-status error";
        paymentStatus.textContent =
          "Transaction did not transfer funds to payment wallet.";
        return;
      }

      // Calculate the transferred amount
      const transferredLamports = postBalance - preBalance;
      const transferAmount = transferredLamports / 1000000000;

      paymentStatus.className = "payment-status info";
      paymentStatus.textContent = `Verified transaction of ${transferAmount} SOL. Notifying server...`;

      // Notify backend
      try {
        const paymentResult = await notifyPaymentToBackend(
          signature,
          amountInSol, // Use the expected amount, not the transferred amount
          packageId
        );

        paymentStatus.className = "payment-status success";
        paymentStatus.textContent = `Payment verified! ${paymentResult.credits.toLocaleString()} credits added to your account.`;

        // Update user credits
        await loadDashboard();

        // Show success toast
        showToast("Payment verified successfully!", "success");

        // Hide pay button
        const payNowBtn = document.getElementById("payNowBtn");
        if (payNowBtn) payNowBtn.style.display = "none";

        // Update cancel button text
        const cancelPaymentBtn = document.getElementById("cancelPaymentBtn");
        if (cancelPaymentBtn) cancelPaymentBtn.textContent = "Done";

        // Show dashboard after a delay
        setTimeout(async function () {
          await loadDashboard();
          window.showSection("dashboard");

          // Reset UI for next time
          const connectWalletBtn = document.getElementById("connectWalletBtn");
          const connectedWallet = document.getElementById("connectedWallet");
          const paymentSection = document.getElementById("paymentSection");

          if (connectWalletBtn) connectWalletBtn.style.display = "block";
          if (connectedWallet) connectedWallet.classList.add("hidden");
          if (payNowBtn) {
            payNowBtn.classList.add("hidden");
            payNowBtn.disabled = false;
            payNowBtn.textContent = "Pay Now";
          }
          if (paymentSection) paymentSection.classList.add("hidden");
          if (cancelPaymentBtn) cancelPaymentBtn.textContent = "Cancel";

          // Disconnect wallet
          disconnectWallet();
        }, 3000);
      } catch (notifyError) {
        console.error(
          "Backend notification error during manual verification:",
          notifyError
        );
        paymentStatus.className = "payment-status error";
        paymentStatus.textContent =
          "Transaction verification succeeded, but we couldn't notify the server. Please contact support with the transaction signature.";
      }
    } catch (error) {
      console.error("Manual verification error:", error);
      paymentStatus.className = "payment-status error";
      paymentStatus.textContent = `Verification failed: ${error.message}`;
    }
  }

  // Cancel payment button
  if (cancelPaymentBtn) {
    cancelPaymentBtn.addEventListener("click", function () {
      const paymentSection = document.getElementById("paymentSection");
      if (!paymentSection) return;

      // Hide payment section
      paymentSection.classList.add("hidden");

      // Reset UI
      if (connectWalletBtn) connectWalletBtn.style.display = "block";
      if (connectedWallet) connectedWallet.classList.add("hidden");
      if (payNowBtn) {
        payNowBtn.classList.add("hidden");
        payNowBtn.disabled = false;
        payNowBtn.textContent = "Pay Now";
      }
      if (paymentStatus) {
        paymentStatus.className = "payment-status";
        paymentStatus.textContent = "";
      }
      if (cancelPaymentBtn) cancelPaymentBtn.textContent = "Cancel";

      // Disconnect wallet
      disconnectWallet();
    });
  }

  window.selectPackage = selectPackage;
});
