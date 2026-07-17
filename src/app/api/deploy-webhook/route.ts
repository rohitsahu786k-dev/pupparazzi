import { spawn } from "child_process";
import { createHmac, timingSafeEqual } from "crypto";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEPLOY_LOG = "/home/pupparazziclub/logs/deploy-webhook.log";
const DEPLOY_TMP = "/home/pupparazziclub/tmp";
const APP_DIR = "/home/pupparazziclub/htdocs/pupparazziclub.in";
const NODE_PATH = "/home/pupparazziclub/.nvm/versions/node/v22.23.1/bin";
const PATH_VALUE = `${NODE_PATH}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`;

function verifySignature(body: string, signature: string | null) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signature?.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer);
}

function deployScript() {
  return `#!/usr/bin/env bash
set -euo pipefail

LOG="${DEPLOY_LOG}"
LOCK="${DEPLOY_TMP}/deploy-webhook.lock"
APP="${APP_DIR}"
export PATH="${PATH_VALUE}"

mkdir -p "$(dirname "$LOG")" "${DEPLOY_TMP}"
exec >> "$LOG" 2>&1

echo ""
echo "===== deploy $(date -Is) ====="

if ! mkdir "$LOCK" 2>/dev/null; then
  echo "Another deploy is already running; skipping."
  exit 0
fi
trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT

cd "$APP"
git fetch origin master
git reset --hard origin/master
npm ci
npx prisma db push
npm run build

pkill -TERM -f 'next start|next-server|npm start' 2>/dev/null || true
sleep 5
setsid npm start -- -p 3000 -H 127.0.0.1 > /home/pupparazziclub/logs/pupparazziclub-next.log 2>&1 < /dev/null &
sleep 3
pgrep -af 'next start|next-server|npm start' || true
echo "Deploy complete $(date -Is)"
`;
}

function startDeploy() {
  if (!existsSync(DEPLOY_TMP)) mkdirSync(DEPLOY_TMP, { recursive: true });
  const scriptPath = join(DEPLOY_TMP, `deploy-webhook-${Date.now()}.sh`);
  writeFileSync(scriptPath, deployScript(), { mode: 0o700 });
  const child = spawn("bash", [scriptPath], {
    cwd: APP_DIR,
    detached: true,
    stdio: "ignore",
    env: { ...process.env, PATH: PATH_VALUE },
  });
  child.unref();
  return scriptPath;
}

export async function POST(req: Request) {
  const body = await req.text();
  if (!verifySignature(body, req.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ ok: false, message: "Invalid webhook signature" }, { status: 401 });
  }

  const event = req.headers.get("x-github-event") || "";
  if (event === "ping") {
    return NextResponse.json({ ok: true, message: "Webhook received" });
  }
  if (event !== "push") {
    return NextResponse.json({ ok: true, message: `Ignored ${event || "unknown"} event` });
  }

  let payload: { ref?: string } = {};
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON payload" }, { status: 400 });
  }

  if (payload.ref !== "refs/heads/master") {
    return NextResponse.json({ ok: true, message: `Ignored ref ${payload.ref || "unknown"}` });
  }

  const scriptPath = startDeploy();
  return NextResponse.json({ ok: true, message: "Deploy started", scriptPath }, { status: 202 });
}
