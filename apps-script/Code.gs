const CLIENT_ID = "360849757137-agopfs0m8rgmcj541ucpg22btep5olt3.apps.googleusercontent.com";
const SHEET_ID = "1cmG2vOzltdCvNvost3ksAuItc9oEqPN2xIypaBbvPX8";
const SHEET_NAME = "Master";
const TIMEZONE = "Asia/Kolkata";

function jsonOutput(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function verifyIdToken(idToken) {
  if (!idToken) {
    throw new Error("Missing ID token");
  }

  const response = UrlFetchApp.fetch(
    "https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken),
    { muteHttpExceptions: true }
  );

  if (response.getResponseCode() !== 200) {
    throw new Error("Invalid ID token");
  }

  const info = JSON.parse(response.getContentText());
  if (info.aud !== CLIENT_ID) {
    throw new Error("Invalid token audience");
  }

  if (!info.email) {
    throw new Error("Email not available in token");
  }

  if (info.email_verified && info.email_verified !== "true") {
    throw new Error("Email not verified");
  }

  return info.email;
}

function normalizeDateValue(value) {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const [datePart, timePart = "00:00:00"] = value.trim().split(" ");
  const datePieces = datePart.split("/").map((part) => Number(part));
  if (datePieces.length !== 3 || datePieces.some(isNaN)) {
    return null;
  }

  const timePieces = timePart.split(":").map((part) => Number(part));
  if (timePieces.length !== 3 || timePieces.some(isNaN)) {
    return null;
  }

  const day = datePieces[0];
  const month = datePieces[1];
  const year = datePieces[2];
  const hour = timePieces[0];
  const minute = timePieces[1];
  const second = timePieces[2];

  return new Date(year, month - 1, day, hour, minute, second);
}

function formatDate(date) {
  if (!(date instanceof Date)) {
    return "";
  }
  return Utilities.formatDate(date, TIMEZONE, "dd/MM/yyyy HH:mm:ss");
}

function isPending(actualValue) {
  return actualValue === "" || actualValue === null || typeof actualValue === "undefined";
}

function toDateOnly(dateValue) {
  return new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate());
}

function getSheet() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error("Sheet not found");
  }
  return sheet;
}

function doGet(e) {
  try {
    const action = e?.parameter?.action;
    if (action !== "getTasks") {
      return jsonOutput({ ok: false, message: "Unsupported action" });
    }

    const email = verifyIdToken(e.parameter.idToken);
    const sheet = getSheet();
    const values = sheet.getDataRange().getValues();

    const today = toDateOnly(new Date());
    const tasks = [];

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const rowEmail = String(row[2] || "").trim();

      if (!rowEmail || rowEmail.toLowerCase() !== email.toLowerCase()) {
        continue;
      }

      const plannedValue = normalizeDateValue(row[6]);
      if (!plannedValue) {
        continue;
      }

      const actualValue = row[7];
      if (!isPending(actualValue)) {
        continue;
      }

      if (toDateOnly(plannedValue) > today) {
        continue;
      }

      tasks.push({
        name: row[0] || "",
        department: row[1] || "",
        email: rowEmail,
        taskId: row[3] || "",
        freq: row[4] || "",
        task: row[5] || "",
        plannedRaw: plannedValue.getTime(),
        plannedStr: formatDate(plannedValue),
        actualStr: ""
      });
    }

    tasks.sort((a, b) => a.plannedRaw - b.plannedRaw);

    return jsonOutput({ ok: true, email: email, tasks: tasks });
  } catch (error) {
    return jsonOutput({ ok: false, message: error.message || "Server error" });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");
    if (payload.action !== "markDone") {
      return jsonOutput({ ok: false, message: "Unsupported action" });
    }

    const email = verifyIdToken(payload.idToken);
    const taskId = String(payload.taskId || "").trim();
    if (!taskId) {
      return jsonOutput({ ok: false, message: "Missing task ID" });
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    const sheet = getSheet();
    const values = sheet.getDataRange().getValues();
    let targetRow = -1;

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const rowTaskId = String(row[3] || "").trim();
      if (rowTaskId !== taskId) {
        continue;
      }

      const rowEmail = String(row[2] || "").trim();
      if (!rowEmail || rowEmail.toLowerCase() !== email.toLowerCase()) {
        throw new Error("Unauthorized to update this task");
      }

      targetRow = i + 1;
      break;
    }

    if (targetRow === -1) {
      throw new Error("Task not found");
    }

    const now = new Date();
    sheet.getRange(targetRow, 8).setValue(now);

    return jsonOutput({
      ok: true,
      taskId: taskId,
      actual: formatDate(now)
    });
  } catch (error) {
    return jsonOutput({ ok: false, message: error.message || "Server error" });
  }
}
