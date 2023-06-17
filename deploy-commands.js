require('dotenv').config();
const { REST, Routes } = require('discord.js');

const commands = [
    {
        name: 'channel',
        description: 'Replies with your channel link !'
    },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Registering slash commands...');

        await rest.put(
            Routes.applicationGuildCommands(
                process.env.CLIENT_ID, 
                process.env.GUILD_ID,
            ),
            { body: commands },
        );

        console.log('Successfully registered slash commands!');
    } catch (error) {
        console.log('Error while deploying slash commands: ', error);
    }
})();