#!/usr/bin/env node
import { runCampusCli } from '../src/cli.mjs';
const result = await runCampusCli();
process.exitCode = result.exitCode;
