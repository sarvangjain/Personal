const { getStore } = require("@netlify/blobs");

const STORE_NAME = "notifications";

exports.handler = async (event, context) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const store = getStore(STORE_NAME);

  try {
    if (event.httpMethod === "GET") {
      const { blobs } = await store.list();
      const notifications = await Promise.all(
        blobs.map(async (blob) => {
          const data = await store.get(blob.key, { type: "json" });
          return { id: blob.key, ...data };
        })
      );
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(notifications),
      };
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body);
      const { targetTime, notifyTime, originalInput, ntfyTopic } = body;

      if (!targetTime || !notifyTime) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Missing required fields" }),
        };
      }

      const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const notification = {
        targetTime,
        notifyTime,
        originalInput,
        ntfyTopic,
        createdAt: new Date().toISOString(),
        sent: false,
      };

      await store.setJSON(id, notification);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ id, ...notification }),
      };
    }

    if (event.httpMethod === "DELETE") {
      const id = event.path.split("/").pop();
      if (id && id !== "notifications") {
        await store.delete(id);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true }),
        };
      }
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing notification ID" }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
