import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import JSZip from 'jszip';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads directory
const uploadsDir = path.resolve(process.cwd(), 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Helper to save base64 image to public/uploads
function saveBase64Image(imageBase64: string, prefix = 'img'): string {
  const matches = imageBase64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  let ext = 'jpg';
  let buffer: Buffer;

  if (matches) {
    const mime = matches[1];
    if (mime === 'image/png') ext = 'png';
    else if (mime === 'image/webp') ext = 'webp';
    else if (mime === 'image/gif') ext = 'gif';
    buffer = Buffer.from(matches[2], 'base64');
  } else {
    buffer = Buffer.from(imageBase64, 'base64');
  }

  const filename = `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, buffer);

  return `/uploads/${filename}`;
}

// POST /api/upload-hero - Upload and save hero banner
app.post('/api/upload-hero', (req, res) => {
  try {
    const { imageBase64 } = req.body || {};
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ success: false, error: 'กรุณาส่งข้อมูลรูปภาพ' });
    }

    const url = saveBase64Image(imageBase64, 'hero');
    return res.json({ success: true, url });
  } catch (err) {
    console.error('Upload hero error:', err);
    return res.status(500).json({ success: false, error: 'บันทึกรูปภาพไม่สำเร็จ' });
  }
});

// POST /api/upload-image - Upload and save image
app.post('/api/upload-image', (req, res) => {
  try {
    const { imageBase64, prefix = 'menu' } = req.body || {};
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ success: false, error: 'กรุณาส่งข้อมูลรูปภาพ' });
    }

    const safePrefix = prefix === 'hero' ? 'hero' : 'menu';
    const url = saveBase64Image(imageBase64, safePrefix);
    return res.json({ success: true, url });
  } catch (err) {
    console.error('Upload image error:', err);
    return res.status(500).json({ success: false, error: 'บันทึกรูปภาพไม่สำเร็จ' });
  }
});

// In-memory active session tokens with timestamps
const activeSessions = new Map<string, number>();

// Clean expired sessions periodically (valid for 24 hours)
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [token, createdAt] of activeSessions.entries()) {
    if (now - createdAt > SESSION_TTL_MS) {
      activeSessions.delete(token);
    }
  }
}, 60 * 60 * 1000);

// Secret Salt for backend PIN verification
const SERVER_SALT = 'baan_steak_online_secure_salt_2026';
// Target PIN: 0850451606 hashed with server salt
const TARGET_PIN_HASH = crypto
  .createHash('sha256')
  .update(`0850451606_${SERVER_SALT}`)
  .digest('hex');

// POST /api/admin/login - Verify PIN securely on backend
app.post('/api/admin/login', (req, res) => {
  try {
    const { pin } = req.body || {};
    if (!pin || typeof pin !== 'string') {
      return res.status(400).json({ success: false, error: 'กรุณากรอก PIN' });
    }

    const inputHash = crypto
      .createHash('sha256')
      .update(`${pin.trim()}_${SERVER_SALT}`)
      .digest('hex');

    // Constant-time buffer comparison to prevent timing attacks
    const bufInput = Buffer.from(inputHash, 'utf8');
    const bufTarget = Buffer.from(TARGET_PIN_HASH, 'utf8');

    if (bufInput.length === bufTarget.length && crypto.timingSafeEqual(bufInput, bufTarget)) {
      const sessionToken = crypto.randomBytes(32).toString('hex');
      activeSessions.set(sessionToken, Date.now());
      return res.json({ success: true, token: sessionToken });
    }

    return res.status(401).json({ success: false, error: 'PIN ไม่ถูกต้อง' });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
});

// POST /api/admin/verify - Verify session token
app.post('/api/admin/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '').trim();
  if (token && activeSessions.has(token)) {
    const createdAt = activeSessions.get(token)!;
    if (Date.now() - createdAt <= SESSION_TTL_MS) {
      return res.json({ valid: true });
    }
    activeSessions.delete(token);
  }
  return res.status(401).json({ valid: false });
});

// POST /api/admin/logout - Clear session token
app.post('/api/admin/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '').trim();
  if (token) {
    activeSessions.delete(token);
  }
  return res.json({ success: true });
});

// GET /api/revision-info - Return current revision and pre-deployment file check
app.get('/api/revision-info', (req, res) => {
  const rootDir = process.cwd();
  const hasVercelJson = fs.existsSync(path.resolve(rootDir, 'vercel.json'));
  const hasFirebaseConfig = fs.existsSync(path.resolve(rootDir, 'firebase-applet-config.json'));
  const hasPackageJson = fs.existsSync(path.resolve(rootDir, 'package.json'));
  const hasIndexHtml = fs.existsSync(path.resolve(rootDir, 'index.html'));
  const hasSrcDir = fs.existsSync(path.resolve(rootDir, 'src'));

  return res.json({
    success: true,
    revision: '2.4.0',
    revisionCode: 'rev-2.4.0',
    deployReady: hasVercelJson && hasFirebaseConfig && hasPackageJson && hasIndexHtml && hasSrcDir,
    filesCheck: {
      hasVercelJson,
      hasFirebaseConfig,
      hasPackageJson,
      hasIndexHtml,
      hasSrcDir,
    },
    nodeModulesExcluded: true,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/export-source - Stream full, clean project source ZIP for GitHub & Vercel
app.get('/api/export-source', async (req, res) => {
  try {
    const rootDir = process.cwd();
    const zip = new JSZip();

    // Folders and files to exclude strictly to guarantee clean mobile upload and Vercel build
    const excludePatterns = [
      'node_modules',
      'dist',
      'build',
      '.git',
      '.aistudio',
      '.DS_Store',
      'server.js',
      'bun.lock',
    ];

    const shouldExclude = (relativeFilePath: string) => {
      const normalized = relativeFilePath.replace(/\\/g, '/');
      return excludePatterns.some((p) => {
        return (
          normalized === p ||
          normalized.startsWith(`${p}/`) ||
          normalized.endsWith(`/${p}`) ||
          normalized.endsWith('.log')
        );
      });
    };

    let fileCount = 0;

    const addFilesRecursively = (dir: string, baseDir: string) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

        if (shouldExclude(relPath)) {
          continue;
        }

        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          addFilesRecursively(fullPath, baseDir);
        } else if (stat.isFile()) {
          const fileBuffer = fs.readFileSync(fullPath);
          zip.file(relPath, fileBuffer);
          fileCount++;
        }
      }
    };

    addFilesRecursively(rootDir, rootDir);

    // Dynamic timestamp and revision tracking
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timeStampStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
    const customRev = (req.query.rev as string) || 'rev-2.4.0';
    const cleanRev = customRev.replace(/[^a-zA-Z0-9.-]/g, '');
    const filename = `baan-steak-source-${cleanRev}-${timeStampStr}.zip`;

    // Add manifest inside the zip
    const manifest = {
      project: 'บ้าน สเต็กออนไลน์ (Baan Steak Online)',
      revision: cleanRev,
      exportedAt: now.toISOString(),
      formattedThaiTime: new Intl.DateTimeFormat('th-TH', {
        dateStyle: 'full',
        timeStyle: 'medium',
        timeZone: 'Asia/Bangkok',
      }).format(now),
      totalFilesCount: fileCount,
      targetPlatforms: ['GitHub', 'Vercel'],
      vercelSpaConfig: 'vercel.json included with rewrite rules',
      adminDefaultPin: '0850451606',
      instructions: 'Upload to GitHub, then Import in Vercel with zero config required',
    };
    zip.file('REVISION_MANIFEST.json', JSON.stringify(manifest, null, 2));

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', zipBuffer.length.toString());
    res.setHeader('X-Revision', cleanRev);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Revision');

    return res.end(zipBuffer);
  } catch (err) {
    console.error('Export source error:', err);
    return res.status(500).json({ success: false, error: 'ไม่สามารถสร้างไฟล์ ZIP ได้' });
  }
});


async function main() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend server running on http://0.0.0.0:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
