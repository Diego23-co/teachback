# TeachBack

Learn by teaching Kai, a virtual study buddy who only knows what you explain.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## How it works

- **Kai's brain** (`src/lib/engine.ts`) runs entirely in the browser. Each explanation is split into
  sentences and matched against the rules for every idea in the topic (`src/lib/topics.ts`):
  - explained clearly → *Kai gets this* (mint)
  - stated wrongly → *Kai has this mixed up* (coral), and Kai repeats the wrong belief
  - mentioned vaguely → *Kai is unsure* (amber), or Kai infers a plausible wrong idea (inheritance)
- Kai then asks **one** question about the next unclear or untaught idea.
- **Watch Kai try** runs the topic's worked example using only what Kai has been taught, and stops at the
  first idea Kai has wrong or doesn't know.
- To add or tune a topic, edit `src/lib/topics.ts` (nodes, rules, questions, example, sample answers).

## Storage (no database)

Everything lives in the browser's `localStorage` (`src/lib/vault.ts`):

| Key | Contents |
| --- | --- |
| `tb-accounts` | Profiles on this device: name, course, salted PBKDF2 hash of the PIN |
| `tb-data-<id>` | That profile's settings and sessions (conversation, map, reflection) |
| `tb-auth` | Who is signed in (`localStorage` = keep me signed in, otherwise `sessionStorage`) |

- **Signing back in:** pick your profile and enter your PIN.
- **Another device:** *Privacy & Data → Download my data* creates a backup file encrypted with your PIN
  (AES-GCM). On the other device choose *Restore from backup file* and enter the PIN.
- The PIN protects a shared device and the backup file; it is not server-grade security. There's no server,
  so a forgotten PIN can't be reset; the profile can only be removed from the device.
- Encryption needs a secure context (https or localhost). Over plain http on a LAN, backups fall back to
  unencrypted files.

Voice input uses the browser's Web Speech API (Chrome/Edge). In Chrome, speech is transcribed by Google's
speech service, and transcripts are shown for review before they are sent to Kai.
