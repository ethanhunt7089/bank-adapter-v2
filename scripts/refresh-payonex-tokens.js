#!/usr/bin/env node

const { PrismaClient } = require("@prisma/client");
const axios = require("axios");

const prisma = new PrismaClient();

/**
 * Refresh PayOneX tokens for all active PayOneX tokens in database
 * Run this script every 20 hours via cronjob
 */
async function refreshPayOneXTokens() {
  console.log("=== PayOneX Token Refresh Started ===");
  console.log(`Timestamp: ${new Date().toISOString()}`);

  try {
    // หา tokens ทั้งหมดที่เป็น PayOneX และ active
    const payonexTokens = await prisma.token.findMany({
      where: {
        paymentSys: "payonex",
        isActive: true,
        paymentAccess: { not: null },
        paymentSecret: { not: null },
      },
    });

    console.log(
      `Found ${payonexTokens.length} active PayOneX tokens to refresh`
    );

    if (payonexTokens.length === 0) {
      console.log("No PayOneX tokens found. Exiting.");
      return;
    }

    const results = [];

    // Process each token
    for (const token of payonexTokens) {
      console.log(
        `\n--- Processing token for domain: ${token.targetDomain} ---`
      );

      try {
        // Call PayOneX authenticate API
        const response = await axios.post(
          "https://api.payonex.asia/authenticate",
          {
            accessKey: token.paymentAccess,
            secretKey: token.paymentSecret,
          },
          {
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            timeout: 30000, // 30 seconds timeout
          }
        );

        console.log(`PayOneX API Response Status: ${response.status}`);
        console.log(
          `PayOneX API Response:`,
          JSON.stringify(response.data, null, 2)
        );
        console.log(
          `Request payload:`,
          JSON.stringify(
            {
              accessKey: token.paymentAccess,
              secretKey: token.paymentSecret,
            },
            null,
            2
          )
        );

        if (response.data.success && response.data.data?.TOKEN) {
          const newToken = response.data.data.TOKEN;

          // Update token in database
          await prisma.token.update({
            where: { id: token.id },
            data: {
              paymentKey: newToken,
              updatedAt: new Date(),
            },
          });

          console.log(
            `✅ Token refreshed successfully for ${token.targetDomain}`
          );
          console.log(`New token: ${newToken.substring(0, 20)}...`);

          results.push({
            domain: token.targetDomain,
            status: "success",
            message: "Token refreshed successfully",
          });
        } else {
          console.error(
            `❌ PayOneX API returned error for ${token.targetDomain}:`,
            response.data
          );

          results.push({
            domain: token.targetDomain,
            status: "error",
            message: response.data.message || "Unknown API error",
          });
        }
      } catch (error) {
        console.error(
          `❌ Error refreshing token for ${token.targetDomain}:`,
          error.message
        );

        if (error.response) {
          console.error(`API Error Status: ${error.response.status}`);
          console.error(
            `API Error Data:`,
            JSON.stringify(error.response.data, null, 2)
          );
          console.error(
            `Request payload was:`,
            JSON.stringify(
              {
                accessKey: token.paymentAccess,
                secretKey: token.paymentSecret,
              },
              null,
              2
            )
          );
        }

        results.push({
          domain: token.targetDomain,
          status: "error",
          message: error.message,
        });
      }

      // Wait 1 second between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Summary
    console.log("\n=== Refresh Summary ===");
    const successful = results.filter((r) => r.status === "success").length;
    const failed = results.filter((r) => r.status === "error").length;

    console.log(`Total tokens processed: ${results.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);

    if (failed > 0) {
      console.log("\nFailed tokens:");
      results
        .filter((r) => r.status === "error")
        .forEach((result) => {
          console.log(`- ${result.domain}: ${result.message}`);
        });
    }

    console.log("\n=== PayOneX Token Refresh Completed ===");
  } catch (error) {
    console.error("❌ Fatal error during token refresh:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the refresh every 20 hours
async function runCron() {
  while (true) {
    try {
      await refreshPayOneXTokens();
      console.log("Waiting 20 hours until next refresh...");

      // Wait 20 hours (20 * 60 * 60 * 1000 milliseconds)
      await new Promise((resolve) => setTimeout(resolve, 20 * 60 * 60 * 1000));
    } catch (error) {
      console.error("Cron job error:", error.message);
      console.log("Waiting 1 hour before retry...");

      // Wait 1 hour before retry on error
      await new Promise((resolve) => setTimeout(resolve, 60 * 60 * 1000));
    }
  }
}

// Start the cron job
runCron();
