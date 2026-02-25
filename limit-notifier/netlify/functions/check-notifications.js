const { getStore } = require("@netlify/blobs");

const STORE_NAME = "notifications";
const NTFY_URL = "https://ntfy.sh";

async function sendNtfyNotification(topic, targetTime) {
  const timeStr = new Date(targetTime).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

  const response = await fetch(`${NTFY_URL}/${topic}`, {
    method: "POST",
    headers: {
      Title: "Claude Limit Reset Soon!",
      Priority: "high",
      Tags: "alarm_clock",
    },
    body: `Your Claude limit resets in 5 minutes (at ${timeStr} IST)`,
  });

  return response.ok;
}

exports.handler = async (event, context) => {
  const store = getStore(STORE_NAME);
  const now = Date.now();
  const results = [];

  try {
    const { blobs } = await store.list();

    for (const blob of blobs) {
      const notification = await store.get(blob.key, { type: "json" });

      if (notification.sent) {
        // Clean up old sent notifications (older than 1 hour)
        const targetDate = new Date(notification.targetTime).getTime();
        if (now - targetDate > 60 * 60 * 1000) {
          await store.delete(blob.key);
          results.push({ id: blob.key, action: "deleted_old" });
        }
        continue;
      }

      const notifyTime = new Date(notification.notifyTime).getTime();

      // Check if it's time to send (within 1 minute window)
      if (notifyTime <= now && now - notifyTime < 60 * 1000) {
        let ntfySent = false;

        if (notification.ntfyTopic) {
          ntfySent = await sendNtfyNotification(
            notification.ntfyTopic,
            notification.targetTime
          );
        }

        // Mark as sent
        await store.setJSON(blob.key, { ...notification, sent: true, ntfySent });
        results.push({ id: blob.key, action: "sent", ntfySent });
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ processed: results.length, results }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
