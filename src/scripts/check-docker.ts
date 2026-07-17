import { checkDockerAndExitIfInactive } from '../core/utils/docker';

(async () => {
  try {
    await checkDockerAndExitIfInactive();
  } catch (error) {
    console.error('❌ Docker check script failed:', error);
    process.exit(1);
  }
})();
