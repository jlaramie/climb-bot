#!/usr/bin/env node
import commandLineArgs from 'command-line-args';
import logger from '../logger';
import { omit } from 'lodash';
import { readdir } from 'fs/promises';
import { extname, basename, resolve } from 'path';

import dotenv from 'dotenv';

dotenv.config();

const optionDefinitions = [{ name: 'file', alias: 'f', type: String }];

(async () => {
  const startDate = new Date();
  const options = commandLineArgs(optionDefinitions, {
    partial: true
  });

  if (!options.file) {
    const files = await readdir(resolve(__dirname, '../scripts')).then(files =>
      files.filter(file => ['.js', '.ts'].indexOf(extname(file)) !== -1)
    );

    console.log(
      `Available Scripts: ${files
        .map(file => `"${basename(file, extname(file))}"`)
        .join(',')}`
    );
    return;
  }

  const scriptName = basename(options.file);
  logger.info(`Script Start: "${scriptName}"`, omit(options, 'file'));

  try {
    if (!options.file) {
      console.log('options --file is required');
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { handler } = require(`../scripts/${scriptName}`);
    await handler(options);
  } catch (e) {
    logger.error(
      `Error running "${options.file}": ${
        e instanceof Error ? e.toString() : ''
      }`,
      e
    );
    process.exit(-1);
  }

  const endDate = new Date();
  logger.info(`Script End: "${scriptName}"`, {
    duration: Number(endDate) - Number(startDate)
  });
})().catch(e => {
  logger.error(`Unknown Error: ${e.toString()}`, e);
  process.exit(-1);
});
