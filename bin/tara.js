#!/usr/bin/env node

require('dotenv').config();

const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');

const program = new Command();

program
  .name('tara-ta')
  .description('TARA — Tugas Akhir Research Agent')
  .version('0.1.0');

program
  .command('start', { isDefault: true })
  .description('Start TARA server')
  .action(async () => {
    console.log(`
╔══════════════════════════════════════╗
║           🎓  T A R A               ║
║   Tugas Akhir Research Agent        ║
║           v0.1.0                    ║
╚══════════════════════════════════════╝
    `);

    // Check Node version
    const nodeVersion = process.versions.node.split('.').map(Number);
    if (nodeVersion[0] < 18) {
      console.error('❌ TARA membutuhkan Node.js 18+. Install versi terbaru: https://nodejs.org');
      process.exit(1);
    }

    const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
    const envPath = path.join(process.cwd(), '.env');

    // First run wizard
    if (!fs.existsSync(envPath)) {
      console.log('🔧 Pertama kali nge-run TARA? Yuk setup dulu!\n');

      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const question = (q) => new Promise(resolve => rl.question(q, resolve));

      console.log('API key minimal salah satu harus diisi. Rekomendasi: OpenRouter (satu key akses SEMUA model!)\n');

      const openrouterKey = await question('OpenRouter API Key (rekomendasi, opsional): ');
      const anthropicKey = await question('Anthropic API Key (opsional): ');
      const openaiKey = await question('OpenAI API Key (untuk embedding + opsional LLM): ');

      if (openrouterKey.trim()) {
        console.log('\n✅ OpenRouter key diset — bisa akses Claude, GPT, Gemini, DeepSeek, dll!');
      }
      if (!openrouterKey.trim() && !anthropicKey.trim() && !openaiKey.trim()) {
        console.log('\n⚠️  Tidak ada API key yang diisi. Nanti isi .env manual atau jalankan ulang wizard.');
      }
      if (!openaiKey.trim() && !openrouterKey.trim()) {
        console.log('\n⚠️  OpenAI / OpenRouter key kosong — embedding & plagiarism check tidak akan jalan.');
      }

      const envContent = [
        openrouterKey.trim() ? `OPENROUTER_API_KEY=${openrouterKey.trim()}` : '# OPENROUTER_API_KEY=sk-or-v1-...',
        anthropicKey.trim() ? `ANTHROPIC_API_KEY=${anthropicKey.trim()}` : '# ANTHROPIC_API_KEY=sk-ant-...',
        openaiKey.trim() ? `OPENAI_API_KEY=${openaiKey.trim()}` : '# OPENAI_API_KEY=sk-...',
        `PORT=3000`,
        `DATA_DIR=${dataDir}`,
        `LOG_LEVEL=info`,
      ].join('\n') + '\n';

      fs.writeFileSync(envPath, envContent);
      console.log('\n✓ .env tersimpan.\n');
      rl.close();

      // Set env vars directly (dotenv won't override by default)
      if (openrouterKey.trim()) process.env.OPENROUTER_API_KEY = openrouterKey.trim();
      if (anthropicKey.trim()) process.env.ANTHROPIC_API_KEY = anthropicKey.trim();
      if (openaiKey.trim()) process.env.OPENAI_API_KEY = openaiKey.trim();
    }

    // Ensure data directories exist
    const dirs = [
      dataDir,
      path.join(dataDir, 'pdfs'),
      path.join(dataDir, 'vectors'),
    ];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Membuat folder: ${dir}`);
      }
    }

    // Check if dependencies are installed
    const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      console.log('📦 Menginstall dependencies...');
      try {
        execSync('npm install --production', {
          cwd: path.join(__dirname, '..'),
          stdio: 'inherit',
        });
      } catch (err) {
        console.error('❌ Gagal install dependencies. Coba jalankan "npm install" manual.');
        process.exit(1);
      }
    }

    // Build frontend if not built
    const distPath = path.join(__dirname, '..', 'dist');
    if (!fs.existsSync(distPath) || !fs.existsSync(path.join(distPath, 'index.html'))) {
      console.log('🔨 Building frontend...');
      try {
        execSync('npx vite build', {
          cwd: path.join(__dirname, '..'),
          stdio: 'inherit',
        });
        console.log('✓ Frontend built.\n');
      } catch (err) {
        console.warn('⚠️  Gagal build frontend. Jalankan "npm run build" manual.\n');
      }
    }

    // Check API keys
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!openrouterKey && !anthropicKey && !openaiKey) {
      console.error('❌ Tidak ada API key yang diset. Tambahkan OPENROUTER_API_KEY, ANTHROPIC_API_KEY, atau OPENAI_API_KEY ke .env');
      process.exit(1);
    }

    console.log('🚀 Starting TARA server...\n');

    // Start the server
    const serverPath = path.join(__dirname, '..', 'src', 'server', 'index.js');
    const server = spawn('node', [serverPath], {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
      env: process.env,
    });

    server.on('error', (err) => {
      console.error('❌ Gagal menjalankan server:', err.message);
      process.exit(1);
    });

    server.on('exit', (code) => {
      process.exit(code || 0);
    });

    // Open browser after a short delay
    setTimeout(() => {
      const port = process.env.PORT || 3000;
      const url = `http://localhost:${port}`;
      console.log(`\n🌐 Membuka browser ke ${url}...\n`);

      const platform = process.platform;
      try {
        if (platform === 'win32') {
          execSync(`start ${url}`, { stdio: 'ignore' });
        } else if (platform === 'darwin') {
          execSync(`open ${url}`, { stdio: 'ignore' });
        } else {
          execSync(`xdg-open ${url}`, { stdio: 'ignore' });
        }
      } catch {
        // Browser open is best-effort
      }
    }, 2000);
  });

program.parse(process.argv);
