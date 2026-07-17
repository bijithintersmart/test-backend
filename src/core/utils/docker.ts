import { execSync } from 'child_process';
import net from 'net';
import { env } from '../../config/env';

interface DockerStatus {
  installed: boolean;
  running: boolean;
}

/**
 * Checks if Docker is installed and running/active on the system.
 */
export function checkDockerStatus(): DockerStatus {
  try {
    execSync('docker --version', { stdio: 'ignore' });
  } catch {
    return { installed: false, running: false };
  }

  try {
    execSync('docker ps', { stdio: 'ignore' });
    return { installed: true, running: true };
  } catch {
    return { installed: true, running: false };
  }
}

/**
 * Checks if Docker is disabled or inactive, and prints a clear, user-friendly error message, then exits.
 * Only runs in development or test environments.
 */
export function handleDockerError(serviceName: string, _originalError: any): void {
  // If we are in production, we do not want to check or crash based on local Docker status.
  if (env.NODE_ENV === 'production') {
    return;
  }

  if (process.env.SKIP_DOCKER_CHECK === 'true') {
    return;
  }

  const status = checkDockerStatus();
  if (status.installed && !status.running) {
    console.error('\n========================================================================');
    console.error(`❌ ERROR: Failed to connect to ${serviceName}.`);
    console.error('❌ Docker is installed but is currently disabled or not active.');
    console.error('👉 Please start the Docker daemon (e.g., open Docker Desktop) and try again.');
    console.error('========================================================================\n');
    process.exit(1);
  }
}

/**
 * Helper to check if a local port is open.
 */
function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const onError = () => {
      socket.destroy();
      resolve(false);
    };

    socket.setTimeout(800);
    socket.once('error', onError);
    socket.once('timeout', onError);

    socket.connect(port, '127.0.0.1', () => {
      socket.end();
      resolve(true);
    });
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Checks if Docker is installed but inactive in local development, prints a fatal error, and exits.
 * If Docker is active but database/redis are down, attempts to automatically spin them up using Docker Compose.
 * Can be bypassed by setting SKIP_DOCKER_CHECK=true in .env file.
 */
export async function checkDockerAndExitIfInactive(): Promise<void> {
  if (env.NODE_ENV !== 'development') {
    return;
  }

  if (process.env.SKIP_DOCKER_CHECK === 'true') {
    return;
  }

  // 1. Check if both Postgres and Redis ports are already open
  const dbOpen = await isPortOpen(5432);
  const redisOpen = await isPortOpen(6379);

  if (dbOpen && redisOpen) {
    // Both ports are open, nothing to start or fix!
    return;
  }

  // 2. Since services are down, check if Docker is running
  const status = checkDockerStatus();

  // If Docker is not installed, assume native services (which are currently down).
  // Let the database/redis connect calls try and fail normally.
  if (!status.installed) {
    return;
  }

  // If Docker is installed but daemon is not active
  if (!status.running) {
    console.error('\n========================================================================');
    console.error('❌ ERROR: Docker is installed but is currently disabled or not active.');
    console.error('👉 Please start the Docker daemon (e.g., open Docker Desktop) and try again.');
    console.error('👉 To bypass this check (e.g., if running native services), set SKIP_DOCKER_CHECK=true in your .env');
    console.error('========================================================================\n');
    process.exit(1);
  }

  // Docker daemon is active, but services are down. Auto-start them!
  console.log('\n========================================================================');
  console.log('ℹ️ Docker is active, but Postgres (5432) or Redis (6379) is not running.');
  console.log('🚀 Attempting to automatically start services via Docker Compose...');
  console.log('========================================================================\n');

  try {
    try {
      execSync('docker compose up -d postgres redis', { stdio: 'inherit' });
    } catch {
      execSync('docker-compose up -d postgres redis', { stdio: 'inherit' });
    }

    console.log('\n⏳ Waiting for services to become ready...');

    // Wait and check ports in a loop (up to 15 seconds)
    for (let i = 0; i < 15; i++) {
      await sleep(1000);
      const dbReady = await isPortOpen(5432);
      const redisReady = await isPortOpen(6379);
      if (dbReady && redisReady) {
        console.log('✅ Postgres and Redis are ready! Starting server...\n');
        return;
      }
    }

    console.warn('⚠️ Services were started, but did not respond on ports 5432 and 6379 in time.');
  } catch (error) {
    console.error('❌ Failed to automatically start services via Docker Compose.');
    console.error(error);
    process.exit(1);
  }
}
