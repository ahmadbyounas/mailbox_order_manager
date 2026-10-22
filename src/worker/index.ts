import { ProvisioningWorker } from "./worker";

async function run() {
  const worker = new ProvisioningWorker();

  process.on("SIGINT", () => {
    worker.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    worker.stop();
    process.exit(0);
  });

  await worker.startContinuousLoop(3000);
}

run().catch((err) => {
  console.error("Worker fatal failure:", err);
  process.exit(1);
});
