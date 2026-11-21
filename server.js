// 旅行地图 - 本地数据服务器
// 作用：提供页面访问 + 把草稿数据保存为同文件夹下 data/travel-map-data.json 文件
// 启动：node server.js   （或用“启动旅行地图.bat”）
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA_DIR = process.env.TRAVEL_MAP_DATA_DIR ? path.resolve(process.env.TRAVEL_MAP_DATA_DIR) : path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'travel-map-data.json');
const PORT = 8345;
const HOST = '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}

http.createServer((req, res) => {
  const u = new URL(req.url, `http://${HOST}:${PORT}`);

  // CORS 预检（file:// 方式打开页面时也需要跨源读写）
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  // ---- 数据 API ----
  if (u.pathname === '/api/travel-data') {
    if (req.method === 'GET') {
      try {
        ensureDataDir();
        if (fs.existsSync(DATA_FILE)) {
          const raw = fs.readFileSync(DATA_FILE, 'utf8');
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders() });
          res.end(raw);
        } else {
          res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders() });
          res.end(JSON.stringify({ error: 'no-data' }));
        }
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders() });
        res.end(JSON.stringify({ error: String(e) }));
      }
      return;
    }
    if (req.method === 'PUT') {
      let body = '';
      req.on('data', c => { body += c; if (body.length > 50 * 1024 * 1024) req.destroy(); });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (!data || !Array.isArray(data.drafts)) throw new Error('数据格式不正确');
          ensureDataDir();
          const tmp = DATA_FILE + '.tmp';
          fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
          fs.renameSync(tmp, DATA_FILE); // 原子替换，避免写一半损坏
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders() });
          res.end(JSON.stringify({ ok: true }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders() });
          res.end(JSON.stringify({ error: String(e) }));
        }
      });
      return;
    }
    res.writeHead(405, corsHeaders());
    res.end();
    return;
  }

  // ---- 静态文件 ----
  let p = u.pathname === '/' ? '/旅行地图.html' : u.pathname;
  try { p = decodeURIComponent(p); } catch (_) { /* keep as-is */ }
  const file = path.join(ROOT, path.normalize(p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('文件不存在: ' + p);
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, HOST, () => {
  console.log('==============================================');
  console.log('  旅行地图服务器已启动');
  console.log('  请用浏览器打开: http://' + HOST + ':' + PORT + '/');
  console.log('  数据文件: ' + DATA_FILE);
  console.log('  关闭本窗口即停止服务（页面仍可 file:// 方式打开使用）');
  console.log('==============================================');
}).on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error('[错误] 端口 ' + PORT + ' 已被占用。');
    console.error('可能服务器已经在运行（无需重复启动），或请先关闭占用端口的程序。');
  } else {
    console.error('[错误] ' + err.message);
  }
  process.exit(1);
});
