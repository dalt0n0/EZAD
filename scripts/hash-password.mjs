// Called by install.ps1 after npm ci to hash the admin password.
// Password is passed via EZAD_SETUP_PASS env var (never a command-line arg).
import { hashSync } from "bcryptjs";

const password = process.env.EZAD_SETUP_PASS;
if (!password) {
  process.stderr.write("EZAD_SETUP_PASS environment variable is required\n");
  process.exit(1);
}

process.stdout.write(hashSync(password, 12));
