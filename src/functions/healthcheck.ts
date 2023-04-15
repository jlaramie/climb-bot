import { getAllGuilds } from '../utils/discord';

export async function handler() {
  const guilds = await getAllGuilds();

  return {
    body: JSON.stringify({
      numGuilds: guilds.length
    }),
    statusCode: 200
  };
}
