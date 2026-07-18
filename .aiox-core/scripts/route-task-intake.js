#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { routeTaskIntake } = require('../core/orchestration/task-intake-router');

function readStdin() {
  if (process.stdin.isTTY) return '';
  return fs.readFileSync(0, 'utf8').trim();
}

function parseInput() {
  const stdin = readStdin();
  if (stdin) {
    try {
      return JSON.parse(stdin);
    } catch (error) {
      throw new Error(`Invalid JSON received on stdin: ${error.message}`);
    }
  }

  const description = process.argv.slice(2).join(' ').trim();
  if (!description) {
    throw new Error('Provide task JSON on stdin or a task description as arguments.');
  }

  return { description };
}

try {
  const input = parseInput();
  const result = routeTaskIntake(input);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`Task intake routing failed: ${error.message}\n`);
  process.exitCode = 1;
}
