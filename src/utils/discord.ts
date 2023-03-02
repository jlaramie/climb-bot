import { REST } from 'discord.js';

// Construct and prepare an instance of the REST module
export const rest = new REST({ version: '10' }).setToken(
  process.env.BOT_TOKEN!
);
