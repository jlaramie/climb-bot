import {
  REST,
  Routes,
  type RESTGetAPICurrentUserGuildsResult
} from 'discord.js';

// Construct and prepare an instance of the REST module
export const rest = new REST({ version: '10' }).setToken(
  process.env.BOT_TOKEN!
);

export async function getAllGuilds() {
  const guilds: RESTGetAPICurrentUserGuildsResult = [];

  let lastGuildId: string | undefined;
  do {
    const query = new URLSearchParams({ limit: '200' });
    if (lastGuildId) {
      query.append('after', lastGuildId);
    }

    const pagedGuilds = (await rest.get(Routes.userGuilds(), {
      query
    })) as RESTGetAPICurrentUserGuildsResult;

    guilds.push(...pagedGuilds);

    lastGuildId =
      pagedGuilds.length === 200
        ? pagedGuilds[pagedGuilds.length - 1].id
        : undefined;
  } while (lastGuildId);

  return guilds;
}
