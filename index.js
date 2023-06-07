require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// DISCORD SECTION
const channelID = '689184159880839329'; // ID du channel 'privé' sur le serveur discord Black Pearl

// TWITCH SECTION
let profileImg = '';
let liveStatus = false;
// function to get profile image of te twitch channel
async function getProfileImage() {
    try {
        const twitchResponse = await axios.get(
            "https://api.twitch.tv/helix/users",
            {
                params : {
                    login: process.env.TWITCH_CHANNEL,
                },
                headers: {
                    Authorization: `Bearer ${await getTwitchAccessToken()}`,
                    'Client-ID': process.env.TWITCH_CLIENT_ID,
                },
            }
        );

        const { data } = twitchResponse.data;
        profileImg = data[0].profile_image_url;

        return profileImg;
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'image de profil :', error);
    }
}


// function to check if the channel is live
async function checkLiveStatus() {
        try {
            // La requete ne marche que si la chaine est en live, sinon pas de data
            const twitchResponse = await axios.get(
            "https://api.twitch.tv/helix/streams",
                {
                    params : {
                        user_login: process.env.TWITCH_CHANNEL,
                    },
                    headers: {
                        Authorization: `Bearer ${await getTwitchAccessToken()}`,
                        'Client-ID': process.env.TWITCH_CLIENT_ID,
                    },
                }
            );

            const { data } = twitchResponse.data;
            // console.log('data:', data);

            if (data.length === 0) {
                if(liveStatus) {
                    console.log('La chaîne n\'est pas en direct pour le moment.')
                    liveStatus = false;
                }
            } else {
                if(!liveStatus) {
                    const announcementChannel = client.channels.cache.get(channelID);
                    if(announcementChannel) {
                        const streamURL = `https://www.twitch.tv/${process.env.TWITCH_CHANNEL}`;
                        const viewerToString = (data[0].viewer_count).toString();
                        const screenImg = data[0].thumbnail_url.replace('{width}', '1920').replace('{height}', '1080');

                        const embed = new EmbedBuilder()
                            .setColor('#772ce8')
                            .setTitle(data[0].title)
                            .setURL(streamURL)
                            .setAuthor({ name: `${data[0].user_name} est en live !`, iconURL: profileImg ? profileImg : null, url: streamURL })
                            .addFields(
                                { name: 'Catégorie', value: data[0].game_name, inline: true },
                                { name: 'Spectacteurs', value: viewerToString, inline: true },
                            )
                            .setImage(screenImg)
                            .setTimestamp()
                            .setFooter({ text: 'StreamBot • Powered by Black Pearl' });

                        announcementChannel.send({ embeds: [embed], content: 'Le stream est lancé, on vous y attend !\n\n@everyone' });
                        liveStatus = true;
                    } else {
                        console.error(`Le channel avec l'ID ${channelID} est introuvable.`);
                    }
                }
            }
        } catch (error) {
            console.error('Erreur lors de la vérification de l\'état de la chaîne Twitch :', error);
        }

        setTimeout(checkLiveStatus, 30000); // we call the function every 30 seconds
};

async function getTwitchAccessToken() {
    const twitchAuthResponse = await axios.post(
        `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`
    );

    return twitchAuthResponse.data.access_token;
}

// BOT SECTION
client.on('ready', () => {
    console.log(`Connecté en tant que ${client.user.tag}`);
    getProfileImage();
    checkLiveStatus();
});

client.login(process.env.DISCORD_TOKEN);