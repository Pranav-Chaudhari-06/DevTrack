#!/usr/bin/env node
/*
 * One-shot migration: Task.assignedTo (String) -> Task.assignedTo (ObjectId ref)
 *
 * Older tasks stored the assignee as a free-text name or email. The new shape
 * is { assignedTo: ObjectId ref:'User', assigneeName: String }.
 *
 * For each task with a string-shaped assignedTo, this resolves it to a User
 * via exact lowercased email match, then case-insensitive exact name match,
 * and updates the document via the native driver so the in-flight schema
 * validation doesn't reject the legacy shape mid-flight.
 *
 * Usage:
 *   node scripts/migrate-assignee.js              # apply changes
 *   node scripts/migrate-assignee.js --dry-run    # report what would change
 */

const mongoose = require('mongoose');
require('dotenv').config();

const DRY_RUN = process.argv.includes('--dry-run');

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is required');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  const tasks = mongoose.connection.db.collection('tasks');
  const users = mongoose.connection.db.collection('users');

  // Only legacy string-shaped values need attention; new tasks already have ObjectId.
  const cursor = tasks.find({ assignedTo: { $type: 'string', $ne: '' } });

  let scanned = 0, matched = 0, unmatched = 0, cleared = 0;
  const unresolved = [];

  while (await cursor.hasNext()) {
    const t = await cursor.next();
    scanned++;
    const raw = t.assignedTo.toLowerCase().trim();

    let user =
      (await users.findOne({ email: raw })) ||
      (await users.findOne({ name: { $regex: new RegExp(`^${escapeRegExp(raw)}$`, 'i') } }));

    if (user) {
      matched++;
      if (!DRY_RUN) {
        await tasks.updateOne(
          { _id: t._id },
          { $set: { assignedTo: user._id, assigneeName: user.name } }
        );
      }
    } else {
      unmatched++;
      unresolved.push({ taskId: t._id.toString(), assignedTo: t.assignedTo });
      if (!DRY_RUN) {
        // Clear the field so the schema validates on next save.
        await tasks.updateOne(
          { _id: t._id },
          { $set: { assignedTo: null, assigneeName: null } }
        );
        cleared++;
      }
    }
  }

  console.log(`\nScanned:   ${scanned} task(s) with legacy string assignedTo`);
  console.log(`Matched:   ${matched}`);
  console.log(`Unmatched: ${unmatched}${DRY_RUN ? '' : ` (cleared: ${cleared})`}`);
  if (unresolved.length) {
    console.log('\nUnresolved assignees (left null):');
    unresolved.forEach((u) => console.log(`  ${u.taskId}  ←  "${u.assignedTo}"`));
  }
  if (DRY_RUN) console.log('\n(dry run — no writes performed)');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
