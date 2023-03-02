import { Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import logger from '../logger';
import { rest } from '../utils/discord';

export async function handler() {
  const commands = [];
  const devCommands = [];
  // Grab all the command files from the commands directory you created earlier
  const commandsPath = path.join(__dirname, '../commands');
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter(file => file.endsWith('.js') || file.endsWith('.ts'));

  // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
  for (const file of commandFiles) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { command, isDev } = require(`../commands/${file}`);
    if (isDev) {
      devCommands.push(command.toJSON());
    } else {
      commands.push(command.toJSON());
    }
  }

  logger.debug('Commands', JSON.stringify(commands, null, 2));

  try {
    logger.info(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    // The put method is used to fully refresh all global commands with the current set
    await rest
      .put(Routes.applicationCommands(process.env.BOT_CLIENT_ID!), {
        body: commands
      })
      .then(response => {
        logger.info(
          `Successfully reloaded ${
            (response as Array<unknown>).length
          } application (/) commands.`
        );
      });

    if (process.env.GUILD_ID) {
      logger.info(`Started refreshing ${commands.length} guild (/) commands.`);

      // The put method is used to fully refresh all commands in the guild with the current set
      await rest
        .put(
          Routes.applicationGuildCommands(
            process.env.BOT_CLIENT_ID!,
            process.env.GUILD_ID!
          ),
          { body: devCommands }
        )
        .then(response => {
          logger.info(
            `Successfully reloaded ${
              (response as Array<unknown>).length
            } guild (/) commands.`
          );
        });
    }
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    logger.error(error);
  }
}
