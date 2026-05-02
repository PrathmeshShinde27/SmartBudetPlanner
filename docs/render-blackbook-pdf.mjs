import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const root = resolve('.');
const htmlPath = resolve(root, 'docs', 'smart-budget-planner-blackbook.html');
const pdfPath = resolve(root, 'docs', 'Smart-Budget-Planner-Blackbook.pdf');
const userDataDir = await mkdtemp(join(tmpdir(), 'sbp-pdf-'));
const port = 9223 + Math.floor(Math.random() * 1000);

function wait(ms) {
  return new Promise((resolveWait) => setTimeout(resolveWait, ms));
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${response.status} ${url}`);
  return response.json();
}

async function waitForDebugTarget() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const pages = await getJson(`http://127.0.0.1:${port}/json`);
      const page = pages.find((item) => item.type === 'page' && item.webSocketDebuggerUrl);
      if (page) return page;
    } catch {
      await wait(150);
    }
  }
  throw new Error('Timed out waiting for Edge remote debugging target');
}

async function send(socket, id, method, params = {}) {
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolveSend, reject) => {
    function onMessage(event) {
      const message = JSON.parse(event.data.toString());
      if (message.id !== id) return;
      socket.removeEventListener('message', onMessage);
      if (message.error) reject(new Error(message.error.message));
      else resolveSend(message.result);
    }
    socket.addEventListener('message', onMessage);
  });
}

const edge = spawn(edgePath, [
  '--headless=new',
  '--disable-gpu',
  '--disable-crash-reporter',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${userDataDir}`,
  'about:blank'
], { stdio: 'ignore' });

try {
  const target = await waitForDebugTarget();
  const WebSocket = globalThis.WebSocket;
  if (!WebSocket) throw new Error('This Node.js version does not expose WebSocket globally');

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolveOpen, reject) => {
    socket.addEventListener('open', resolveOpen, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  let id = 1;
  await send(socket, id++, 'Page.enable');
  await send(socket, id++, 'Page.navigate', { url: `file:///${htmlPath.replaceAll('\\', '/')}` });
  await wait(1200);

  const footerTemplate = `
    <div style="width:100%;font-family:Segoe UI,Arial,sans-serif;font-size:8px;color:#5b6b7f;padding:0 14mm;box-sizing:border-box;">
      <span>Smart Budget Planner | Built by Prathmesh Shinde | <a href="https://prathmeshshinde.com/" style="color:#5b6b7f;text-decoration:none;">prathmeshshinde.com</a></span>
      <span style="float:right;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>`;

  const result = await send(socket, id++, 'Page.printToPDF', {
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate,
    marginTop: 0.55,
    marginBottom: 0.55,
    marginLeft: 0.55,
    marginRight: 0.55,
    paperWidth: 8.27,
    paperHeight: 11.69,
    preferCSSPageSize: false
  });

  await writeFile(pdfPath, Buffer.from(result.data, 'base64'));
  socket.close();
  console.log(`PDF written: ${pdfPath}`);
} finally {
  edge.kill('SIGTERM');
  await wait(500);
  await rm(userDataDir, { recursive: true, force: true });
}
