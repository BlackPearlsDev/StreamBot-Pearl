require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const { TWITCH_CHANNEL } = require('./config/channel.config.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

console.log('Nombre de chaînes Twitch:', TWITCH_CHANNEL.length);

// DISCORD SECTION
const channelID = ''; // ID of the channel where the bot will send the announcement

// TWITCH SECTION
let profileImg = [];
let liveStatus = new Array(TWITCH_CHANNEL.length).fill(false);

// Function to check if the channel is live
async function checkLiveStatus() {
    if(TWITCH_CHANNEL.length > 0) {
        try {
            const profileImages = [];
            const channelData = [];

            for(let i = 0; i < TWITCH_CHANNEL.length; i++) {
                // Request to get the user profile image
                const twitchUserResponse = await axios.get(
                    "https://api.twitch.tv/helix/users",
                    {
                        params : {
                            login: TWITCH_CHANNEL[i],
                        },
                        headers: {
                            Authorization: `Bearer ${await getTwitchAccessToken()}`,
                            'Client-ID': process.env.TWITCH_CLIENT_ID,
                        },
                    }
                );

                profileImg = twitchUserResponse.data.data[0].profile_image_url;
                profileImages.push(profileImg);

                // Request to get the channel data, if the channel isn't live, no data will be returned
                const twitchChannelResponse = await axios.get(
                "https://api.twitch.tv/helix/streams",
                    {
                        params : {
                            user_login: TWITCH_CHANNEL[i],
                        },
                        headers: {
                            Authorization: `Bearer ${await getTwitchAccessToken()}`,
                            'Client-ID': process.env.TWITCH_CLIENT_ID,
                        },
                    }
                );

                const { data } = twitchChannelResponse.data;
                channelData.push(data);

                if (data.length === 0) {
                    if(liveStatus[i]) {
                        console.log('La chaîne n\'est pas en direct pour le moment.')
                        liveStatus[i] = false;
                    }
                } else {
                    if(!liveStatus[i]) {
                        const announcementChannel = client.channels.cache.get(channelID);
                        if(announcementChannel) {
                            const streamURL = `https://www.twitch.tv/${TWITCH_CHANNEL[i]}`;
                            const viewerToString = data[0].viewer_count.toString();
                            const screenImg = data[0].thumbnail_url.replace('{width}', '1920').replace('{height}', '1080');

                            const embed = new EmbedBuilder()
                                .setColor('#772ce8')
                                .setTitle(data[0].title)
                                .setURL(streamURL)
                                .setAuthor({ name: `${data[0].user_name} est en live !`, iconURL: profileImages[i] ? profileImages[i] : null, url: streamURL })
                                .addFields(
                                    { name: 'Catégorie', value: data[0].game_name, inline: true },
                                    { name: 'Spectacteurs', value: viewerToString, inline: true },
                                )
                                .setImage(screenImg)
                                .setTimestamp()
                                .setFooter({ text: `StreamBot • Powered by Black Pearl` });

                            announcementChannel.send({ embeds: [embed], content: 'Le stream est lancé, on vous y attend !\n\n@everyone' });
                            liveStatus[i] = true;
                            console.log('liveStatus AFTER LAUNCH:', liveStatus);
                            console.log(`Annonce envoyée pour le stream ${data[0].user_name}!`);
                        } else {
                            console.error(`Le channel avec l'ID ${channelID} est introuvable.`);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Erreur lors de la vérification de l\'état de la chaîne Twitch :', error);
        }

        setTimeout(checkLiveStatus, 30000); // We call the function every 30 seconds to check if the channel is live
    } else {
        console.log('Aucune chaîne Twitch à vérifier, ajoutez là dans la config.');
    }
};

async function getTwitchAccessToken() {
    const twitchAuthResponse = await axios.post(
        `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`
    );

    return twitchAuthResponse.data.access_token;
}

// // BOT SECTION
client.on('ready', () => {
    console.log(`Connecté en tant que ${client.user.tag}`);
    checkLiveStatus();
});

client.login(process.env.DISCORD_TOKEN);